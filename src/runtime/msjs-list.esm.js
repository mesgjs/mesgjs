/*
 * Mesgjs NANOS wrapper interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInstance, getInterface, runIfCode, setRO } from './runtime.esm.js';
import { unifiedList, uniAt } from './unified-list.esm.js';

function opInit (d) {
	const { octx, mp } = d, list = mp.at(0);
	setRO(octx, 'js', (list instanceof NANOS) ? list : new NANOS());
	setRO(d.rr, { jsv: d.js, valueOf: () => d.js });
}

// (at key...? path=[key...]? else=default? raw=@f)
function opAt (d) {
	const { mp } = d, path = mp.has('path') ? unifiedList(mp.at('path')).values() : mp.values();
	return uniAt(d.js, [...path], { wrap: true, raw: mp.at('raw'),
	  defaultFn: () => {
		if (mp.has('else')) return runIfCode(mp.at('else'));
		else throw new Error('Key path not found');
	}});
}

// @code implementation for (getter)
function doGet () {
	if (this.list.has(this.key)) return this.list.at(this.key);
	if (this.hasElse) return runIfCode(this.elseVal);
	throw new Error(`Required key ${this.key} not present`);
}

// (getter key else=default?)
// Returns getter @code block
function opGetter (d) {
	const { js: list, mp } = d;
	const key = mp.at(0), hasElse = mp.has('else'), elseVal = mp.at('else');
	return d.b({ cd: doGet.bind({ list, key, hasElse, elseVal }) });
}

// Return the next index key
function opNext (d) {
	if (d.mp.has(0)) {
		d.js.next = d.mp.at(0);
		return d.rr;
	}
	return d.js.next;
}

// (nset key=value ...)
function opNset (d) {
	const { mp, js } = d;
	for (const e of mp.namedEntries()) js.set(e[0], e[1]);
}

// (rio), (rio object), (rio @t), (rio @u)
// Get/set/remove reactive interface object
function opRIO (d) {
	const { js, mp } = d;
	if (mp.has(0)) {
		let rio = mp.at(0);
		if (rio === true) rio = getInstance('@reactive')('rio');
		js.rio = rio;			// NANOS will validate
		return d.rr;
	}
	return !!js.rio;
}

// "Reactive transform" - make fully reactive, recursively
function opRxt (d) {
	const { js } = d;
	if (!js.rio) js.rio = getInstance('@reactive')('rio');
	const rio = js.rio;
	js.setOpts({ autoReactive: true });
	for (const key of js.keys()) {
		const value = js.at(key, { raw: true });
		const isR = rio.isReactive(value), nrv = isR ? value.rv : value;
		// Convert non-reactive values to reactive ones
		if (!isR) js.set(key, value);
		// Recursively apply reactive transform to nested NANOS
		if (nrv instanceof NANOS) $toMsjs(nrv)('rxt');
	}
}

// @function implementation for (setter)
function doSet (d) {
	const mp = d.mp, insert = mp.at('insert'), raw = mp.at('raw');
	this.list.set(this.key, d.mp.at(0), { insert, raw });
}

// (setter key)
// Returns setter @function block: (call value insert=@f raw=@f?)
function opSetter (d) {
	const { js: list, mp } = d, key = mp.at(0);
	return d.b({ cd: doSet.bind({ list, key }) })('fn');
}

// Supported key types
const skt = k => { const t = typeof k; return t === 'string' || t === 'number' || t === 'symbol'; };

// (set key...? path=[key...]? first=value? next=value? to=value? insert=@f raw=@f)
// list[key][...] = toValue (with optional insert, raw)
// list[key][...].unshift(firstValue)
// list[key][...].push(nextValue)
function opSet (d) {
	const { mp } = d, psrc = mp.has('path') ? unifiedList(mp.at('path')).values() : mp.values();
	const insert = mp.at('insert'), raw = mp.at('raw');
	const path = [...psrc].filter(k => skt(k)), limit = path.length - (mp.has('to') ? 1 : 0);
	let cur = d.js;
	for (let i = 0; i < limit; ++i) {
		const k = path[i];
		if (!(cur.at(k) instanceof NANOS)) cur.set(k, cur.similar());
		cur = cur.at(k);
	}
	if (mp.has('to')) cur.set(path[limit], mp.at('to'), { insert, raw });
	else {
		if (mp.has('first')) cur.unshift(mp.at('first'));
		if (mp.has('next')) cur.push(mp.at('next'));
	}
}

// (setOpts name=value ...)
function opSetOpts (d) {
	d.js.setOpts(Object.fromEntries(d.mp.namedEntries()));
	return d.rr;
}

export function install (name) {
	getInterface(name).set({
		lock: true, pristine: true,
		handlers: {
			'@init': opInit,
			'@jsv': (d) => d.js,
			'@': opAt,
			'==': opNset,
			'>': (d) => d.js.pop(),
			'|+': (d) => d.js.push(d.mp),
			'=': opSet,
			'<': (d) => d.js.shift(),
			'+|': (d) => d.js.unshift(d.mp),
			at: opAt,
			// autoPromote
			clear: (d) => d.js.clear(),
			copy: (d) => new NANOS().fromPairs(d.js.pairs()),
			delete: (d) => d.js.delete(d.mp.at(0)),
			depend: (d) => d.js.depend(),
			entries: (d) => new NANOS([...d.js.entries()]),
			// filter: use @kvIter
			// find: use @kvIter
			// findLast: use @kvIter
			// forEach: use @kvIter
			get: opAt,
			getter: opGetter,
			has: (d) => d.js.has(d.mp.at(0)),
			includes: (d) => d.js.includes(d.mp.at(0)),
			indexEntries: (d) => new NANOS([...d.js.indexEntries(d.mp.at(0))]),
			indexKeys: (d) => new NANOS([...d.js.indexKeys()]),
			isLocked: (d) => d.js.isLocked(d.mp.at(0)),
			isRedacted: (d) => d.js.isRedacted(d.mp.at(0)),
			keyOf: (d) => d.js.keyOf(d.mp.at(0)),
			keyIter: (d) => d.js.keys(),
			keys: (d) => new NANOS([...d.js.keys()]),
			lastKeyOf: (d) => d.js.lastKeyOf(d.mp.at(0)),
			lock: (d) => d.js.lock(...d.mp.indexValues()),
			lockAll: (d) => d.js.lockAll(d.mp.at(0)),
			lockKeys: (d) => d.js.lockKeys(),
			namedEntries: (d) => new NANOS([...d.js.namedEntries()]),
			namedKeys: (d) => new NANOS([...d.js.namedKeys()]),
			next: opNext,
			nset: opNset,
			options: (d) => new NANOS(d.js.options),
			pairs: (d) => new NANOS(d.js.pairs(d.mp.at(0))),
			pop: (d) => d.js.pop(),
			push: (d) => d.js.push(d.mp),
			push1: (d) => d.js.push(d.mp.at(0)),
			redact: (d) => d.js.redact(...d.mp.indexValues()),
			reverse: (d) => d.js.reverse(),
			rio: opRIO,
			rxt: opRxt,
			self: (d) => d.js,
			set: opSet,
			setOpts: opSetOpts,
			setter: opSetter,
			shift: (d) => d.js.shift(),
			size: (d) => d.js.size,
			toJSON: (d) => d.js.toJSON(),
			toReversed: (d) => d.js.toReversed(),
			toSLID: (d) => d.js.toSLID(d.mp?.storage || {}),
			toString: (d) => d.js.toString(d.mp?.storage || {}),
			unshift: (d) => d.js.unshift(d.mp),
			values: (d) => new NANOS([...d.js.values()]),
		},
		cacheHints: {
			'@init': 'pin',
			at: 'pin',
			has: 'pin',
			nset: 'pin',
			set: 'pin',
		},
	});
}

// END
