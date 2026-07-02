/*
 * Mesgjs Next-Gen Runtime Interface And Messaging Support
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
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

const allFeatures = new NANOS();
const debugSettings = Object.assign(Object.create(null), {
	dispatch: false, dispatchSource: false, dispatchTypes: false,
	stack: 0, stackSource: false, stackTypes: false,
	handlerCache: false,
});
let dispId = 0; // Next @dispatch id
const exclusive = []; // Exclusive storage by type and object instance
const featurePromises = new Map(); // For fready/fwait
const gt = globalThis;
const handlerCache = new SieveCache(1024);
const hdr = '-- Mesgjs Dispatch Stack --';
let initPhase = 2;
const interfaces = Object.create(null);

// msgCtx is the shared message context.
// This is typically a one-time allocation, but gets swapped during @defacc processing
// in getHandler. The shape there must be kept in sync with the shape here.
let msgCtx = {
	/* Sender */   sr: null, st: null, smi: null,
	/* Message */  mop: null, hasElse: false, elseExpr: null, isInit: false, mp: null,
	/* Receiver */ orr: null, rr: null, rt: null,
	/* Dispatch */ dop: null, hop: null, ht: null, code: null, value: null,
};

const modLoaded = new Set();
const modMap = new Map();
const modMeta = new NANOS();
const modMidToName = new Map();
let nextAnonIf = 0; // Next anonymous interface number
let nextUCID = 0; // Next universal code id for code bindings
const noopFunction = () => {};
const OBJ_KEY = Symbol('MsjsObject'); // MsjsObject constructor auth token
const stack = []; // Mesgjs dispatch stack

// Runtime internal object types
const TYPE_CODE = '@code';
const TYPE_DISP = '@dispatch';
const TYPE_FUN = '@function';
const TYPE_IF = '@interface';
const TYPE_MOD = '@module';

const UCID_SYM = Symbol('UCID'); // Function property where UCID is stored

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
			const prom = MsjsObject.getInstance('@promise');

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

	for (let up = 0; --down >= 0;) {
		const curFrm = stack[down], disp = curFrm.dispThis;
		const rawOp = disp.octx.mop;
		const st = disp.srThis?.rt ?? '@u';
		const rt = disp.rrThis.rt;
		const mp = disp.octx.mp;
		const dispOp = (typeof rawOp === 'symbol') ? 'J.Symbol' : rawOp;

		frames.push(`${st} => ${rt}(${dispOp}${fmtDispParams(debugSettings.stackTypes, mp)})${fmtDispSrc(debugSettings.stackSource, curFrm)}`);
		if (++up === stop) break;
	}
	if (down >= 0) frames.push('[...]');	// Config stopped us early
	e.stack += '\n' + hdr + '\n' + frames.join('\n');
}

/*
 * Helper to calculate expected source integrity
 */
export async function calcIntegrity (src) {
	return calcDigest(await fetchModule(src, { decode: false }), 'SHA-512');
}

/*
 * Optionally set, and then return, debugging configuration
 */
export function debugConfig (set) {
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
	return inc ? [...unifiedList(list, true).entries()].map((en) => (isIndex(en[0]) ? ` ${loggedType(en[1])}` : ` ${en[0]}=${loggedType(en[1])}`)).join('') : '';
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
export function fcheck (feature) {
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
export function fwait (...list) {
	const extended = new Set(list);
	const promise = MsjsObject.getInstance('@promise'), promises = [];

	for (const feature of extended) {
		const defMod = allFeatures.at([feature, 'defer']);

		if (defMod) {
			if (modLoaded.has('mod-' + defMod)) continue;
			loadModule(defMod);
			for (const featreq of modMeta.at(['modules', defMod, 'featreq'], []).values()) extended.add(featreq);
		}
	}

	promise.catch(noopFunction);
	for (const feature of extended) if (featurePromises.has(feature)) promises.push(featurePromises.get(feature));
	return promise.all(promises);
}

/*
 * Mark a feature ready (if module is authorized)
 */
export function fready (mid, feature) {
	const meta = modMap.get(mid);

	if (meta?.at('featpro')?.includes(feature) || modMeta.at('testMode')) {
		featurePromises.get(feature)?.resolve();
	}
}

/**
 * Try to locate a specific or default handler for a type and operation.
 * @param {string} type0 - The initial type at which to begin searching
 * @param {string} dop - The dispatch requested operation
 * @modifies {msgCtx} msgCtx
 * @returns {boolean} - Whether a handler was found
 */
function getHandler (type0, dop, next, isInit) {
	msgCtx.dop = dop;
	// Ignore (no-op) @init outside of getInstance
	if (dop === '@init' && !isInit) {
		msgCtx.ht = type0;
		msgCtx.hop = dop;
		msgCtx.code = msgCtx.value = undefined;
		return true;
	}

	const cacheKey = typeof type0 === 'string' && typeof dop === 'string' && `${type0}(${dop})${next ? '+' : ''}`;
	const hit = cacheKey && handlerCache.get(cacheKey);

	if (hit) {
		msgCtx.code = hit.code;
		msgCtx.ht = hit.type;
		msgCtx.hop = hit.hop;
		msgCtx.value = undefined;
		return true;
	}

	let handCode, handType, handOp; // Specific handler, type, op
	let accCode, accType; // @defacc (default access) handler, type
	let defCode = isInit, defType; // @default handler (truthy for @init), type

	for (const type of flatChain(type0)) {
		if (next && type === type0) continue; // Ignore current type in "next" mode

		const handlers = interfaces[type]?.handlers;

		if (!handlers) continue;
		handCode = handlers[dop];
		if (handCode) { // Found a specific handler; we're done
			handType = type;
			handOp = dop;
			break;
		}

		if (!defCode) { // Check for @default if we don't have one (and not @init)
			if (!accCode) {
				accCode = handlers['@defacc'];
				accType = type;
			}
			defCode = handlers['@default'];
			defType = type;
		}
	}

	if (!handCode) { // No specific handler - consider default options
		if (isInit) {
			// No-op is always the default for instance @init
			// Nothing cacheable, so just "load and go"
			msgCtx.code = msgCtx.value = undefined;
			msgCtx.ht = type0;
			msgCtx.hop = dop;
			return true;
		}

		if (defCode) { // We have a @default handler candidate
			let useDef = true;

			if (accCode) {
				// If @defacc is also present, it moderates what @default accepts
				// (@defacc requires interrupting the dispatch in progress and then resuming it)
				const saveMsgCtx = msgCtx;

				try {
					msgCtx = { // New message context for @defacc, using the same original shape
						sr: undefined, st: undefined, smi: undefined,
						mop: '@defacc', hasElse: false, elseExpr: undefined, isInit: false,
						mp: { op: dop, type: defType },
						orr: undefined, rr: undefined, rt: '',
						dop: '@defacc', hop: '@defacc', ht: accType, code: accCode, value: undefined,
					};

					const dispObj = new MsjsDispatch(OBJ_KEY, TYPE_DISP);

					useDef = accCode(dispObj);
				} finally {
					msgCtx = saveMsgCtx;
				}
			}

			if (useDef) {
				handCode = defCode;
				handType = defType;
				handOp = '@default';
			}
		}
	}

	if (!handCode) return false;
	msgCtx.code = handCode;
	msgCtx.ht = handType;
	msgCtx.hop = handOp;
	msgCtx.value = undefined;

	const cacheable = ((!cacheKey || !handCode || !interfaces[handType].locked) ? false :
		(handCode.cache ?? (handOp !== dop || handType !== type0)));

	if (cacheable) {
		if (debugSettings.handlerCache) console.log(`[Mesgjs handler cache] ${cacheKey} => ${handType}(${handOp})`);
		handlerCache.set(cacheKey, { code: handCode, type: handType, hop: handOp }, handCode.cache === 'pin' && handType === type0);
	}

	return true;
}

/*
 * Return a Msjs interface management object.
 * @param {string} name - The name of the interface to be managed
 * @returns {msjsR$RecvMsg|undefined} - The interface management object receiver function
 */
export function getInterface (name) {
	if (name === ':?') name = ':?' + nextAnonIf++;
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
	return new MsjsInterface(OBJ_KEY, TYPE_IF, name, isFirst);
}

/*
 * Return the current modMeta (if configured)
 */
export function getModMeta () {
	// Never give access to unfrozen modMeta!
	return Object.isFrozen(modMeta) ? modMeta : undefined;
}

/*
 * Initialize the runtime environment (e.g. load core, core extensions)
 */
export function initialize (installer) {
	if (initPhase === 2) {			// Only initialize once
		initPhase = 1;

		// **** Initialize/stub internal interfaces ****
		MsjsObject.initialize();

		// **** Run external installer (from mesgjs.esm.js) for external interfaces ****
		installer();
		initPhase = 0;
	}
}

/*
 * Function template for calling an @function object directly from JS
 */
function jsfnCall (...mp) { return MsjsObject.sm(this, 'call', new NANOS([...mp])); }

/*
 * Helper listFromPairs is the runtime shortcut ls([]) (NANOS generator)
 */
export const listFromPairs = (pa) => new NANOS().fromPairs(pa);

/*
 * Load a Mesgjs module. Called by setModMeta and fwait.
 */
export async function loadModule (module) {
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
 * Helper to show types in place of values during dispatch/stack traces
 */
export function loggedType (v) {
	if (v instanceof MsjsObject) return 'M.' + v.msjsType;

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
 * Log registered interfaces for debugging.
 */
export function logInterfaces () { console.log(interfaces); }

/*
 * Determine whether a module has a registered capability
 */
export function modHasCap (module, cap) {
	const caps = modMeta?.at(['modules', module, 'modcaps']) || [];
	return caps.includes(cap);
}

/*
 * Return a module scope (the shared module object, a unique dispatch, and some helpers)
 */
export function moduleScope () {
	const m = new MsjsModule(OBJ_KEY, TYPE_MOD);
	const mc = msgCtx;

	mc.sr = mc.orr = mc.rr = m;
	mc.st = mc.rt = mc.ht = TYPE_MOD;
	mc.mop = mc.dop = mc.hop = 'load';
	mc.hasElse = mc.isInit = false;
	mc.smi = mc.elseExpr = mc.mp = mc.code = mc.value = undefined;

	const d = new MsjsDispatch(OBJ_KEY, TYPE_DISP);

	// `%/` AKA `@mps` (module private/persistent state) is just the persistent state
	// from the module's @dispatch object, but accessible from anywhere in the module.
	Object.defineProperty(m, 'p', {
		enumerable: true,
		get: () => d.p,
	});
	return { d, m, ls: listFromPairs, na: namespaceAt };
}

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
 * Flow ERROR, e.g. attempt to MsjsFlow on an inactive receiver
 */
export class MsjsFlowError extends RangeError {
	get name () { return this.constructor.name; }
};

//////////////////////////////////////////////////////////////////////
// START OF MsjsObject "chameleon" class
//////////////////////////////////////////////////////////////////////

// All Mesgjs objects are instances of MsjsObject.
//
// MsjsCode, MsjsDispatch, MsjsFunction, MsjsInterface, and MsjsModule
// are "semi-sub-classes" of MsjsObject.
//
// All of the methods for all of the different object "flavors" are
// actually MsjsObject methods, allowing access to private elements across
// instance boundaries.
//
// Custom class prototypes are manually constructed at initialization and
// then applied using super()-less subclasses for performance.

export class MsjsObject {
	#type;      // Object type (.msjsType)
	#dispatch;  // Custom dispatcher, if applicable
	#storage;   // Persistent storage NANOS, if applicable
	#js;		// JS additional state
	#core1;     // Type-specific runtime value 1
	#core2;     // Type-specific runtime value 2

	constructor (key, type, ...params) {
		if (key !== OBJ_KEY) throw new Error(`Use getInstance(${type ?? '...'}) instead of new MsjsObject`);
		this.#type = type;
		switch (type) {
		case TYPE_CODE: // @code(code, dispatchContext)
			// #core1: the code block function
			// #core2: the defining context
			this.#core1 = params[0];
			this.#core2 = params[1];
			this.#dispatch = MsjsObject.#codeDispatch;
			break;
		case TYPE_DISP: // @dispatch(context = { ...msgCtx })
			// #core1: a copy of the current message context
			// #core2: JIT bound code objects
			this.#core1 = params[0] ?? { ...msgCtx };
			this.#dispatch = MsjsObject.#dispatchDispatch;
			break;
		case TYPE_FUN: // @function(code, ps)
			// #core1: the code block function
			// #core2: currently reserved for jsfn
			this.#core1 = params[0];
			this.#storage = params[1];
			this.#dispatch = MsjsObject.#functionDispatch;
			break;
		case TYPE_IF:
			// #core1: the interface name
			// #core2: the isFirst flag
			this.#core1 = params[0];
			this.#core2 = params[1];
			this.#dispatch = MsjsObject.#interfaceDispatch;
			break;
		case TYPE_MOD:
			// #core1: unused
			// #core2: unused
			this.#dispatch = MsjsObject.#moduleDispatch;
			break;
		}
	}

	// @code Mesgjs message handlers
	static #codeDispatch (op, mp) {
		switch (op) {
		case 'fn':
			msgCtx.value = new MsjsFunction(OBJ_KEY, TYPE_FUN, this.#core1, mp);
			return true;
		case 'run':
			msgCtx.code = this.#core1;
			return true;
		}
		return false;
	}

	// @code interface init, JS properties, and methods
	static #codeInit () {
		setProto(MsjsCode, 'value', {
			fn (mp) {
				if (this.#type !== TYPE_CODE) this.#notFun('@code.fn');
				if (!(mp instanceof NANOS)) mp = (mp == null) ? new NANOS() : new NANOS(mp);
				return new MsjsFunction(OBJ_KEY, TYPE_FUN, this.#core1, mp);
			},
			run () {
				if (this.#type !== TYPE_CODE) this.#notFun('@code.run');
				return MsjsObject.sm(this, 'run');
			},
		});
		getInterface(TYPE_CODE).set({ pristine: true, private: true, lock: true });
		stub(TYPE_CODE, 'fn', 'run');
	}

	// @dispatch Mesgjs message handlers
	static #dispatchDispatch (op, mp) {
		const origCtx = this.#core1;

		if (msgCtx.sr !== origCtx.rr) throw new TypeError(`@d(${op}) on mismatched dispatch`);
		msgCtx.ht = TYPE_DISP;
		msgCtx.code = undefined;

		switch (op) {
		// Original message-context getters1G
		case 'smi': case 'sr': case 'st':
		case 'mop': case 'dop': case 'hop': case 'ht':
		case 'orr': case 'rr': case 'rt':
			msgCtx.value = origCtx[op];
			return true;
		case 'redis': // Redispatch
		{
			msgCtx.value = undefined;
			if (mp.has('else')) msgCtx.elseExpr = mp.at('else'); // Redis else has priority over list-op
			else if (!msgCtx.hasElse) msgCtx.elseExpr = undefined;
			msgCtx.hasElse = true;
			if (origCtx.rr.#dispatch) return false; // Take "else" path for custom-dispatch objects

			// Determine a starting interface type
			const ht = origCtx.ht, reqType = mp.at('type');
			const type = (reqType && reqType !== '@next') ? reqType : ht;

			if (!flatChain(ht).has(type)) return false; // Active type must be in current handler's chain

			// Determine the redis message op
			const hop = origCtx.hop, isInit = origCtx.isInit;
			const rdop = mp.at('op', hop);
			const next = (type === ht && rdop === hop) || (reqType === '@next');

			if (!getHandler(type, rdop, next, isInit)) return false;
			// Don't allow switch to @default if not changing op
			// (The proposed handler op must match the requested op if the
			// requested op matches the previous handler op)
			if (rdop === hop && msgCtx.hop !== rdop) return false;

			// Determine the redis message params
			const rdmp = mp.at('params', origCtx.mp);

			// Reset message context for redispatch
			// Send as if from original sender
			msgCtx.sr = origCtx.sr;
			msgCtx.st = origCtx.st;
			msgCtx.smi = origCtx.smi;
			// Preserve original message op and receiver info
			msgCtx.mop = origCtx.mop;
			msgCtx.isInit = isInit;
			if (rdmp instanceof NANOS) msgCtx.mp = rdmp;
			else msgCtx.mp = (rdmp == null) ? new NANOS() : new NANOS(rdmp);
			msgCtx.orr = origCtx.orr;
			msgCtx.rr = origCtx.rr;
			msgCtx.rt = origCtx.rt;
			// Keep/use dop, hop, ht, code set by getHandler
			return true;
		}
		case 'return':
			this.capture = true;
			this.result = (mp instanceof NANOS) ? mp.at(0) : mp;
			throw new MsjsFlow('return');
		}
		return false;
	}

	// @dispatch interface init, JS properties, and methods
	static #dispatchInit () {
		setProto(MsjsDispatch, 'get', {
			dop () { return (this.#type === TYPE_DISP) ? this.#core1.dop : undefined; }, // Requested dispatch op
			hop () { return (this.#type === TYPE_DISP) ? this.#core1.hop : undefined; }, // Dispatched handler op
			ht () { return (this.#type === TYPE_DISP) ? this.#core1.ht : undefined; }, // Dispatched handler type
			mop () { return (this.#type === TYPE_DISP) ? this.#core1.mop : undefined; }, // Original message op
			mp () { return (this.#type === TYPE_DISP) ? this.#core1.mp : undefined; }, // Current message parameters
			orr () { return (this.#type === TYPE_DISP) ? this.#core1.orr : undefined; }, // Current message parameters
			p () { // Receiver's persistent storage (%)
				if (this.#type !== TYPE_DISP) return;

				const rr = this.#core1.rr;

				rr.#storage ||= new NANOS();
				return rr.#storage;
			},
			rr () { return (this.#type === TYPE_DISP) ? this.#core1.rr : undefined; }, // Current message parameters
			rt () { return (this.#type === TYPE_DISP) ? this.#core1.rt : undefined; }, // Current message parameters
			smi () { return (this.#type === TYPE_DISP) ? this.#core1.smi : undefined; }, // Sending module identifier
			sr () { return (this.#type === TYPE_DISP) ? this.#core1.sr : undefined; }, // Sender
			st () { // Sender type
				if (this.#type !== TYPE_DISP) return;
				if (this.#core1.sr) this.#core1.st ||= MsjsObject.typeOf(this.#core1.sr);
				return this.#core1.st;
			},
			t () { // Dispatch transient storage (#)
				if (this.#type !== TYPE_DISP) return;
				this._ts ||= new NANOS();
				return this._ts;
			},
			x () { // Exclusive private persistent storage (%%)
				if (this.#type !== TYPE_DISP) return;
				if (!this._xs) {
					const ht = this.#core1.ht, rr = this.#core1.rr;
					let htex = exclusive[ht];

					if (!htex) {
						// JIT create weak map for interface (handler type)
						exclusive[ht] = htex = new WeakMap();
					}
					this._xs = htex.get(rr);
					if (!this._xs) {
						// JIT create storage for this instance (receiver)
						this._xs = new NANOS();
						htex.set(rr, this._xs);
					}
				}
				return this._xs;
			},
		});
		Object.defineProperty(MsjsDispatch.prototype, 'js', {
			get: function () { return (this.#type === TYPE_DISP) ? this.#core1.rr.#js : undefined; }, // Receiver's JS state
			set: function (v) { if (this.#type === TYPE_DISP) this.#core1.rr.#js = v; },
		});
		setProto(MsjsDispatch, 'value', {
			b (tpl) {
				if (this.#type !== TYPE_DISP) this.#notFun('@dispatch.b');

				const code = typeof tpl === 'function' ? tpl : tpl.cd;
				let ucid = code[UCID_SYM];

				if (ucid === undefined) {
					ucid = code[UCID_SYM] = nextUCID++;
				}
				this.#core2 ||= [];
				this.#core2[ucid] ||= new MsjsCode(OBJ_KEY, TYPE_CODE, code, this);
				return this.#core2[ucid];
			},
			s: MsjsObject.sm, // Attributed send message
			sm: MsjsObject.sm,
		});
		getInterface(TYPE_DISP).set({ pristine: true, private: true, lock: true });
		stub(TYPE_DISP, 'dop', 'hop', 'ht', 'js', 'mop', 'orr', 'redis', 'return', 'rr', 'rt', 'sr', 'st', 'smi');
	}

	static #functionDispatch (op, mp) {
		switch (op) {
		case 'call':
			msgCtx.code = this.#core1;
			return true;
		case 'fn':
			msgCtx.value = new MsjsFunction(OBJ_KEY, TYPE_FUN, this.#core1, mp);
			return true;
		case 'jsfn':
			msgCtx.value = this.#core2 ||= jsfnCall.bind(this);
			return true;
		}
		return false;
	}

	// @function interface init, JS methods, and properties
	static #functionInit () {
		setProto(MsjsFunction, 'value', {
			call (...mp) {
				if (this.#type !== TYPE_FUN) this.#notFun('@function.call');
				return MsjsObject.sm(this, 'call', mp.length ? new NANOS([...mp]) : new NANOS());
			},
			fn (mp) {
				if (this.#type !== TYPE_FUN) this.#notFun('@function.fn');
				return MsjsObject.sm(this, 'fn', mp);
			},
			jsfn () {
				if (this.#type !== TYPE_FUN) this.#notFun('@function.jsfn');
				this.#core2 ||= jsfnCall.bind(this);
				return this.#core2;
			},
		});
		getInterface(TYPE_FUN).set({ pristine: true, private: true, lock: true });
		stub(TYPE_FUN, 'call', 'fn', 'jsfn');
	}

	static getInstance (type, mp, key, sr, st) { // Request an instance of interface
		const ix = interfaces[type];

		if (!ix) throw new TypeError(`Cannot get instance for unknown Mesgjs interface "${type}"`);
		if (ix.private && key !== OBJ_KEY) return; // Public interfaces only unless authenticated
		if (ix.instance) return ix.instance; // Return existing singleton instance if applicable
		if (ix.abstract) throw new TypeError(`Cannot get instance for abstract Mesgjs interface "${type}"`);
		// Don't allow behavior or interface properties to change once an in1Gstance exists
		ix.locked = true;

		const rr = new MsjsObject(OBJ_KEY, type);

		if (ix.singleton) ix.instance = rr;

		// Send @init message if the instance has a code handler for it
		if (getHandler(type, '@init', false, true) && msgCtx.code) {
			if (sr && key === OBJ_KEY) {
				msgCtx.sr = sr;
				msgCtx.st = st;
			} else msgCtx.sr = msgCtx.st = undefined;
			msgCtx.smi = undefined;
			msgCtx.mop = '@init';
			msgCtx.isInit = true;
			if (!(mp instanceof NANOS)) mp = (mp == null) ? new NANOS() : new NANOS(mp);
			msgCtx.mp = mp;
			msgCtx.orr = msgCtx.rr = rr;
			msgCtx.rt = type;

			const initDisp = new MsjsDispatch(OBJ_KEY, TYPE_DISP);

			msgCtx.code(initDisp);
		}
		return rr;
	}

	/*
	 * Init-phase-1 initialization of sub-class prototypes
	 */
	static initialize () {
		if (initPhase !== 1) return;
		MsjsObject.#interfaceInit();
		MsjsObject.#codeInit();
		MsjsObject.#dispatchInit();
		MsjsObject.#functionInit();
		MsjsObject.#moduleInit();
	}

	static #interfaceDispatch (op, mp) {
		switch (op) {
		case 'instance':
			msgCtx.value = MsjsObject.getInstance(this.#core1, mp, OBJ_KEY, msgCtx.sr, msgCtx.st);
			return true;
		case 'name':
			msgCtx.value = this.#core1;
			return true;
		case 'set':
			MsjsObject.#setInterface(this.#core1, mp, this.#core2);
			msgCtx.value = this;
			return true;
		}
		return false;
	}

	// @interface interface init, JS methods, and properties
	static #interfaceInit () {
		setProto(MsjsInterface, 'get', {
			ifName () { return this.#core1; },
		});
		setProto(MsjsInterface, 'value', {
			instance (mp) {
				if (this.#type !== TYPE_IF) this.#notFun('@interface.instance');
				return MsjsObject.getInstance(this.#core1, mp, OBJ_KEY);
			},
			set (mp) {
				if (this.#type !== TYPE_IF) this.#notFun('@interface.set');
				MsjsObject.#setInterface(this.#core1, mp, this.#core2);
				return this;
			},
		});
		getInterface(TYPE_IF).set({ pristine: true, private: true, lock: true });
		stub(TYPE_IF, 'instance', 'name', 'set');
	}

	static #moduleDispatch () {
		return false;
	}

	static #moduleInit () {
		getInterface(TYPE_MOD).set({ pristine: true, private: true, lock: true });
	}

	get msjsType () { return this.#type; }

	#notFun (op) {
		throw new TypeError(`${op} is not a ${this.#type} function`);
	}

	static runIfCode (v) {
		return (v instanceof MsjsCode && v.#type === TYPE_CODE) ? MsjsObject.sm(v, 'run') : v;
	}

	static runWhileCode (v) {
		while (v instanceof MsjsCode && v.#type === TYPE_CODE) v = MsjsObject.sm(v, 'run');
		return v;
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
	static #setInterface (name, mp, isFirst) {
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
		const handlers = ix.handlers, addHandlers = mp.handlers || {};

		for (const [op, handler] of (addHandlers instanceof NANOS) ? addHandlers.entries() : Object.entries(addHandlers)) {
			if (handler instanceof MsjsCode && handler.#type === TYPE_CODE) handlers[op] = handler.#core1;
			else if (typeof handler === 'function') handlers[op] = handler;
			else if (handler === false) handlers[op] = false;
		}

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

	/**
	 * Send a Mesgjs message
	 * The message will be attributed if invoked as an @dispatch instance method (sender known),
	 * or anonymous otherwise.
	 * @param {*} rr - The receiver
	 * @param {string|number|symbol} op - The message operation
	 * @param {*} mp - Message parameters
	 * @returns {*} - The response to the message
	 */
	static sm (rr, mop, mp) {
		const isDispatch = this instanceof MsjsDispatch && this.#type === TYPE_DISP;
		const sr = isDispatch ? this.#core1.rr : undefined;
		const st = isDispatch ? this.#core1.rt : undefined;
		const orr = rr;
		const mc = msgCtx;
		let rt, dispatchable = false;
		let hasElse = false, elseExpr, smi;

		try { rt = rr.#type; } catch (_) { /* */ }
		if (!rt) { // Not a native receiver
			rr = gt.$msjsReceiver(rr);
			if (rr) try { rt = rr.#type; } catch (_) { /* */ }
		}

		// Canonicalize message parameters
		if (mop instanceof NANOS) mop = mop.storage;
		if (typeof mop === 'object') { // List-op message
			if (Object.hasOwn(mop, 'else')) {
				hasElse = true;
				elseExpr = mop.else;
			}
			if (Object.hasOwn(mop, 'mid')) smi = modMidToName.get(mop.mid);
			if (Object.hasOwn(mop, 'params')) mp = mop.params;
			if (Object.hasOwn(mop, 'op')) mop = mop.op;
			else mop = mop[0];
		}
		switch (typeof mop) {
		case 'number': case 'string': case 'symbol': break;
		case 'undefined':
			throw new SyntaxError('Missing message operation');
		default:
			throw new TypeError('Invalid message operation');
		}
		mc.hasElse = hasElse;
		mc.elseExpr = elseExpr;

		const codeRun = rt === TYPE_CODE && mop === 'run';

		if (codeRun) {
			const cc = rr.#core2; // @code's defining context

			mc.sr = cc.sr;
			mc.st = cc.st;
			mc.smi = cc.smi;
			mc.mop = cc.mop;
			mc.isInit = false;
			mc.mp = cc.mp;
			mc.orr = cc.orr;
			mc.rr = cc.rr;
			mc.rt = cc.rt;
			mc.code = rr.#core1; // @code's code
			mc.value = undefined;
			dispatchable = true;
		} else if (rt) { // Supported receiver; pursue dispatch
			// Set up default message context
			mc.sr = sr;
			mc.st = st;
			mc.smi = smi;
			mc.mop = mc.dop = mc.hop = mop;
			mc.isInit = false;
			if (!(mp instanceof NANOS)) mp = (mp == null) ? new NANOS() : new NANOS(mp);
			mc.mp = mp;
			mc.orr = orr;
			mc.rr = rr;
			mc.rt = mc.ht = rt;
			mc.code = mc.value = undefined;

			// Attempt custom or standard dispatch according to type.
			// Caller will trampoline to keep the stack compact if the dispatch resolves to code.
			dispatchable = rr.#dispatch ? rr.#dispatch(mop, mp) : getHandler(rt, mop);
		}

		if (!dispatchable) {
			// Not dispatchable; use else or throw
			if (msgCtx.hasElse) return MsjsObject.runIfCode(msgCtx.elseExpr);
			if (!rt) throw new TypeError('Unsupported receiver');
			if (debugSettings.dispatch) console.log(`[Mesgjs dispatch] @u => ${rt}(${op}) [NO HANDLER]${fmtDispSrc(debugSettings.dispatchSource)}`);
			throw new TypeError(`No Mesgjs handler found for ${rt}(${msgCtx.mop})`)
		}
		if (!msgCtx.code) return msgCtx.value; // No code -> return value (without tracing)

		// Create dispatch object and execute selected handler
		const dispObj = codeRun ? rr.#core2 : new MsjsDispatch(OBJ_KEY, TYPE_DISP);
		const trace = debugSettings.dispatch || debugSettings.stack;
		const traceObj = trace && (codeRun ? new MsjsDispatch(OBJ_KEY, TYPE_DISP, {
			sr: undefined, st: undefined, smi: undefined,
			mop: 'run', hasElse: false, elseExpr: undefined, isInit: false, mp: undefined,
			orr: undefined, rr: undefined, rt: TYPE_CODE,
			dop: 'run', hop: 'run', ht: TYPE_CODE, code: undefined, value: undefined,
		}) : dispObj);

		try {
			if (trace) traceObj.#traceDispatch(0);

			const result = msgCtx.code(dispObj);

			if (trace) traceObj.#traceDispatch(1, result);
			return result;
		}
		catch (e) {
			if (trace) traceObj.#traceDispatch(2, e);
			if (e instanceof MsjsFlow && !codeRun && dispObj.capture) {
				return dispObj.result;
			}
			throw e;
		}
		finally {
			if (trace) traceObj.#traceDispatch(3);
		}
	}

	#traceDispatch (phase, value) {
		const d = this.#core1;

		switch (phase) {
		case 0: // Before handler
			this.#core2 ||= [];
			if (debugSettings.dispatch) {
				const dispOp = (typeof d.mop === 'symbol') ? 'J.Symbol' : d.mop;
				const dispSt = d.st || '@u';
				const id = this.#core2.id = (dispId++).toString(16);

				console.log(`[Mesgjs dispatch ${id}] ${dispSt} => ${d.rt}${d.ht === d.rt ? '' : ('/' + d.ht)}(${dispOp}${fmtDispParams(debugSettings.dispatchTypes, d.mp)})${fmtDispSrc(debugSettings.dispatchSource)}`);
			}
			if (debugSettings.stack) {
				stack.push({ dispThis, ...(debugSettings.stackSource && senderFLC() || {}) });
				this.#core2.stack = true;
			}
			break;
		case 1: // Handler result
			if (debugSettings.dispatch) console.log(`[Mesgjs return ${this.#core2.id}]${fmtDispParams(debugSettings.dispatchTypes, [ value ])}`);
			break;
		case 2: // Exception
			if (value instanceof MsjsFlow) { // Normal @d(return), etc.
				if (debugSettings.dispatch) {
					if (this.capture) console.log(`[Mesgjs @d return ${this.#core2.id}]${fmtDispParams(debugSettings.dispatchTypes, [ dispThis.result ])}`);
					else console.log(`[Mesgjs flow ${this.#core2.id}]`);
				}
				break;
			}

			// Unexpected exception
			if (debugSettings.dispatch) console.warn(`[Mesgjs exception ${this.#core2.id}]`, value);
			if (debugSettings.stack) appendStackTrace(value);
			break;
		case 3: // Finally
			if (this.#core2?.stack) stack.pop();
			break;
		}
	}

	static typeOf (obj) {
		try { return obj.#type; } catch (_) { /* */ }
	}
}

class MsjsCode extends MsjsObject {};
class MsjsDispatch extends MsjsObject {};
class MsjsFunction extends MsjsObject {};
class MsjsInterface extends MsjsObject {};
class MsjsModule extends MsjsObject {};

//////////////////////////////////////////////////////////////////////
// END OF Mesgjs-object "chameleon" class
//////////////////////////////////////////////////////////////////////

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

/*
 * Return a message sender's source file/line/column
 * CONTINUE HERE - update for all messages via {MsjsObject,MsjsDispatch}.sm
 */
export function senderFLC () {
	const stack = (new Error().stack || '').split('\n');

	// Discard stack frames through the msjsR$RecvMsg or msjsS$SendMsg frame.
	// There shouldn't be any others, but we'll check and remove them if there are.
	while (stack.length) if (/msjs[RS]\$/.test(stack.shift())) break;
	while (stack.length && /msjs[RS]\$/.test(stack[0])) stack.shift();

	const srFrame = stack[0] || '';
	const match = srFrame.match(/[@(](.*):(\d+):(\d+)/) ||
		srFrame.match(/(?:^|\s+)at\s+(.*):(\d+):(\d+)$/);

	if (match) return { file: match[1], line: parseInt(match[2]), column: parseInt(match[3]) };
}

// Set module metadata (once) from a plain object or NANOS
export function setModMeta (meta) {
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
	const loaded = MsjsObject.getInstance('@promise'), loadPros = [];

	featurePromises.set('@loaded', loaded);
	for (const [modPath, modInfo] of modMeta.at('modules')?.entries() || []) if (!modInfo.at('deferLoad')) loadPros.push(loadModule(modPath));
	loaded.allSettled(loadPros);
}

/**
 * An Object.defineProperty wrapper to faciliate setting class prototype properties
 * @param {function} cls - The class of the prototype to set
 * @param {'get'|'value'} type - The property type
 * @param {object} props - { name: value } descriptors
 */
function setProto (cls, type, props) {
	const proto = cls.prototype;

	for (const [name, value] of Object.entries(props)) {
		Object.defineProperty(proto, name, { [type]: value });
	}
}

/*
 * Set a read-only object property or properties
 * setRO(obj, key, value, enumerable = true)
 * setRO(obj, { map }, enumerable = true)
 */
const sROProp = { writable: false, configurable: false, enumerable: null, value: null }; // One-time allocation

export function setRO (o, ...a) {
	if (typeof o !== 'object') return o; // DEBUG
	if (typeof a[0] === 'object') {
		const [map, enumerable = true] = a;

		sROProp.enumerable = enumerable;
		for (const k of Object.keys(map)) {
			sROProp.value = map[k];
			Object.defineProperty(o, k, sROProp);
		}
	} else {
		const [key, value, enumerable = true] = a;

		sROProp.value =  value;
		sROProp.enumerable = enumerable;
		Object.defineProperty(o, key, sROProp);
	}
	return o;
};

function stub (type, ...names) {
	const h = interfaces[type]?.handlers;

	if (h) names.forEach((name) => h[name] = false);
}

/*
 * Helper to throw custom MsjsFlow exceptions (not @d(return))
 */
export function throwFlow (d, type, ifName) {
	const { js, mp } = d;

	if (!js?.active) throw new MsjsFlowError(`(${type}) to inactive ${ifName}`);
	js.capture = true;
	if (mp.has('result')) {
		js.hasFlowRes = true;
		js.flowRes = mp.at('result');
	}
	throw new MsjsFlow(type);
}

/*
 * Check whether an object type accepts a given message operation.
 * Returns [type, 'specific'] if there's a specific handler;
 * [type, 'default'] if there's a default handler but no
 * specific handler; or undefined. The type returned is the first
 * type from the chain that responds, which may be different than
 * the requested type.
 */
export function typeAccepts (type, op) {
	if (op === undefined) {
		const ix = interfaces[type];

		return ((ix && !ix.private) ? [...Object.keys(ix.handlers)] : undefined);
	}

	const found = getHandler(type, op);

	if (found) return [ msgCtx.ht, msgCtx.hop === '@default' ? 'default': 'specific' ];
}

// Return whether the flat-chain for type 1 includes type 2.
export function typeChains (type1, type2) {
	if (interfaces[type1]?.private) return;
	if (type2 === undefined) return (interfaces[type1] ? Array.from(interfaces[type1].chain) : undefined);
	return flatChain(type1).has(type2);
}

export const getInstance = MsjsObject.getInstance;
export const runIfCode = MsjsObject.runIfCode;
export const runWhileCode = MsjsObject.runWhileCode;
export const sendAnonMessage = MsjsObject.sm;

setRO(globalThis, {
	$f: false, $gss: new NANOS(), $n: null, $t: true, $u: undefined,
	$modScope: moduleScope,
});

/*
vim:syntax=javascript:sw=4
*/
