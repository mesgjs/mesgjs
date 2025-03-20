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
export { NANOS, isIndex };
import { unifiedList } from 'syscl/unified_list.esm.js';
import 'syscl/shim.esm.js';

// Foundational-class installers
import { installBoolean } from 'syscl/scl_boolean.esm.js';
import { installCore } from 'syscl/scl_core.esm.js';
import { installJSArray } from 'syscl/js_array.esm.js';
import { installList } from 'syscl/scl_list.esm.js';
import { installNull } from 'syscl/scl_null.esm.js';
import { installNumber } from 'syscl/scl_number.esm.js';
import { installString } from 'syscl/scl_string.esm.js';
import { installUndefined } from 'syscl/scl_undefined.esm.js';

// Main runtime initializers (after first init in protected zone)
const mainInit = [
    installCore,	// ** Core FIRST **
    installBoolean,
    installJSArray,
    installList,
    installNumber,
    installNull,
    installString,
    installUndefined,
];

export class SCLFlow extends Error {
    constructor (message, type, info) {
	super(message);
	this.name = 'SCLFlow';
	this.type = type;
	this.info = info;
    }
}

export const runIfCode = v => v?.sclType === '@code' ? v('run') : v;

// Set a read-only object property or properties
// setRO(obj, key, value, enumerable = true)
// setRO(obj, { map }, enumerable = true)
export const setRO = (o, ...a) => {
    if (typeof a[0] === 'object') {
	const [map, enumerable = true] = a;
	for (const k of Object.keys(map)) setRO(o, k, map[k], enumerable);
    } else {
	const [k, value, enumerable = true] = a;
	Object.defineProperty(o, k, {value, enumerable, writable: false, configurable: false});
    }
    return o;
};

const hasOwn = Object.hasOwn;

//////////////////////////////////////////////////////////////////////
// START Of Code/Interface/Messaging Protected Zone
//////////////////////////////////////////////////////////////////////
export const {
    initialize,
    logInterfaces,
    getInstance,
    getInterface,
    newSCLCode,
    typeAccepts,
} = (() => {
    let codeBaton, mesgBaton, nextAnon = 0, nextUCID = 0, initPhase = 2;
    const getCode = Symbol.for('getCode');
    const interfaces = Object.create(null), firstInit = [];

    /*
     * Return canonical message properties
     * sr, st, rr, rt, op, mp, hasElse, elseExpr
     *
     * - Checks (and clears) the message baton
     * - Processes (NANOS or plain JS object) list-op messages
     */
    function canMesgProps (ctx, checkBaton = true) {
	let sr, st, { rr, op, mp } = ctx, hasElse = false, elseExpr;
	if (checkBaton) {
	    const mb = mesgBaton;
	    mesgBaton = undefined;
	    if (op === undefined && mb.rr === rr) ({ sr, st, op, mp } = mb);
	}
	if (op instanceof NANOS) op = op.storage;
	if (typeof op === 'object') {	// List-op message
	    const hp = prop => Object.hasOwn(op, prop);
	    if (hp('else')) [ hasElse, elseExpr ] = [ true, op.else ];
	    if (hp('params')) mp = op.params;
	    if (hp('op')) op = op.op;
	    else if (hp('0')) op = op[0];
	    else throw new Error('Missing operation in SysCL list-op message');
	}
	mp = unifiedList(mp);		// Use unified mp interface
	return { sr, st, rr, op, mp, hasElse, elseExpr };
    }

    // Core version of getInstance (works with public interfaces)
    function coreGetInstance (type, mp) {
	if (initPhase === 2) initialize();
	const ix = interfaces[type];
	if (ix && !ix.private) return getInstance(type, mp);
    }

    /*
     * Create and dispatch one or more SCL Dispatch objects in response
     * to a message.
     */
    function dispatchMessage (ctx, d1) {
	const { sr, st, rr, rt, octx, op, mp } = ctx;
	const handler = getHandler(rt, op);

	if (!handler) {
	    if (Object.hasOwn(d1, 'else')) return runIfCode(d1.else);
	    throw new Error(`No SysCL handler found for "${rt}(${op})"`);
	}

	// Send-message function (shared across all dispatches)
	const sm = (obr, op, mp) => sendMessage({ sr: rr, st: rt, rr: obr, op, mp });

	function newSCLDispatch (op, mp, handler) {
	    let capture = false;
	    // Each dispatch has its own code bindings
	    const myCode = Object.create(null), bindCode = tpl => {
		if (tpl.ucid === undefined) setRO(tpl, 'ucid', nextUCID++);
		const ucid = tpl.ucid;
		if (!myCode[ucid]) myCode[ucid] = newSCLCode(tpl.cd, disp);
		return myCode[ucid];
	    };
	    // As part of the messaging pathway, dispatch objects are custom
	    const disp = function sclDispatch () {
		const { sr, op, mp, elseExpr } = canMesgProps({});
		// Only accept messages from the original receiver
		if (sr !== disp.rr || op === undefined) return;
		switch (op) {
		case 'redis':		// Redispatch
		{
		    // Accept either list-op or mp else parameter
		    const dispElse = (hasOwn(mp, 'else') ? mp.else : elseExpr);
		    if (mp instanceof NANOS) mp = mp.storage;
		    const type = mp.type || handler.type;
		    // The type must be in current handler's chain
		    if (!flatChain(handler.type).has(type)) return runIfCode(dispElse);
		    // Optionally change op and/or mp
		    const rop = hasOwn(mp, 'op') ? mp.op : handler.op, rmp = hasOwn('mp', 'params') ? mp.params : mp, redis = getHandler(type, rop, type === handler.type);
		    // Don't allow switch to default if not changing op
		    if (!redis || (!hasOwn(mp, 'op') && redis.op !== rop)) return runIfCode(dispElse);
		    // Looks good; fire the redispatch
		    return newSCLDispatch(rop, rmp, redis);
		}
		case 'handlerType': return handler.type;
		case 'op': return disp.op;
		case 'return':
		    capture = true;
		    throw new SCLFlow('Return', 'return', { value: mp?.at ? mp.at(0) : undefined });
		    // Not reached
		case 'self': return disp.rr;
		case 'selfType': return disp.rt;
		case 'sender': return disp.sr;
		case 'senderType': return disp.st;
		}
		return runIfCode(elseExpr);
	    };
	    Object.defineProperty(disp, 'ps', { get: () => octx?.ps, enumerable: true });
	    setRO(disp, { sr, st, rr, rt, octx, op, mp, sm,
		b: tpl => bindCode(tpl),
		sclType: '@dispatch',
	    });
	    if (handler.code.sclType === '@handler') {
		// Persistent storage per object; transient (scratch) per dispatch
		if (octx.ps === undefined) setRO(octx, 'ps', new NANOS());
		if (disp.ts === undefined) setRO(mesg, 'ts', new NANOS());
	    }
	    try { return handler.code(disp); }
	    catch (e) {
		if (capture && e instanceof SCLFlow) {
		    capture = false;
		    return e.info.value;
		}
		throw e;
	    }
	    // Not reached
	}

	// Fire the initial dispatch
	return newSCLDispatch(op, mp, handler);
    }
    firstInit.push(() => {
	getInterface('@dispatch').set({ pristine: true, private: true, lock: true });
	stub('@dispatch', 'handlerType', 'op', 'redis', 'return', 'self', 'selfType', 'sender', 'senderType');
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

    /*
     * Try to locate a specific or default handler for a type and operation.
     * Returns {code, type, op}.
     */
    function getHandler (type0, op, next = false) {
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
	return defHandler;
    }

    /*
     * Return a new object instance of the specified type.
     * The JS initializer is called if one is configured in the interface.
     */
    function getInstance (type, ...params) {
	const ix = interfaces[type];
	if (!ix) throw new Error(`Cannot get instance for unknown SysCL interface "${type}"`);
	if (ix.instance) return ix.instance;
	const octx = Object.create(null), pi = function sclObject (op, mp) { return receiveMessage({ octx, rr: pi, rt: type, op, mp }); };
	setRO(pi, 'sclType', type);
	if (ix.singleton) ix.instance = pi;
	ix.refd = true;
	if (ix.init) ix.init(octx, pi, ...params);
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
	const sif = function sclInterface (op, mp) {
	    ({ op, mp } = canMesgProps({ op, mp }));
	    switch (op) {
	    case 'instance': return getInstance(name, mp);
	    case 'name': return name;
	    case 'set': return setInterface(name, mp, isFirst);
	    }
	};
	return setRO(sif, {
	    forName: name,
	    set: mp => setInterface(name, mp, isFirst),
	    instance: mp => getInstance(name, mp),
	    sclType: '@interface',
	});
    }
    firstInit.push(() => {
	getInterface('@interface').set({ pristine: true, private: true, lock: true });
	stub('@interface', 'instance', 'name', 'set');
    });

    // Initialize the runtime environment (e.g. load foundations)
    function initialize () {
	if (initPhase === 2) {		// Only initialize once
	    initPhase = 1;
	    firstInit.forEach(cb => cb());
	    mainInit.forEach(cb => cb());
	    initPhase = 0;
	}
    }

    function logInterfaces () { console.log(interfaces); }

    /*
     * Return a new SCL code object.
     * These are very simple foundational objects supporting exactly
     * two operations:
     * 1) The getCode symbol passes the code via the code baton (for
     *    adding op handlers in addInterface)
     * 2) "run" runs the code in the context of the original message
     */
    function newSCLCode (cd, om) {
	// Encapsulate the code with a custom interface function
	const code = function sclCode (op) {
	    ({ op } = canMesgProps({ rr: code, op }));
	    switch (op) {
	    case getCode:
		codeBaton = { code: cd };
		break;
	    case 'run': return cd(om);
	    }
	};
	return setRO(code, 'sclType', '@code');
    }
    firstInit.push(() => {
	getInterface('@code').set({ pristine: true, private: true, lock: true });
	stub('@code', 'run');
	getInterface('@handler').set({ pristine: true, private: true, lock: true });
    });

    /*
     * Receive and dispatch a message (either an anonmyous message via
     * parameters to the interface function, or an attributed message via
     * the message baton.
     */
    function receiveMessage (ctx) {
	const { rr, rt, octx } = ctx, { sr, st, op, mp, hasElse, elseExpr } = canMesgProps(ctx);
	const d1 = hasElse ? { else: elseExpr } : {};
	return dispatchMessage({ sr, st, rr, rt, op, mp, octx }, d1);
    }

    /*
     * Promote JS receiver objects to SysCL, if necessary, and deliver an
     * attributed message via the message baton.
     */
    function sendMessage (ctx) {
	const { sr, st, op, mp } = ctx;
	const rr = ctx.rr?.sclType ? ctx.rr : jsToSCL(ctx.rr);
	mesgBaton = { sr, st, rr, op, mp };
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
	if (name[0] === '@' && initPhase !== 1) throw new Error(`Cannot configure SysCL interface "${name}" after runtime initialization`);
	const ix = interfaces[name];
	if (mp instanceof NANOS) mp = mp.storage;
	if ((mp.once && !isFirst) || (mp.pristine && !ix.pristine)) throw new Error(`SysCL interface "${name}" is not pristine`);
	ix.pristine = false;
	if (ix.locked) throw new Error(`Cannot change locked SysCL interface "${name}"`);

	// Set the interface chain. Refd guarantees an acyclic graph.
	if (mp.chain) {
	    if (ix.chain.size) throw new Error(`Cannot change chain for SysCL interface "${name}"`);
	    if (ix.refd) throw new Error(`Cannot set chain for active SysCL interface "${name}"`);
	    const chain = new Set(Object.values(mp.chain.storage || mp.chain || []));
	    for (const item of chain) {
		if (!interfaces[item]) throw new Error(`SysCL interface "${name}" references unknown interface "${item}"`);
		if (interfaces[item].final) throw new Error(`SysCL interface "${name}" tries to extend final interface "${item}"`);
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
		    handler(getGode);
		    if (codeBaton?.code) setRO(ix.handlers[op] = codeBaton.code, 'sclType', '@handler');
		}
		else ix.handlers[op] = handler;
	    }
	}
	codeBaton = undefined;

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
	const handler = getHandler(type, op);
	if (handler) return [ handler.type, handler.op === 'defaultHandler' ? 'default': 'specific' ];
    }

    return {
	initialize,
	logInterfaces,
	getInstance: coreGetInstance,
	getInterface,
	newSCLCode,
	typeAccepts,
    };
})();
//////////////////////////////////////////////////////////////////////
// END Of Code/Interface/Messaging Protected Zone
//////////////////////////////////////////////////////////////////////

export const $f = false, $n = null, $t = true, $u = undefined;

// Promote a JS object to a SCL object for messaging
const sclInstance = Symbol.for('sclInstance');
export function jsToSCL (jsv) {
    if (jsv?.sclType) return jsv;
    const setInstance = (type, jsv) => {
	const inst = getInstance(type, jsv);
	setRO(jsv, sclInstance, inst, false);
	return inst;
    };
    switch (typeof jsv) {
    case 'boolean':
	return getInstance(jsv ? '@true' : '@false');
    case 'bigint':
    case 'number':
	return getInstance('@number', jsv);
    case 'object':
	if (jsv === null) return getInstance('@null');
	if (jsv[sclInstance]) return jsv[sclInstance];
	if (jsv instanceof NANOS) return setInstance('@list', jsv);
	if (Array.isArray(jsv)) return setInstance('@jsArray', jsv);
	return getInstance('@undefined');
    case 'string':
	return getInstance('@string', jsv);
    default:
	return getInstance('@undefined');
    }
}

export const listFromPairs = pa => new NANOS().fromPairs(pa);
export const namespaceAt = (namespace, key) => namespace?.at ? namespace.at(key) : undefined;

export function moduleScope () {
    // Return a module dispatch object (that accepts no messages)
    const d = function sclModule () {};
    setRO(d, {
	sr: $u, st: $u, rr: d, rt: '@module', sclType: '@module',
	octx: $u, op: 'load', mp: $u, ps: $u, ts: $u,
	sm: sendAnonymousMessage,
    });
    return { d,
	ls: listFromPairs,
	na: namespaceAt,
    };
}

// Send a message anonymously (promoting JS receiver objects as necessary)
export function sendAnonymousMessage (rr, op, mp) {
    if (!rr?.sclType) rr = jsToSCL(rr);
    return rr(op, mp);
}

/*
vim:syntax=javascript:sw=4
*/
