/*
 * SysCL Runtime Interface And Messaging Support
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 *
 * Wrapping objects (generating message gateways)
 * Sending and receiving messages
 * Defining interfaces and dispatching handlers in response to messages
 */
import { NANOS, isIndex } from 'syscl/nanos.esm.js';
import { SieveCache } from 'syscl/sieve_cache.esm.js';
import { unifiedList } from 'syscl/unified_list.esm.js';
export { NANOS, isIndex, unifiedList };
import 'syscl/shim.esm.js';

// Foundational-class installers
import { installCoreExtensions } from 'syscl/scl_core_extensions.esm.js';

// Flow exception, e.g. @d(return value) throws SCLFlow('return', value)
export class SCLFlow extends Error {
    constructor (message, info) {
	super(message);
	if (info !== undefined) this.info = info;
    }

    get name () { return 'SCLFlow'; }
}

// listFromPairs is the runtime shortcut ls([]) (NANOS generator)
export const listFromPairs = pa => new NANOS().fromPairs(pa);

// Types to show in place of values during dispatch/stack traces
export function loggedType (v) {
    if (v?.sclType) return 'S.' + v.sclType;
    const jt = typeof v;
    switch (jt) {
    case 'boolean': return (v ? '@t' : '@f');
    case 'undefined': return '@u';
    case 'object':
	if (v === null) return '@n';
	return 'J.' + (v?.constructor?.name || 'Object');
    default: return 'J.' + jt;
    }
}

// namespaceAt is the runtime shortcut na(...) (NANOS .at)
export function namespaceAt  (namespace, key, opt) {
    if (namespace?.has && namespace.has(key)) return namespace.at(key);
    if (!opt) throw new ReferenceError(`Required key "${key}" not found`);
}

// Get the return value if @code, or the raw value otherwise
export const runIfCode = v => v?.sclType === '@code' ? v('run') : v;

// Return a message sender's source file/line/column
export function senderFLC () {
    const stack = (new Error().stack || '').split('\n');
    // Discard stack frames through the object's sclR$ receiver (public i/f fn)
    while (stack.length) if (/sclR\$/.test(stack.shift())) break;
    // Also discard sender's sclS$ frames for attributed messages
    while (/sclS\$/.test(stack[0])) stack.shift();
    const srFrame = stack[0] || '';
    const match = srFrame.match(/[@(](.*):(\d+):(\d+)/) ||
	srFrame.match(/(?:^|\s+)at\s+(.*):(\d+):(\d+)$/);
    if (match) return { file: match[1], line: parseInt(match[2]), column: parseInt(match[3]) };
}

// Set a read-only object property or properties
// setRO(obj, key, value, enumerable = true)
// setRO(obj, { map }, enumerable = true)
const sROProp = { writable: false, configurable: false };
export const setRO = (o, ...a) => {
    if (typeof a[0] === 'object') {
	const [map, enumerable = true] = a;
	sROProp.enumerable = enumerable;
	for (const k of Object.keys(map)) {
	    sROProp.value = map[k];
	    Object.defineProperty(o, k, sROProp);
	}
    } else {
	const [key, value, enumerable = true] = a;
	[ sROProp.value, sROProp.enumerable ] = [ value, enumerable ];
	Object.defineProperty(o, key, sROProp);
    }
    return o;
};

const hasOwn = Object.hasOwn;

//////////////////////////////////////////////////////////////////////
// START Of Code/Interface/Messaging Protected Zone
//////////////////////////////////////////////////////////////////////
export const {
    debugConfig,
    initialize,
    logInterfaces,
    getInstance,
    getInterface,
    moduleScope,
    typeAccepts,
    typeChains,
} = (() => {
    let codeBaton, mesgBaton, nextAnon = 0, nextUCID = 0, initPhase = 2, dispNo = 0;
    const getCode = Symbol('getCode'), initSym = Symbol('@init');
    const interfaces = Object.create(null), firstInit = [];
    const dbgCfg = Object.setPrototypeOf({
	dispatch: false, dispatchSource: false, dispatchTypes: false,
	stack: 0, stackSource: false, stackTypes: false,
    }, null), stack = [], hdr = '-- SysCL Dispatch Stack --';
    const handlerCache = new SieveCache(1024);

    // Add some or all of our SysCL stack trace to the JS one
    function appendStackTrace (e) {
	if (!stack.length || !e.stack?.includes || e.stack.includes(hdr)) return;
	const frames = [], stop = dbgCfg.stack;
	let down = stack.length;
	for (let up = 0; --down >= 0; ) {
	    const curFrm = stack[down], disp = curFrm.disp;
	    const dispOp = (typeof disp.op === 'symbol') ? 'J.Symbol' : disp.op;
	    frames.push(`${disp.st} => ${disp.rt}(${dispOp}${fmtDispParams(dbgCfg.stackTypes, disp.mp)})${fmtDispSrc(dbgCfg.stackSource,curFrm)}`);
	    if (++up === stop) break;
	}
	if (down >= 0) frames.push('[...]');	// Config stopped us early
	e.stack += '\n' + hdr + '\n' + frames.join('\n');
    }

    // Bind a code template to a dispatch object and save it
    function bindCode (tpl, disp) {
	if (tpl.ucid === undefined) setRO(tpl, 'ucid', nextUCID++);
	return ((disp._bc ||= [])[tpl.ucid] ||= newSCLCode(tpl.cd, disp));
    }

    /*
     * Return canonical message properties
     * sr, st, rr, rt, op, mp, hasElse, elseExpr
     *
     * - Checks (and clears) the message baton
     * - Processes (NANOS or plain JS object) list-op messages
     */
    function canMesgProps (ctx, checkBaton = true) {
	let sr, st, { rr, rt, op, mp } = ctx, hasElse = false, elseExpr;
	if (checkBaton) {
	    const mb = mesgBaton;
	    mesgBaton = undefined;
	    if (op === undefined && mb?.rr === rr) ({ sr, st, op, mp } = mb);
	}
	if (op instanceof NANOS) op = op.storage;
	if (typeof op === 'object') {	// List-op message
	    const hp = prop => hasOwn(op, prop);
	    if (hp('else')) [ hasElse, elseExpr ] = [ true, op.else ];
	    if (hp('params')) mp = op.params;
	    if (hp('op')) op = op.op;
	    else if (hp('0')) op = op[0];
	    else throw new SyntaxError('Missing operation in SysCL list-op message');
	}
	mp = unifiedList(mp, true);	// Use unified mp interface
	return { sr, st, rr, rt, op, mp, hasElse, elseExpr };
    }

    // Core version of getInstance (works with public interfaces)
    function coreGetInstance (type, ...mp) {
	if (initPhase === 2) initialize();
	const ix = interfaces[type];
	if (ix && !ix.private) return getInstance(type, ...mp);
    }

    // Optionally set, and then return, debugging configuration
    function debugConfig (set) {
	set = unifiedList(set);
	for (const k of Object.keys(dbgCfg)) {
	    const type = typeof dbgCfg[k];
	    switch (type) {
	    case 'boolean':
		if (set.has(k)) dbgCfg[k] = !!set.at(k);
		break;
	    case 'number':
	    {
		const v = set.at(k);
		// deno-lint-ignore valid-typeof
		if (typeof v === type) dbgCfg[k] = v;
		break;
	    }
	    }
	}
	return new NANOS(dbgCfg);
    }

    // Shared JS getters & methods for @dispatch interface functions
    const dispProto = Object.setPrototypeOf({
	// Return code bound to this dispatch
	b (tpl) { return bindCode(tpl, this); },
	get js () { return this.octx.js; },
	// JIT persistent storage NANOS
	get p () { return this.octx.ps ??= new NANOS(); },
	get sclType () { return '@dispatch'; },
	// JIT transient (scratch) storage NANOS
	get t () { return this._ts ??= new NANOS(); },
    }, Object.getPrototypeOf(Function));

    // Dispatch a handler, passing it a fresh @dispatch object
    function dispatchHandler (mctx, dhctx) {
	const { sr, st, rr, rt } = mctx; // message context
	const { octx, op, mp, handler, sm } = dhctx; // dH context

	/*
	 * As part of the messaging pathway, dispatch objects have custom
	 * receiver functions.
	 */
	const bfnThis = {}, disp = bfnThis.bfn = Object.setPrototypeOf(sclR$Dispatch.bind(bfnThis, mctx, dhctx), dispProto);
	disp.dop = op;
	disp.ht = handler.type;
	disp.mop = mctx.op;
	disp.mp = mp;
	disp.octx = octx;
	disp.rr = rr;
	disp.rt = rt;
	disp.sm = sm;
	disp.sr = sr;
	disp.st = st;

	const trace = dbgCfg.stack, thisDisp = dbgCfg.dispatch && (dispNo++).toString(16);
	try {
	    if (dbgCfg.dispatch) {
		const dispOp = (typeof disp.op === 'symbol') ? 'J.Symbol' : disp.op;
		console.log(`[SysCL dispatch ${thisDisp}] ${st} => ${rt}${handler.type === rt ? '' : ('/' + handler.type)}(${dispOp}${fmtDispParams(dbgCfg.dispatchTypes, disp.mp)})${fmtDispSrc(dbgCfg.dispatchSource)}`);
	    }
	    if (trace) stack.push({ disp, ...(dbgCfg.stackSource && senderFLC() || {}) });
	    const result = handler.code(disp);
	    if (thisDisp !== false) console.log(`[SysCL return ${thisDisp}]${fmtDispParams(dbgCfg.dispatchTypes, [ result ])}`);
	    return result;
	}
	catch (e) {
	    if (disp._capture && e instanceof SCLFlow) {
		disp._capture = false;
		if (thisDisp !== false) console.log(`[SysCL return ${thisDisp}]${fmtDispParams(dbgCfg.dispatchTypes, [ e.info ])}`);
		return e.info;
	    }
	    if (thisDisp !== false) console.log(`[SysCL exception ${thisDisp}]`, e);
	    if (trace && !(e instanceof SCLFlow)) appendStackTrace(e);
	    throw e;
	}
	finally {
	    if (trace) stack.pop();
	}
	// Not reached
    }

    // Handle an incoming message's first dispatch
    function dispatchMessage (mctx, dctx) {
	const cmp = canMesgProps(mctx), { st, rr, rt, op, mp, hasElse, elseExpr } = cmp;
	const { octx, handler = getHandler(rt, op) } = dctx;

	if (!handler) {
	    if (dbgCfg.dispatch) console.log(`[SysCl dispatch] ${st} => ${rt}(${op}) [NO HANDLER]${fmtDispSrc(dbgCfg.dispatchSource)}`);
	    if (hasElse) return runIfCode(elseExpr);
	    throw new TypeError(`No SysCL handler found for "${rt}(${op})"`);
	}

	// Send-message function (shared across all dispatches)
	const sm = sclS$SendMessage.bind({ sr: rr, st: rt });

	// Dispatch the initial handler and return its result
	return dispatchHandler(cmp, { octx, op, mp, handler, sm });
    }
    firstInit.push(() => {
	getInterface('@dispatch').set({ pristine: true, private: true, lock: true });
	stub('@dispatch', 'ht', 'js', 'op', 'redis', 'return', 'rr', 'rt', 'sr', 'st');
    });

    // Return flattened chain set by interface type
    function flatChain (type) {
	const ix = interfaces[type];
	if (!ix) return new Set();
	let fc = ix.flatChain;
	if (!fc) {
	    fc = new Set([type]);
	    for (const nxt of ix.chain) if (!fc.has(nxt)) fc = fc.union(flatChain(nxt));
	    ix.flatChain = fc;
	}
	return fc;
    }

    // Format dispatch message parameter types
    function fmtDispParams (inc, list) {
	if (!inc) return '';
	return [...unifiedList(list).entries()].map(en => (isIndex(en[0]) ? ` ${loggedType(en[1])}` : ` ${en[0]}=${loggedType(en[1])}`)).join('');
    }

    // Format a dispatched message source file / line / column
    function fmtDispSrc (inc, flc) {
	if (inc) {
	    if (!flc) flc = senderFLC();
	    if (flc?.line !== undefined) return ` at ${flc.file}:${flc.line}:${flc.column}`;
	}
	return '';
    }

    /*
     * Try to locate a specific or default handler for a type and operation.
     * Returns {code, type, op}.
     */
    function getHandler (type0, op, next = false) {
	const noopHandler = { code: () => {}, type: type0, op };
	// Ignore (no-op) @init outside of getInstance
	if (op === '@init') return noopHandler;
	if (op === initSym) op = '@init';
	const cacheKey = typeof type0 === 'string' && typeof op === 'string' && `${type0}(${op})`, hit = cacheKey && handlerCache.get(cacheKey);
	if (hit) return hit;

	const handler = getHandler2(type0, op, next, noopHandler);
	const cacheable =
	    ((!cacheKey || !handler || !interfaces[handler.type].locked) ? false :
	    ((handler.code.cache !== undefined) ? handler.code.cache :
	    (handler.op !== op || handler.type !== type0)));
	if (cacheable) handlerCache.set(cacheKey, handler, handler.code.cache === 'pin' && handler.type === type0);
	return handler;
    }
    function getHandler2 (type0, op, next, noopHandler) {
	let defHandler;
	for (const type of flatChain(type0)) {
	    if (next && type === type0) continue;
	    const code = interfaces[type]?.handlers[op];
	    if (code) return { code, type, op };
	    if (!defHandler) {
		const op = 'defaultHandler', code = interfaces[type]?.handlers[op];
		if (code) defHandler = { code, type, op };
	    }
	}
	// Use no-op as the special default for @init
	if (op === '@init') return noopHandler;
	return defHandler;
    }

    /*
     * Return a new object instance of the specified type.
     * The JS initializer is called if one is configured in the interface.
     */
    function getInstance (type, ...params) {
	const ix = interfaces[type];
	if (!ix) throw new TypeError(`Cannot get instance for unknown SysCL interface "${type}"`);
	if (ix.instance) return ix.instance;
	const octx = Object.create(null), pi = function sclR$Object (op, mp) { return dispatchMessage({ rr: pi, rt: type, op, mp }, { octx }); };
	setRO(pi, 'sclType', type);
	if (ix.singleton) ix.instance = pi;
	ix.refd = true;
	pi(initSym, unifiedList(params));
	return pi;
    }

    /*
     * Return a SCL interface management object.
     * As part of the foundation for the object messaging system, it uses
     * a custom message receiver function.
     */
    function getInterface (name) {
	if (initPhase === 2) initialize();
	if (name === '?') name = '?' + nextAnon++;
	else if (typeof name !== 'string' || !name || (name[0] === '?' && !interfaces[name]) || (name[0] === '@' && initPhase !== 1)) return;
	const ix = interfaces[name], isFirst = !ix;
	if (isFirst) interfaces[name] = {
	    handlers: Object.create(null), chain: new Set([]), refd: false,
	    abstract: false, final: false, locked: false,
	    once: false, pristine: true, singleton: false
	};
	if (ix?.once) return;
	const bfnThis = { name, isFirst }, bfn = bfnThis.bfn = sclR$Interface.bind(bfnThis);
	return setRO(bfn, {
	    ifName: name,
	    set: mp => setInterface(name, mp, isFirst),
	    instance: mp => getInstance(name, mp),
	    sclType: '@interface',
	});
    }
    firstInit.push(() => {
	getInterface('@interface').set({ pristine: true, private: true, lock: true });
	stub('@interface', 'instance', 'name', 'set');
    });

    // Initialize the runtime environment (e.g. load core, core extensions)
    function initialize () {
	if (initPhase === 2) {		// Only initialize once
	    initPhase = 1;
	    firstInit.forEach(cb => cb());
	    installCoreExtensions();
	    initPhase = 0;
	}
    }

    function logInterfaces () { console.log(interfaces); }

    // Return a module dispatch object
    function moduleScope () {
	if (initPhase) initialize();
	const m = function sclR$Module () {}, d = function sclR$Dispatch (op) {
	    ({ op } = canMesgProps({ rr: d, op }));
	    switch (op) {
	    case 'op': return 'load';
	    case 'rr': case 'sr': return m;
	    case 'rt': case 'st': return '@module';
	    // Quietly ignore other messages
	    }
	};
	let per, tra;	// JIT persistent, transient storage
	const b = tpl => bindCode(tpl, d), sm = sclS$SendMessage.bind({ sr: m, st: '@module' }), getPer = () => (per ??= new NANOS()), getTra = () => (tra ??= new NANOS());
	setRO(m, 'sclType', '@module');
	Object.defineProperties(m, {
	    p: { get: getPer, enumerable: true },
	    t: { get: getTra, enumerable: true },
	});
	setRO(d, {
	    sr: m, st: '@module', rr: m, rt: '@module', sclType: '@dispatch',
	    octx: $u, op: 'load', mp: $u, b, sm,
	});
	Object.defineProperties(d, {
	    p: { get: getPer, enumerable: true },
	    t: { get: getTra, enumerable: true },
	});
	return { d, m,
	    ls: listFromPairs,
	    na: namespaceAt,
	};
    }
    firstInit.push(() => {
	getInterface('@module').set({ pristine: true, private: true, lock: true });
    });

    // Return a new SCL @code object given code and a dispatch
    function newSCLCode (cd, od) {
	// Encapsulate the code with a custom receiver function (public i/f)
	const bfnThis = { cd, od }, bfn = bfnThis.bfn = sclR$Code.bind(bfnThis);
	return setRO(bfn, 'sclType', '@code');
    }

    // Return a new SCL @function object given code and state
    function newSCLFunction (cd, ps) {
	const type = '@function', octx = {}, bfnThis = { octx, handler: { code: cd, type, op: 'call' } };
	if (ps !== undefined) setRO(octx, 'ps', ps);
	const bfn = bfnThis.bfn = sclR$Function.bind(bfnThis);
	bfnThis.sm = sclS$SendMessage.bind({ sr: bfn, st: type });
	return setRO(bfn, 'sclType', type);
    }
    firstInit.push(() => {
	getInterface('@code').set({ pristine: true, private: true, lock: true,
	    handlers: {
		run: false, fn: false,
	    },
	});
	getInterface('@function').set({ pristine: true, private: true, lock: true,
	    handlers: {
		call: d => d.octx.cd(d), fn: false,
	    },
	});
	getInterface('@handler').set({ pristine: true, private: true, lock: true });
    });

    // Prototype @code receiver
    function sclR$Code (op0, mp0) {
	const cmp = canMesgProps({ rr: this.bfn, op: op0, mp: mp0 }), { op, mp, hasElse, elseExpr } = cmp;
	// Fast-track (run) message
	if (op === 'run') return this.cd(this.od);
	switch (op) {	// Standard-mode ops
	case initSym: return;
	case getCode:
	    codeBaton = { code: this.cd }; // JS function for interface
	    return;
	case 'fn':			// Return new function code block
	    return newSCLFunction(this.cd, mp);
	}
	if (hasElse) return runIfCode(elseExpr);
	throw new TypeError(`No SysCL handler found for "@code(${op})"`);
    }

    // Prototype @dispatch receiver
    function sclR$Dispatch (cmp, dhctx) {
	const { op, mp, elseExpr } = canMesgProps({ rr: this.bfn });
	const { octx, handler, sm } = dhctx;
	switch (op) {
	case 'dop': return dhctx.op;	// Current dispatch requested op
	case 'ht': return handler.type;
	case 'js': return octx.js;	// JavaScript state
	case 'log':		// Log the entire dispatch to the console
	    console.dir(this.bfn, { depth: null });
	    return;
	case 'mop': return cmp.op;	// Original message requested op
	case 'redis':		// Redispatch
	{
	    // Accept either list-op or mp else parameter
	    const dispElse = mp.has('else') ? mp.at('else') : elseExpr;
	    // Optionally choose a specific type from the chain
	    const type = mp.at('type') || handler.type;
	    // The type must be in *current* handler's chain
	    if (!flatChain(handler.type).has(type)) return runIfCode(dispElse);
	    // Optionally change op and/or mp
	    const rdop = mp.has('op') ? mp.at('op') : handler.op, rdmp = mp.has('params') ? unifiedList(mp.at('params')) : mp, redis = getHandler(type, rdop, type === handler.type && rdop === handler.op);
	    // Don't allow switch to default if not changing op
	    if (!redis || (!mp.has('op') && redis.op !== rdop)) return runIfCode(dispElse);
	    // Looks good; fire the redispatch
	    return dispatchHandler(cmp, { octx, op: rdop, mp: rdmp, handler: redis, sm });
	}
	case 'return':
	    this.bfn._capture = true;
	    throw new SCLFlow('return', mp.at(0));
	    // Not reached
	case 'rr': return cmp.rr;
	case 'rt': return cmp.rt;
	case 'sr': return cmp.sr;
	case 'st': return cmp.st;
	}
	return runIfCode(elseExpr);
    }

    // Prototype @function receiver
    function jsFnCall (...mp) { return this.bfn('call', [...mp]); }
    function sclR$Function (op0, mp0) {
	const cmp = canMesgProps({ rr: this.bfn, op: op0, mp: mp0 }), { op, mp, hasElse, elseExpr } = cmp;
	// Fast-track (call) message
	if (op === 'call') return dispatchHandler(cmp, this);
	switch (op) {		// Function-mode ops
	case 'fn':			// Return a new function code block
	    return newSCLFunction(cd, mp);
	case 'jsfn':		// Return a JS wrapper-function
	    return (this.jsFn ||= jsFnCall.bind(this));
	}
	if (hasElse) return runIfCode(elseExpr);
	throw new TypeError(`No SysCL handler found for "${type}(${op})"`);
    }

    // Prototype @interface receiver
    function sclR$Interface (op0, mp0) {
	const name = this.name, { op, mp, hasElse, elseExpr } = canMesgProps({ rr: this.bfn, op: op0, mp: mp0 });
	switch (op) {
	case 'instance': return getInstance(name, mp);
	case 'name': return name;
	case 'set': return setInterface(name, mp, this.isFirst);
	}
	if (hasElse) return runIfCode(elseExpr);
	throw new TypeError(`No SysCL handler found for "@interface(${op})"`);
    };

    /*
     * Prototype private send-message function
     * Promote JS receiver objects to SysCL, if necessary, and deliver an
     * attributed message via the message baton.
     */
    function sclS$SendMessage (rr, op, mp) {
	if (!rr?.sclType) rr = jsToSCL(rr);
	mesgBaton = { sr: this.sr, st: this.st, rr, op, mp };
	let result;
	try { result = rr(); }
	finally { mesgBaton = undefined; }
	return result;
    }

    /*
     * Interface-object implementation to set/change a SCL object interface
     *
     * Parameters:
     * - abstract - The interface is incomplete and cannot be instantiated
     * - chain - Sets an ordered chain of super-class interfaces
     * - final - The interface is final and cannot be sub-classed
     * - handlers - Add message operation handlers
     * - lock - Locks the interface to any further changes
     * - once - Prevents returning the interface again and throws an
     *   exception if returned before
     * - pristine - Throw an exception if not the first configuration
     * - private - The interface is private (instances may only be generated
     *   via the interface object, not through the core)
     */
    function setInterface (name, mp, isFirst) {
	if (name[0] === '@' && initPhase !== 1) throw new TypeError(`Cannot configure SysCL interface "${name}" after runtime initialization`);
	const ix = interfaces[name];
	if (mp instanceof NANOS) mp = mp.storage;
	if ((mp.once && !isFirst) || (mp.pristine && !ix.pristine)) throw new TypeError(`SysCL interface "${name}" is not pristine`);
	ix.pristine = false;
	if (ix.locked) throw new TypeError(`Cannot change locked SysCL interface "${name}"`);

	// Set the interface chain. Refd guarantees an acyclic graph.
	if (mp.chain) {
	    if (ix.chain.size) throw new TypeError(`Cannot change chain for SysCL interface "${name}"`);
	    if (ix.refd) throw new TypeError(`Cannot set chain for active SysCL interface "${name}"`);
	    const chain = new Set(Object.values(mp.chain.storage || mp.chain || []));
	    for (const item of chain) {
		if (!interfaces[item]) throw new ReferenceError(`SysCL interface "${name}" references unknown interface "${item}"`);
		if (interfaces[item].final) throw new TypeError(`SysCL interface "${name}" tries to extend final interface "${item}"`);
		interfaces[item].refd = true;
	    }
	    ix.chain = chain;
	}

	/*
	 * Add message handlers. These can be either foundational JavaScript
	 * implementation functions or SysCL code blocks.
	 */
	const opHandlers = mp.handlers || {};
	for (const [ op, handler ] of (opHandlers instanceof NANOS) ? opHandlers.entries() : Object.entries(opHandlers)) {
	    if (typeof handler === 'function') {
		if (handler.sclType === '@code') {
		    codeBaton = undefined;
		    handler(getCode);
		    if (codeBaton?.code) setRO(ix.handlers[op] = codeBaton.code, 'sclType', '@handler');
		}
		else ix.handlers[op] = handler;
	    } else if (handler === false) ix.handlers[op] = false;
	}
	codeBaton = undefined;

	const cacheHints = mp.cacheHints || {};
	for (const [ op, hint ] of (cacheHints instanceof NANOS) ? cacheHints.entries() : Object.entries(cacheHints)) {
	    switch (hint) {
	    case true: case false: case 'pin':
		if (ix.handlers[op]) ix.handlers[op].cache = hint;
		break;
	    }
	}

	if (mp.init) ix.init = mp.init;	// JS instance-init function
	if (mp.abstract) ix.abstract = true;
	if (mp.final) ix.final = true;
	if (mp.lock) ix.locked = true;
	if (mp.once) ix.once = true;
	if (mp.singleton) ix.singleton = true;
    }

    function stub (type, ...names) {
	const h = interfaces[type]?.handlers;
	if (h) names.forEach(name => h[name] = false);
    }

    /*
     * Check whether an object type accepts a given message operation.
     * Returns ['specific', type] if there's a specific handler;
     * ['default', type] if there's a default handler but no
     * specific handler; or undefined. The type returned is the first
     * type from the chain that responds, which may be different than
     * the requested type.
     */
    function typeAccepts (type, op) {
	if (op === undefined) {
	    const ix = interfaces[type];
	    return ((ix && !ix.private) ? [...Object.keys(ix.handlers)] : undefined);
	}
	const handler = getHandler(type, op);
	if (handler) return [ handler.type, handler.op === 'defaultHandler' ? 'default': 'specific' ];
    }

    // Return whether the flat-chain for type 1 includes type 2.
    function typeChains (type1, type2) {
	if (interfaces[type1]?.private) return;
	if (type2 === undefined) return (interfaces[type1] ? Array.from(interfaces[type1].chain) : undefined);
	return flatChain(type1).has(type2);
    }

    return {
	debugConfig,
	initialize,
	logInterfaces,
	getInstance: coreGetInstance,
	getInterface,
	moduleScope,
	typeAccepts,
	typeChains,
    };
})();
//////////////////////////////////////////////////////////////////////
// END Of Code/Interface/Messaging Protected Zone
//////////////////////////////////////////////////////////////////////

export const $f = false, $n = null, $t = true, $u = undefined;

// Promote a JS object to a SCL object for messaging
const sclInstance = Symbol.for('sclInstance');
const setJTSInstance = (type, jsv) => {
    const inst = getInstance(type, jsv);
    setRO(jsv, sclInstance, inst, false);
    return inst;
};
export function jsToSCL (jsv) {
    if (jsv?.sclType) return jsv;
    switch (typeof jsv) {
    case 'boolean':
	return getInstance(jsv ? '@true' : '@false');
    case 'bigint':
    case 'number':
	return getInstance('@number', jsv);
    case 'object':
	if (jsv === null) return getInstance('@null');
	if (jsv[sclInstance]) return jsv[sclInstance];
	if (jsv instanceof NANOS) return setJTSInstance('@list', jsv);
	if (Array.isArray(jsv)) return setJTSInstance('@jsArray', jsv);
	return getInstance('@undefined');
    case 'string':
	return getInstance('@string', jsv);
    default:
	return getInstance('@undefined');
    }
}

// Send a message anonymously (promoting JS receiver objects as necessary)
export function sendAnonymousMessage (rr, op, mp) {
    if (!rr?.sclType) rr = jsToSCL(rr);
    return rr(op, mp);
}

/*
vim:syntax=javascript:sw=4
*/
