/*
 * Mesgjs Runtime Interface And Messaging Support
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 *
 * Wrapping objects (generating message gateways)
 * Sending and receiving messages
 * Defining interfaces and dispatching handlers in response to messages
 */
import { calcDigest, getIntegritySHA512 } from './calc-digest.esm.js';
import { NANOS, isIndex, parseQJSON, parseSLID } from '@nanos';
import { SieveCache } from './sieve-cache.esm.js';
import { unifiedList } from './unified-list.esm.js';
import './shim.esm.js';

const gt = globalThis;

/*
 * Flow exception - NOT an error
 * E.g. @d(return value) throws MsjsFlow('return')
 */
export class MsjsFlow {
	constructor (message) {
		this.message = message;
	}
	get name () { return this.constructor.name; }
	toString () { return `${this.name}: ${this.message}`; }
}

/*
 * Flow ERROR, e.g. attempt to MsjsFlow when receiver isn't active
 */
export class MsjsFlowError extends RangeError {
	get name () { return this.constructor.name; }
};

/*
 * Helper to calculate expected source integrity
 */
export async function calcIntegrity (src) {
	return calcDigest(await fetchModule(src, { decode: false }), 'SHA-512');
}

/*
 * Load a Mesgjs module
 */
export async function fetchModule (src, { decode, integrity } = {}) {
	let data;
	if (typeof Deno !== 'undefined' && !src.startsWith('https://') && !src.startsWith('data:')) {
		data = await Deno.readFile(src);
		if (!data) throw new Error(`fetchModule: File "${src}" not found`);
	} else {
		data = await fetch(src).then((r) => {
			if (r.ok) {
				return r.arrayBuffer();
			}
			throw new Error(`fetchModule: File "${src}" not found`);
		});
	}
	if (integrity && await calcDigest(data, 'SHA-512') !== integrity) return new Error(`fetchModule: File "${src}" integrity verification failed`);
	return ((decode === false) ? data : new TextDecoder().decode(data));
}

/*
 * Helper listFromPairs is the runtime shortcut ls([]) (NANOS generator)
 */
export const listFromPairs = (pa) => new NANOS().fromPairs(pa);

/*
 * Helper to show types in place of values during dispatch/stack traces
 */
export function loggedType (v) {
	if (v?.msjsType) return 'M.' + v.msjsType;

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

/*
 * Helper namespaceAt is the runtime shortcut na(...) (NANOS .at)
 */
const NOT_FOUND = Symbol();
export function namespaceAt	 (namespace, key, opt) {
	if (key instanceof NANOS) { // List-style key
		const path = [...key.values()];
		const value = namespace.at(path, { default: NOT_FOUND });

		if (value !== NOT_FOUND) return value;
		if (key.has('else')) return key.at('else');
		if (opt) return;
		throw new ReferenceError(`Required key [${path.join(' ')}] not found`);
	}
	if (namespace?.has && namespace.has(key)) return namespace.at(key);
	if (!opt) throw new ReferenceError(`Required key "${key}" not found`);
}

// Get the return value if @code, or the raw value otherwise
export const runIfCode = (v) => (typeof v === 'function' && v.msjsType === '@code') ? v('run') : v;
// Run @code chains until reaching a non-@code value
export function runWhileCode (v) {
	while (typeof v === 'function' && v.msjsType === '@code') v = v('run');
	return v;
}

/*
 * Send an anonymous message (promoting JS receiver objects as necessary)
 */
export function sendAnonMessage (rr, op, mp) {
	if (typeof rr !== 'function' || !rr.msjsType) rr = gt.$toMsjs(rr);
	return rr(op, mp);
}

/*
 * Return a message sender's source file/line/column
 */
export function senderFLC () {
	const stack = (new Error().stack || '').split('\n');

	// Discard stack frames through the object's msjsR$ receiver (public i/f fn)
	while (stack.length) if (/msjsR\$/.test(stack.shift())) break;
	// Also discard sender's msjsS$ frames for attributed messages
	while (/msjsS\$/.test(stack[0])) stack.shift();

	const srFrame = stack[0] || '';
	const match = srFrame.match(/[@(](.*):(\d+):(\d+)/) ||
		srFrame.match(/(?:^|\s+)at\s+(.*):(\d+):(\d+)$/);

	if (match) return { file: match[1], line: parseInt(match[2]), column: parseInt(match[3]) };
}

/*
 * Set a read-only object property or properties
 * setRO(obj, key, value, enumerable = true)
 * setRO(obj, { map }, enumerable = true)
 */
const sROProp = { writable: false, configurable: false, enumerable: null, value: null };
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

/*
 * Helper to throw custom MsjsFlow exceptions (not @d(return))
 */
export function throwFlow (d, type, ifName) {
	const { js, mp } = d;

	if (!js.active) throw new MsjsFlowError(`(${type}) to inactive ${ifName}`);
	js.capture = true;
	if (mp.has('result')) {
		js.hasFlowRes = true;
		js.flowRes = mp.at('result');
	}
	throw new MsjsFlow(type);
}

const hasOwn = Object.hasOwn;

//////////////////////////////////////////////////////////////////////
// START Of Code/Interface/Messaging Protected Zone
//////////////////////////////////////////////////////////////////////
export const {
	debugConfig,
	fcheck,
	fready,
	fwait,
	getInstance,
	getInterface,
	getModMeta,
	initialize,
	loadModule,
	logInterfaces,
	modHasCap,
	moduleScope,
	setModMeta,
	typeAccepts,
	typeChains,
} = (() => {
	let codeBaton, mesgBaton, nextAnon = 0, nextUCID = 0, initPhase = 2, dispNo = 0;
	const getCode = Symbol('getCode'), initSym = Symbol('@init');
	const interfaces = Object.create(null), firstInit = [];
	const debugSettings = Object.assign(Object.create(null), {
		dispatch: false, dispatchSource: false, dispatchTypes: false,
		stack: 0, stackSource: false, stackTypes: false,
		handlerCache: false,
	}), stack = [], hdr = '-- Mesgjs Dispatch Stack --';
	const handlerCache = new SieveCache(1024);
	const dacHandThis = { rr: null, rt: '@core', sm: sendAnonMessage };
	const featurePromises = new Map(), allFeatures = new NANOS();
	const modMeta = new NANOS(), modMap = new Map(), modLoaded = new Set();
	const modMidToName = new Map();
	const exclusive = new Map(); // Exclusive (private persistent) storage by interface and object
	const noopDispatch = { value: undefined }, noopFunction = () => {};

	/*
	 * Add features from a string / array / list
	 */
	function addFeatures (featureList, modPath, modInfo) {
		if (typeof featureList === 'string') {
			featureList = featureList.split(/\s+/).filter(Boolean);
		}
		if (typeof featureList?.values !== 'function') return;
		for (const feature of featureList.values()) {
			if (!featurePromises.has(feature)) {
				const prom = getInstance('@promise');

				prom.catch(() => console.warn(`loadModule: Feature "${feature}" rejected`));
				featurePromises.set(feature, prom);
				allFeatures.push(feature);
				if (modPath && modInfo) allFeatures.set(feature, new NANOS({ [modInfo.at('deferLoad') ? 'defer' : 'preload']: modPath }));
			}
		}
	}

	/*
	 * Add some or all of our Mesgjs stack trace to the JS one
	 */
	function appendStackTrace (e) {
		if (!stack.length || !e.stack?.includes || e.stack.includes(hdr)) return;
		const frames = [], stop = debugSettings.stack;
		let down = stack.length;

		for (let up = 0; --down >= 0; ) {
			const curFrm = stack[down], disp = curFrm.disp;
			const dispOp = (typeof disp.op === 'symbol') ? 'J.Symbol' : disp.op;

			frames.push(`${disp.st} => ${disp.rt}(${dispOp}${fmtDispParams(debugSettings.stackTypes, disp.mp)})${fmtDispSrc(debugSettings.stackSource,curFrm)}`);
			if (++up === stop) break;
		}
		if (down >= 0) frames.push('[...]');	// Config stopped us early
		e.stack += '\n' + hdr + '\n' + frames.join('\n');
	}

	/**
	 * Bind a code template to a dispatch object and save it
	 * @param {function|object} disp - The dispatch this or receiver function
	 */
	function bindCode (tpl, disp) {
		let dispThis = disp; // Ready as-is if plain object

		if (typeof disp === 'function') { // Get dispThis from receiver function
			mesgBaton = undefined;
			disp();
			dispThis = mesgBaton;
		}
		if (tpl.ucid === undefined) setRO(tpl, 'ucid', nextUCID++);
		return ((dispThis._bc ||= [])[tpl.ucid] ||= newMsjsCode(tpl, dispThis));
	}

	/**
	 * Process regular or list-op (either NANOS or JS object) messages
	 * and return the canonical message properties
	 * @param {object} rrThis - The receiver this
	 * @param {string|NANOS|object} op - The message operation
	 * @param {*} mp - The message parameters
	 * @param {object} srThis? - The sender this
	 * @returns {{ sr?, st?, smi?, rr, rt, op, mp, hasElse, elseExpr? }}
	 */
	function canMesgProps (rrThis, op, mp, srThis = {}) {
		const { rr, rt } = rrThis;
		const { rr: sr, rt: st } = srThis;
		let smi, hasElse = false, elseExpr;

		if (op instanceof NANOS) op = op.storage;
		if (typeof op === 'object') {	// List-op message
			const hp = (prop) => hasOwn(op, prop);

			if (hp('else')) [hasElse, elseExpr] = [true, op.else];
			if (hp('mid')) {
				const moduleName = modMidToName.get(op.mid);

				if (moduleName) smi = moduleName;
			}
			if (hp('params')) mp = op.params;
			if (hp('op')) op = op.op;
			else if (hp('0')) op = op[0];
			else throw new SyntaxError('Missing operation in Mesgjs list-op message');
		}
		if (!(mp instanceof NANOS)) mp = new NANOS(mp ?? []);
		return { sr, st, smi, rr, rt, op, mp, hasElse, elseExpr };
	}

	/*
	 * Optionally set, and then return, debugging configuration
	 */
	function debugConfig (set) {
		set = unifiedList(set);
		for (const k of Object.keys(debugSettings)) {
			const type = typeof debugSettings[k];

			switch (type) {
			case 'boolean':
				if (set?.has?.(k)) debugSettings[k] = !!set.at(k);
				break;
			case 'number':
			{
				const v = set?.at?.(k);

				// deno-lint-ignore valid-typeof
				if (typeof v === type) debugSettings[k] = v;
				break;
			}
			}
		}
		return new NANOS(debugSettings);
	}

	/**
	 * Return standard initial dispatch
	 * @this {object} - The receiver this (rrThis)
	 * @param {string} op0 - The standard (non-list-op) operation
	 * @param {any} mp0 - The standard (non-list-op) message parameters
	 * @param {object} srThis? - The sender this
	 * @param {object} options
	 * @param {boolean} isInit - Dispatching getInstance @init
	 * @returns {{ dispThis, handler?, value?, trace? }}
	 */
	function dispatch (op0, mp0, srThis, { isInit } = {}) {
		const { st, op, mp, rt, smi, hasElse, elseExpr } = canMesgProps(this, op0, mp0, srThis);
		const handler = getHandler(rt, op, { isInit });

		if (handler) {
			// Handler found; generate @dispatch object to go with it
			const dispThis = newMsjsDispatchThis(this, {
				dop: op, hop: handler.op, ht: handler.type, isInit, mop: op, mp, smi
			}, srThis);
			return { dispThis, handler: handler.code, value: handler.value };
		}

		// No handler found
		if (debugSettings.dispatch) console.log(`[Mesgjs dispatch] ${st ?? '@u'} => ${rt}(${op}) [NO HANDLER]${fmtDispSrc(debugSettings.dispatchSource)}`);
		if (hasElse) return { value: runIfCode(elseExpr) };
		throw new TypeError(`No Mesgjs handler found for "${rt}(${op})"`);
	}

	/*
	 * Return flattened chain set by interface type
	 */
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
	 * Format dispatch message parameter types
	 */
	function fmtDispParams (inc, list) {
		if (!inc) return '';
		return [...unifiedList(list, true).entries()].map((en) => (isIndex(en[0]) ? ` ${loggedType(en[1])}` : ` ${en[0]}=${loggedType(en[1])}`)).join('');
	}

	/*
	 * Format a dispatched message source file / line / column
	 */
	function fmtDispSrc (inc, flc) {
		if (inc) {
			if (!flc) flc = senderFLC();
			if (flc?.line !== undefined) return ` at ${flc.file}:${flc.line}:${flc.column}`;
		}
		return '';
	}

	/*
	 * Non-blocking feature check
	 */
	function fcheck (feature) {
		switch (featurePromises.get(feature)?.state) {
		case 'pending': return false;	// @f: not ready
		case 'fulfilled': return true;	// @t: ready
		}
		// no such feature, or mod load rejected: @u
	}

	/*
	 * Wait for a list of features to be ready
	 * (Initiates the loading of deferred modules as needed)
	 */
	function fwait (...list) {
		const extended = new Set(list);
		const requireModule = (module) => {
			if (modLoaded.has('mod-' + module)) return;
			loadModule(module);
			for (const featreq of modMeta.at(['modules', module, 'featreq'], []).values()) extended.add(featreq);
		};

		for (const feature of extended) {
			const defMod = allFeatures.at([feature, 'defer']);

			if (defMod) requireModule(defMod);
		}

		const promise = getInstance('@promise'), promises = [];

		promise.catch(noopFunction);
		for (const feature of extended) if (featurePromises.has(feature)) promises.push(featurePromises.get(feature));
		return promise.all(promises);
	}

	/*
	 * Mark a feature ready (if module is authorized)
	 */
	function fready (mid, feature) {
		const meta = modMap.get(mid);

		if (meta?.at('featpro')?.includes(feature) || modMeta.at('testMode')) {
			featurePromises.get(feature)?.resolve();
		}
	}

	/**
	 * Try to locate a specific or default handler for a type and operation.
	 * @param {string} type0 - The initial type at which to begin searching
	 * @param {string} op - The operation for which a handler is sought.
	 * @returns {{ code?, type, op }|undefined}
	 *
	 * The type is the type from which the handler was taken (which might be
	 * a down-chain type from type0).
	 * The op is the operation associated with the handler (which might be
	 * `@default` if no specific handlers matched).
	 */
	function getHandler (type0, op, { isInit, next } = {}) {
		// Ignore (no-op) @init outside of getInstance
		if (op === '@init' && !isInit) return { type: type0, op };

		const cacheKey = typeof type0 === 'string' && typeof op === 'string' && `${type0}(${op})${next ? '+' : ''}`;
		const hit = cacheKey && handlerCache.get(cacheKey);

		if (hit) return hit;

		const searchChain = () => {
			let dacHand, defHand;

			for (const type of flatChain(type0)) {
				if (next && type === type0) continue;

				const ix = interfaces[type], code = ix?.handlers[op];

				if (code) return { code, type, op };
				if (ix && !defHand) {
					if (!dacHand) {
						const op = '@defacc', code = ix.handlers[op];

						if (code) dacHand = { code, type, op };
					}

					const op = '@default', code = ix.handlers[op];

					if (code) defHand = { code, type, op };
				}
			}

			// No-op is always the default for instance @init
			if (isInit) return { type: type0, op };

			// @defacc can moderate what @default accepts
			// (note: no tracing, no trampoline)
			if (defHand && dacHand) {
				const dispThis = newMsjsDispatchThis(dacHandThis, { op: '@defacc', mp: { op, type: defHand.type }, octx: Object.create(null) });
				const result = sendInternalMsg(dispThis, dacHand.code);

				if (!result) return;
			}
			return defHand;
		};

		const handler = searchChain();
		const cacheable =
			((!cacheKey || !handler?.code || !interfaces[handler.type].locked) ? false :
			((handler.code.cache !== undefined) ? handler.code.cache :
			(handler.op !== op || handler.type !== type0)));

		if (cacheable) {
			if (debugSettings.handlerCache) console.log(`[Mesgjs handler cache] ${cacheKey} => ${handler.type}(${handler.op})`);
			handlerCache.set(cacheKey, handler, handler.code.cache === 'pin' && handler.type === type0);
		}
		return handler;
	}

	/**
	 * Return a new object instance of the specified type.
	 * See also getPublicInstance.
	 * @param {string} type - The interface type
	 * @param {*} mp - The @init message parameters
	 * @param {object} srThis? - The sender this for attributed @init
	 * @returns {msjsR$RecvMsg|undefined} - The instance's receiver function
	 */
	function getInstance (type, mp, srThis = {}) {
		const ix = interfaces[type];

		if (!ix) throw new TypeError(`Cannot get instance for unknown Mesgjs interface "${type}"`);
		if (ix.instance) return ix.instance;
		if (ix.abstract) throw new TypeError(`Cannot get instance for abstract Mesgjs interface "${type}"`);

		const rrThis = { rr: null, rt: type, dispatch, octx: Object.create(null), sm: null };
		const rr = rrThis.rr = msjsR$RecvMsg.bind(rrThis);

		setRO(rr, 'msjsType', type);
		if (ix.singleton) ix.instance = rr;
		// Don't allow behavior or interface properties to change once an instance exists
		ix.locked = true;
		if (!(mp instanceof NANOS)) mp = new NANOS(mp ?? []);

		const { dispThis, handler, value } = dispatch.call(rrThis, '@init', mp, srThis, { isInit: true });

		sendInternalMsg({ dispThis, handler, value });
		return rr;
	}

	/*
	 * Return a Msjs interface management object.
	 * @param {string} name - The name of the interface to be managed
	 * @returns {msjsR$RecvMsg|undefined} - The interface management object receiver function
	 */
	function getInterface (name) {
		if (name === ':?') name = ':?' + nextAnon++;
		else if (typeof name !== 'string' || !name || (name.startsWith(':?') && !interfaces[name])) return;
		// No new `@` interfaces after init phase 1
		if (name[0] === '@' && initPhase !== 1 && !interfaces[name]) return;

		const ix = interfaces[name], isFirst = !ix;

		if (isFirst) interfaces[name] = {
			handlers: Object.create(null), chain: new Set([]),
			abstract: false, final: false, locked: false,
			once: false, pristine: true, singleton: false
		};
		if (ix?.once) return;
		return newMsjsInterface(name, isFirst);
	}

	/*
	 * Return the current modMeta (if configured)
	 */
	function getModMeta () {
		// Never give access to unfrozen modMeta!
		return Object.isFrozen(modMeta) ? modMeta : undefined;
	}

	/*
	 * Anonymously get an instance of a public interface
	 * (the external version of getInstance)
	 * @param {string} type - The interface type
	 * @param {*} mp - @init message parameters
	 * @returns {msjsR$RecvMsg|undefined} - The instance receiver function
	 */
	function getPublicInstance (type, mp) {
		const ix = interfaces[type];

		if (ix && !ix.private) return getInstance(type, mp);
	}

	/*
	 * Initialize the runtime environment (e.g. load core, core extensions)
	 */
	function initialize (installer) {
		if (initPhase === 2) {			// Only initialize once
			initPhase = 1;
			firstInit.forEach((cb) => cb());
			installer();
			initPhase = 0;
			dacHandThis.rr = gt.$c;
		}
	}

	/*
	 * Load a Mesgjs module. Called by setModMeta and fwait.
	 */
	async function loadModule (module) {
		// Prevent reload by source
		if (modLoaded.has('mod-' + module)) return;
		modLoaded.add('mod-' + module);

		const meta = modMeta.at(['modules', module]);

		if (meta.at('url', '').endsWith('.msjs')) return;

		const integrity = meta.at('integrity', '');
		const expect = (integrity === 'DISABLED') ? '' : getIntegritySHA512(integrity);

		if (expect) {
			// Prevent reload by signature
			if (modLoaded.has(expect)) return;
			modLoaded.add(expect);
		} else {
			if (globalThis.msjsHasModMeta && integrity !== 'DISABLED') {
				const err = new Error(`loadModule: Refusing unverified module "${module}"`);

				console.error(err.message);
				return err;
			}
			console.warn(`loadModule WARNING: Module "${module}" is unverified`);
		}

		const fetchURL = remapModURL(module, meta);
		let code, importURL;
		const mid = Symbol();

		modMidToName.set(mid, module);
		try {
			code = await fetchModule(fetchURL, { integrity: expect });
			if (meta) {
				if (expect) modMap.set(expect, meta);
				modMap.set(mid, meta);
			}

			const importURL = (typeof Blob === 'function' && typeof URL?.createObjectURL === 'function') ?
				URL.createObjectURL(new Blob([ new TextEncoder().encode(code) ], { type: 'application/javascript' })) :
				`data:application/javascript;base64,${btoa(code)}`;
			const mod = await import(importURL);

			if (globalThis.msjsHasModMeta && typeof mod.loadMsjs === 'function') mod.loadMsjs(mid);
		} catch (err) {
			console.error(`loadModule "${module}" failed: ${err.message}`);
			// Reject this module's features, if any
			for (const feature of meta?.at('featpro')?.values() || []) {
				featurePromises.get(feature)?.reject(code);
			}
			return err;
		} finally {
			if (importURL?.startsWith('blob:')) URL.revokeObjectURL(importURL);
		}
	}

	/*
	 * Log registered interfaces for debugging.
	 */
	function logInterfaces () { console.log(interfaces); }

	/*
	 * Determine whether a module has a registered capability
	 */
	function modHasCap (module, cap) {
		const caps = modMeta?.at(['modules', module, 'modcaps']) || [];
		return caps.includes(cap);
	}

	// Process module entries.
	function processModules (mods) {
		const listify = (base, key, sep = /[\s,]+/) => {
			const value = base.at(key);
			if (typeof value === 'string') {
				base.set(key, new NANOS(value.split(sep).filter(Boolean)));
			}
		};

		for (const [modPath, modInfo] of mods?.namedEntries() || []) {
			const integrity = modInfo.at('integrity');

			listify(modInfo, 'featpro');
			listify(modInfo, 'featreq');
			listify(modInfo, 'modcaps');
			if (integrity !== 'DISABLED' && !getIntegritySHA512(integrity)) continue;

			const features = modInfo?.at('featpro', []);

			addFeatures(features, modPath, modInfo);
		}
	}

	// Use modMeta to remap the module source location
	function remapModURL (src, meta) {
		// Use an exact URL if one was provided
		const url = meta?.at('url');

		if (url) return url;

		// Revise based on prefix mapping
		const prefixMap = modMeta.at('prefixMap');
		let best = [ '', 0 ];

		for (const [ input, output ] of prefixMap.entries()) {
			const len = input.length;

			if (len > best[1] && src.startsWith(input)) best = [ output, len ];
		}
		src = best[0] + src.substring(best[1]);

		// /base + version => /base/major/base@version
		const version = meta?.at('version'), [ , major ] = version && version.match(/(\d+)/) || [];

		if (version && major !== undefined) {
			const [ , dir, base ] = src.match(/(.*\/)?(.*)(?:(?:\.esm)?\.js)?$/);

			src = `${dir}${base}/${major}/${base}@${version}`;
		}

		if (!src.endsWith('.js')) src += '.esm.js';
		return src;
	}

	// Prototype message receiver function (all object types)
	function msjsR$RecvMsg (op, mp) {
		if (op === undefined) {
			// Pass this (rrThis) via baton for msjsS$SendMsg (attributed message)
			mesgBaton = this;
			return;
		}

		// Get handler and dispatch object for anonymous trampoline
		const { dispThis, handler, value } = this.dispatch(op, mp);
		const trace = dispThis && (debugSettings.dispatch || debugSettings.stack) ? traceDispatch : undefined;
		const traceThis = trace && (this.run ? newMsjsDispatchThis(this, { op: 'run' }) : dispThis);

		try {
			trace?.(0, traceThis);
			const result = handler ? handler(dispThis.rr) : value;
			trace?.(1, traceThis, result);
			return result;
		}
		catch (e) {
			trace?.(2, traceThis, e);
			if (dispThis?.capture && !this.run && e instanceof MsjsFlow) {
				// Process an @d(return)
				dispThis.capture = false;
				return dispThis.result; // @d(return ...)
			}
			throw e;
		}
		finally {
			trace?.(3, traceThis);
		}
	}

	/*
	 * Prototype private send-message function
	 * Promotes JS receiver objects to Mesgjs, if necessary.
	 */
	function msjsS$SendMsg (rr, op, mp) {
		if (typeof rr !== 'function' || !rr?.msjsType) rr = gt.$toMsjs(rr);
		mesgBaton = undefined;
		rr?.(); // Prompt receiver for its rrThis

		const rrThis = mesgBaton;

		mesgBaton = undefined;
		if (!rrThis) throw new TypeError('Invalid Mesgjs receiver');

		// Get handler and dispatch object for attributed trampoline
		const { dispThis, handler, value } = rrThis.dispatch(op, mp, this); // our this = srThis
		const trace = dispThis && (debugSettings.dispatch || debugSettings.stack) ? traceDispatch : undefined;
		const traceThis = trace && (rrThis.run ? newMsjsDispatchThis(rrThis, { op: 'run' }) : dispThis);

		try {
			trace?.(0, traceThis);
			const result = handler ? handler(dispThis.rr) : value;
			trace?.(1, traceThis, result);
			return result;
		}
		catch (e) {
			trace?.(2, traceThis, e);
			if (dispThis?.capture && !rrThis.run && e instanceof MsjsFlow) {
				dispThis.capture = false;
				return dispThis.result; // @d(return ...)
			}
			throw e;
		}
		finally {
			trace?.(3, traceThis);
		}
	}

	function sendInternalMsg ({ dispThis, handler, value }) {
		const trace = dispThis && (debugSettings.dispatch || debugSettings.stack) ? traceDispatch : undefined;

		try {
			trace?.(0, dispThis);
			const result = handler ? handler(dispThis.rr) : value;
			trace?.(1, dispThis, result);
			return result;
		} catch (e) {
			trace?.(2, dispThis, e);
			if (dispThis?.capture && e instanceof MsjsFlow) {
				return dispThis.result;
			}
			throw e;
		} finally {
			trace?.(3, dispThis);
		}
	}

	/*
	 * Interface-object implementation to set/change a Msjs object interface
	 *
	 * Parameters:
	 * - abstract - The interface is incomplete and cannot be instantiated
	 * - chain - Sets an ordered chain of super-class interfaces
	 * - final - The interface is final and cannot be chained
	 * - handlers - Message operation handlers to be added
	 * - lock - Lock out future setInterface calls
	 * - once - Prevents returning the interface again and throws an
	 *		 error if returned before
	 * - pristine - Throw an error if not the first configuration
	 * - private - The interface is private (instances may only be generated
	 *		 via the interface object, not through the core)
	 */
	function setInterface (name, mp, isFirst) {
		if (name[0] === '@' && initPhase !== 1) throw new TypeError(`Cannot configure Mesgjs interface "${name}" after runtime initialization`);

		const ix = interfaces[name];

		if (mp instanceof NANOS) mp = mp.storage;
		if ((mp.once && !isFirst) || (mp.pristine && !ix.pristine)) throw new TypeError(`Mesgjs interface "${name}" is not pristine`);
		ix.pristine = false;
		if (ix.locked) throw new TypeError(`Cannot change locked Mesgjs interface "${name}"`);

		// Set the interface chain. Locking guarantees an acyclic graph.
		if (mp.chain) {
			if (ix.chain.size) throw new TypeError(`Cannot change chain for Mesgjs interface "${name}"`);

			const chain = new Set(Object.values(mp.chain.storage || mp.chain || []));

			for (const item of chain) {
				if (!interfaces[item]) throw new ReferenceError(`Mesgjs interface "${name}" references unknown interface "${item}"`);
				if (interfaces[item].final) throw new TypeError(`Mesgjs interface "${name}" tries to extend final interface "${item}"`);
				interfaces[item].locked = true;
			}
			ix.chain = chain;
		}

		/*
		 * Add message handlers. These can be either foundational JavaScript
		 * implementation functions or Mesgjs code blocks.
		 */
		const opHandlers = mp.handlers || {};

		for (const [ op, handler ] of (opHandlers instanceof NANOS) ? opHandlers.entries() : Object.entries(opHandlers)) {
			if (typeof handler === 'function') {
				if (handler.msjsType === '@code') {
					codeBaton = undefined;
					handler(getCode);
					if (codeBaton) setRO(ix.handlers[op] = codeBaton, 'msjsType', '@handler');
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

		if (mp.abstract) ix.abstract = true;
		if (mp.final) ix.final = true;
		if (mp.lock) ix.locked = true;
		if (mp.once) ix.once = true;
		if (mp.private) ix.private = true;
		if (mp.singleton) ix.singleton = true;
	}

	// Set module metadata (once) from a plain object or NANOS
	function setModMeta (meta) {
		if (globalThis.msjsHasModMeta) return;	// Already set

		// Deep copy from NANOS or plain object config
		if (meta instanceof NANOS) modMeta.push(parseSLID(meta.toSLID()));
		else if (typeof meta === 'object') modMeta.push(parseQJSON(JSON.stringify(meta)));
		else return;

		setRO(globalThis, {
			msjsHasModMeta: true,		// Module metadata added
			msjsNoSelfLoad: true,		// Turn off module self-loading
		});

		// Track features provided by modules (or test mode)
		processModules(modMeta.at('modules'));
		if (modMeta.at('testMode')) {
			addFeatures(modMeta.at('features', []));
		}

		modMeta.set('allFeatures', allFeatures);

		// No more changes!
		modMeta.deepFreeze();

		/*
		 * Allow modules to @c(fwait @loaded) and initiate loading of all
		 * non-deferred modules. @loaded reflects completion of the loading
		 * phase (success or failure).
		 */
		const loaded = getInstance('@promise'), loadPros = [];

		featurePromises.set('@loaded', loaded);
		for (const [modPath, modInfo] of modMeta.at('modules')?.entries() || []) if (!modInfo.at('deferLoad')) loadPros.push(loadModule(modPath));
		loaded.allSettled(loadPros);
	}

	function stub (type, ...names) {
		const h = interfaces[type]?.handlers;

		if (h) names.forEach((name) => h[name] = false);
	}

	// Trace phases of dispatch
	function traceDispatch (phase, dispThis, value) {
		const d = dispThis.rr, dispNo = dispThis.id.toString(16);

		switch (phase) {
		case 0: // Before handler
			if (debugSettings.dispatch) {
				const dispOp = (typeof d.mop === 'symbol') ? 'J.Symbol' : d.mop;
				const dispSt = d.st || '@u';

				console.log(`[Mesgjs dispatch ${dispNo}] ${dispSt} => ${d.rt}${d.ht === d.rt ? '' : ('/' + d.ht)}(${dispOp}${fmtDispParams(debugSettings.dispatchTypes, d.mp)})${fmtDispSrc(debugSettings.dispatchSource)}`);
			}
			if (debugSettings.stack) {
				stack.push({ d, ...(debugSettings.stackSource && senderFLC() || {}) });
				dispThis.dbgStk = true;
			}
			break;
		case 1: // Handler result
			if (debugSettings.dispatch) console.log(`[Mesgjs return ${dispNo}]${fmtDispParams(debugSettings.dispatchTypes, [ value ])}`);
			break;
		case 2: // Exception
			if (value instanceof MsjsFlow) { // Normal @d(return), etc.
				if (debugSettings.dispatch) {
					if (dispThis.capture) console.log(`[Mesgjs @d return ${dispNo}]${fmtDispParams(debugSettings.dispatchTypes, [ dispThis.result ])}`);
					else console.log(`[Mesgjs flow ${dispNo}]`);
				}
				break;
			}

			// Unexpected exception
			if (debugSettings.dispatch) console.warn(`[Mesgjs exception ${dispNo}]`, value);
			if (debugSettings.stack) appendStackTrace(value);
			break;
		case 3: // Finally
			if (dispThis.dbgStk) stack.pop();
			break;
		}
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

		if (handler) return [ handler.type, handler.op === '@default' ? 'default': 'specific' ];
	}

	// Return whether the flat-chain for type 1 includes type 2.
	function typeChains (type1, type2) {
		if (interfaces[type1]?.private) return;
		if (type2 === undefined) return (interfaces[type1] ? Array.from(interfaces[type1].chain) : undefined);
		return flatChain(type1).has(type2);
	}

	//////////////////////////////////////////////////////////////////////
	// @code Interface
	//////////////////////////////////////////////////////////////////////

	firstInit.push(() => {
		getInterface('@code').set({ pristine: true, private: true, lock: true,
			handlers: { run: false, fn: false, },
		});
		getInterface('@handler').set({ pristine: true, private: true, lock: true });
	});

	/*
	 * Returns a dispatch spec for @code objects
	 * @this {object} - The receiver this (rrThis)
	 * @param {string|NANOS|object} op0 - The message operation
	 * @param {*} mp0 - The message parameters
	 * @param {object} srThis? - The sender this
	 * @returns {{ d?, handler?, value?, trace? }}
	 */
	function codeDispatch (op0, mp0, srThis) {
		const { op, mp, hasElse, elseExpr } = canMesgProps(this, op0, mp0, srThis);

		if (op === 'run') { // Fast-track (run) message
			return this.run;
		}

		switch (op) { // Standard-mode ops
		case initSym: case '@init': return noopDispatch;
		case getCode:
			codeBaton = this.run.handler; // JS function for interface
			return noopDispatch;
		case 'fn':
			return { value: newMsjsFunction(this.run.handler, mp) };
		}

		if (hasElse) return { value: runIfCode(elseExpr) };
		throw new TypeError(`No Mesgjs handler found for "@code(${op})"`);
	}

	/**
	 * Return a new Msjs @code object given code and the original dispatch context
	 * @param {object} tpl - Code template
	 * @param {number} tpl.ucid - Unique code ID
	 * @param {function} tpl.cd - Code block implementation function
	 * @param {object} dispThis - Dispatch's this
	 * @returns {msjsR$RecvMsg} - The new @code receiver function
	 */
	function newMsjsCode (tpl, dispThis) {
		const type = '@code';
		const rrThis = { rr: null, rt: type, dispatch: codeDispatch, run: { dispThis, handler: tpl.cd } };
		const rr = rrThis.rr = msjsR$RecvMsg.bind(rrThis);

		return setRO(rr, 'msjsType', type);
	}

	//////////////////////////////////////////////////////////////////////
	// @dispatch Interface
	//////////////////////////////////////////////////////////////////////

	firstInit.push(() => {
		getInterface('@dispatch').set({ pristine: true, private: true, lock: true });
		stub('@dispatch', 'dop', 'hop', 'ht', 'js', 'mop', 'redis', 'return', 'rr', 'rt', 'sr', 'st', 'smi');
	});

	/**
	 * Respond to a message on @dispatch
	 * @this {object} - Our receiver this (rrThis)
	 * @param {string|NANOS} op0 - The message operation
	 * @param {*} mp0 - The message parameters
	 * @param {*} sndrThis - The sender this (srThis) for *this* message
	 * @returns {{ dispThis?, handler?, value?, trace? }} - A dispatch spec
	 */
	function dispatchDispatch (op0, mp0, sndrThis) {
		const { octx, rrThis, srThis } = this; // *our* octx; rrThis, srThis from *original* message

		// Current sender must be associated object
		if (!sndrThis) throw new TypeError('@dispatch messages must be attributed');
		if (sndrThis !== rrThis) throw new TypeError('Improperly attributed @dispatch message');

		const { op, mp, hasElse, elseExpr } = canMesgProps(this, op0, mp0, sndrThis);
		const getRDMP = (rdmp, curmp) => {
			const raw = rdmp.at('params', curmp);

			return (raw instanceof NANOS) ? raw : new NANOS(raw ?? []);
		};

		switch (op) {
		case 'dop': return { value: octx.dop ?? octx.op }; // Current dispatch REQUESTED op
		case 'hop': return { value: octx.hop ?? octx.op }; // Handler actually-dispatched op
		case 'ht': return { value: octx.ht ?? rrThis.rt }; // Handler type
		case 'mop': return { value: octx.mop ?? octx.op }; // Original message requested op
		case 'rr': return { value: rrThis.rr };	// Receiver
		case 'rt': return { value: rrThis.rt };	// Receiver type
		case 'sr': return { value: srThis.rr };	// Sender
		case 'st': return { value: srThis.rt };	// Sender type
		case 'smi': return { value: octx.smi };	// Sending-module identifier

		case 'js': return { value: this.rrThis.octx?.js };		// JavaScript state
		case 'log':				// Log the entire dispatch to the console
			console.dir(this, { depth: null });
			return noopDispatch;
		case 'redis':			// Redispatch
		{
			if (rrThis.dispatch !== dispatch) { // Bail for non-standard objects (i.e. custom dispatcher)
				if (hasElse) return { value: runIfCode(elseExpr) };
				throw new TypeError(`${rrThis.rt} @d(redis) is unsupported`);
			}

			// For valid redis, accept either list-op or mp else parameter
			const dispElse = mp.has('else') ? mp.at('else') : elseExpr;

			// Optionally choose a specific type from the chain
			const ht = octx.ht || rrThis.rt, reqType = mp.at('type');
			const type = (reqType && reqType !== '@next') ? reqType : ht;

			// The active type must be in *current* handler's chain
			if (!flatChain(ht).has(type)) return { value: runIfCode(dispElse) };

			// Optionally change op and/or mp
			const hop = octx.hop ?? octx.op, isInit = octx.isInit;
			const rdop = mp.has('op') ? mp.at('op') : hop, rdmp = getRDMP(mp, octx.mp);
			const next = (type === ht && rdop === hop) || (reqType === '@next');
			const redis = getHandler(type, rdop, { isInit, next });

			// Don't allow switch to default if not changing op
			if (!redis || (!mp.has('op') && redis.op !== rdop)) return { value: runIfCode(dispElse) };

			// Looks good; return the redispatch
			const dispThis = newMsjsDispatchThis(rrThis, {
				dop: rdop, hop: redis.op, ht: redis.type, isInit, mop: octx.mop ?? octx.op, mp: rdmp, smi: octx.smi
			}, srThis);
			return { dispThis, handler: redis.code, value: redis.value };
		}
		case 'return':
			if (rrThis.rt === '@module') throw new TypeError('Cannot @d(return) from @module');
			this.capture = true;
			this.result = mp?.at(0);
			throw new MsjsFlow('return');
			// Not reached
		}

		if (hasElse) return { value: runIfCode(elseExpr) };
		throw new TypeError(`${rrThis.rt} @d(${String(op)}) is unsupported`);
	}

	// Shared JS getters & methods for @dispatch interface functions
	const dispProto = Object.setPrototypeOf({
		// Return code bound to this dispatch
		b (tpl) { return bindCode(tpl, this); },
		get js () { return this.octx.js; },
		// JIT persistent storage NANOS ("protected" - shared across interfaces)
		get p () { return this.octx.ps ??= new NANOS(); },
		get msjsType () { return '@dispatch'; },
		// JIT transient (scratch) storage NANOS
		get t () { return this._ts ??= new NANOS(); },
		// JIT exclusive (private persistent) storage NANOS
		get x () {
			if (!this._xs) {
				const ht = this.ht, rr = this.rr;
				let htex = exclusive.get(ht);

				if (!htex) {
					// JIT create weak map for interface (handler type)
					htex = new WeakMap();
					exclusive.set(ht, htex);
				}
				this._xs = htex.get(rr);
				if (!this._xs) {
					// JIT create storage for this instance (receiver)
					this._xs = new NANOS();
					htex.set(rr, this._xs);
				}
			}
			return this._xs;
		}
	}, Function.prototype);

	// Return a new Msjs @dispatch object
	// rrThis = original object this; srThis = sender this (if available)
	function newMsjsDispatchThis (rrThis, octx, srThis) {
		const type = '@dispatch';
		const dispThis = { rr: null, rt: type, dispatch: dispatchDispatch, id: ++dispNo, rrThis, octx, srThis };
		const d = dispThis.rr = Object.setPrototypeOf(msjsR$RecvMsg.bind(dispThis), dispProto);

		d.dop = octx.dop ?? octx.op;
		d.hop = octx.hop ?? octx.op;
		d.ht = octx.ht ?? rrThis.rt;
		d.mop = octx.mop ?? octx.op;
		d.mp = octx.mp;
		// d.octx is the original object context (not ours)
		// Can potentially be overriden per dispatch e.g. for @defacc
		d.octx = octx.octx ?? rrThis.octx;
		d.rr = rrThis.rr;
		d.rt = rrThis.rt;
		d.sr = srThis?.rr;
		d.st = srThis?.rt;
		d.smi = octx.smi;

		Object.defineProperty(d, 'sm', {
			configurable: false,
			enumerable: true,
			get: () => {
				// JIT-create .sm (send message) function shared across all dispatches
				if (!rrThis.sm) rrThis.sm = msjsS$SendMsg.bind(rrThis);
				return rrThis.sm;
			},
		});

		setRO(d, 'msjsType', type);
		return dispThis;
	}

	//////////////////////////////////////////////////////////////////////
	// @function Interface
	//////////////////////////////////////////////////////////////////////

	firstInit.push(() => {
		getInterface('@function').set({ pristine: true, private: true, lock: true,
			handlers: { call: false, fn: false, },
		});
	});

	function jsFnCall (...mp) { return this.rr('call', new NANOS([...mp])); }

	function functionDispatch (op0, mp0, srThis) {
		const { op, mp, hasElse, elseExpr } = canMesgProps(this, op0, mp0, srThis);

		if (op === 'call') { // Fast-track (call) message
			const dispThis = newMsjsDispatchThis(this, { op, mp }, srThis);
			return { dispThis, handler: this.code };
		}

		switch (op) {			// Function-mode ops
		case 'fn':						// Return a new function code block
			return { value: newMsjsFunction(this.code, mp) };
		case 'jsfn':			// Return a JS wrapper-function
			return { value: (this.jsFn ||= jsFnCall.bind(this)) };
		}

		if (hasElse) return { value: runIfCode(elseExpr) };
		throw new TypeError(`No Mesgjs handler found for "@function(${op})"`);
	}

	// Return a new Msjs @function object given code and state
	function newMsjsFunction (code, ps) {
		const type = '@function', octx = Object.create(null);
		const rrThis = { rr: null, rt: type, dispatch: functionDispatch, sm: null, octx, code };
		const rr = rrThis.rr = msjsR$RecvMsg.bind(rrThis);

		if (ps !== undefined) setRO(octx, 'ps', ps);
		return setRO(rr, 'msjsType', type);
	}

	//////////////////////////////////////////////////////////////////////
	// @interface Interface
	//////////////////////////////////////////////////////////////////////

	firstInit.push(() => {
		getInterface('@interface').set({ pristine: true, private: true, lock: true });
		stub('@interface', 'instance', 'name', 'set');
	});

	function interfaceDispatch (op0, mp0, srThis) {
		const { op, mp, hasElse, elseExpr } = canMesgProps(this, op0, mp0, srThis);

		switch (op) {
		case 'instance':
		{
			return { value: getInstance(this.name, mp, srThis) };
		}
		case 'name': return { value: this.name };
		case 'set':
			setInterface(this.name, mp, this.isFirst);
			return { value: this.rr };
		}

		if (hasElse) return { value: runIfCode(elseExpr) };
		throw new TypeError(`No Mesgjs handler found for "@interface(${op})"`);
	}

	function newMsjsInterface (name, isFirst) {
		const type = '@interface';
		const rrThis = { rr: null, rt: type, dispatch: interfaceDispatch, name, isFirst };
		const rr = rrThis.rr = msjsR$RecvMsg.bind(rrThis);

		return setRO(rr, { // Add JS API to object
			ifName: name,
			set: (mp) => {
				setInterface(name, mp, isFirst);
				return rr;
			},
			instance: (mp) => getInstance(name, mp),
			msjsType: '@interface',
		});
	}

	//////////////////////////////////////////////////////////////////////
	// @module Interface
	//////////////////////////////////////////////////////////////////////
	firstInit.push(() => {
		getInterface('@module').set({ pristine: true, private: true, lock: true });
	});

	function moduleDispatch () {
		// Modules don't currently do anything besides just exist
		return noopDispatch;
	}

	/*
	 * Return a module scope (the shared module object, a unique dispatch, and some helpers)
	 */
	function moduleScope () {
		// Create a unique dispatch object and module context
		const octx = Object.create(null);
		const moduleThis = { rr: null, rt: '@module', dispatch: moduleDispatch, octx };
		const type = '@module', rr = moduleThis.rr = msjsR$RecvMsg.bind(moduleThis);
		const dispThis = newMsjsDispatchThis(moduleThis, { op: 'load', mp: null }, moduleThis);
		const dispRr = dispThis.rr;

		// `%/` AKA `@mps` (module private/persistent state) is just the persistent state
		// from the module's @dispatch object, but accessible from anywhere in the module.
		setRO(rr, 'msjsType', type);
		Object.defineProperty(rr, 'p', {
			enumerable: true,
			get: () => dispRr.p,
		});
		return { d: dispRr, m: rr, ls: listFromPairs, na: namespaceAt };
	}

	//////////////////////////////////////////////////////////////////////

	return {
		debugConfig,
		fcheck,
		fready,
		fwait,
		getInstance: getPublicInstance,
		getInterface,
		getModMeta,
		initialize,
		logInterfaces,
		loadModule,
		modHasCap,
		moduleScope,
		setModMeta,
		typeAccepts,
		typeChains,
	};
})();
//////////////////////////////////////////////////////////////////////
// END Of Code/Interface/Messaging Protected Zone
//////////////////////////////////////////////////////////////////////

setRO(globalThis, {
	$f: false, $gss: new NANOS(), $n: null, $t: true, $u: undefined,
	$modScope: moduleScope,
});

/*
vim:syntax=javascript:sw=4
*/
