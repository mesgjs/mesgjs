/*
 * Mesgjs NANOS receiver singleton
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInstance, getInterface, MsjsObject, runIfCode, setRO } from './runtime.esm.js';
import { unifiedList, uniAt } from './unified-list.esm.js';

// (at key...? path=[key...]? else=default? raw=@f)
function opAt (d) {
	const { mp } = d, path = mp.has('path') ? unifiedList(mp.at('path')).values() : mp.values();

	return uniAt(d.orr, [...path], { wrap: true, raw: mp.at('raw'),
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
	const { orr: list, mp } = d;
	const key = mp.at(0), hasElse = mp.has('else'), elseVal = mp.at('else');

	return d.b(doGet.bind({ list, key, hasElse, elseVal }));
}

// Return the next index key
function opNext (d) {
	if (d.mp.has(0)) {
		d.orr.next = d.mp.at(0);
		return d.rr;
	}
	return d.orr.next;
}

// (nset key=value ...)
function opNset (d) {
	const { mp, orr } = d;

	for (const e of mp.namedEntries()) orr.set(e[0], e[1]);
}

// (rio), (rio object), (rio @t), (rio @u)
// Get/set/remove reactive interface object
function opRIO (d) {
	const { orr, mp } = d;

	if (mp.has(0)) {
		let rio = mp.at(0);
		if (rio === true) rio = $c.sm(getInstance('@reactive'), 'rio');
		orr.rio = rio;			// NANOS will validate
		return d.rr;
	}
	return !!orr.rio;
}

// "Reactive transform" - make fully reactive, recursively
function opRxt (d) {
	const { orr } = d;

	if (!orr.rio) orr.rio = $c.sm(getInstance('@reactive'), 'rio');

	const rio = orr.rio;

	orr.setOpts({ autoReactive: true });
	for (const key of orr.keys()) {
		const value = orr.at(key, { raw: true });
		const isR = rio.isReactive(value), nrv = isR ? value.rv : value;

		// Convert non-reactive values to reactive ones
		if (!isR) orr.set(key, value);
		// Recursively apply reactive transform to nested NANOS
		if (nrv instanceof NANOS) $c.sm(nrv, 'rxt');
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
	const { orr: list, mp } = d, key = mp.at(0);

	return $c.sm(d.b(doSet.bind({ list, key })), 'fn');
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
	let cur = d.orr;

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
	d.orr.setOpts(Object.fromEntries(d.mp.namedEntries()));
	return d.rr;
}

// (slice start? end? raw?=@f)
function opSlice (d) {
	const { mp } = d;

	return d.orr.slice(mp.at(0), mp.at(1, d.orr.next, { raw: d.mp.get('raw') }));
}

export function install (name) {
	getInterface(name).set({
		lock: true, pristine: true, singleton: true,
		handlers: {
			'@eq': (d) => d.orr === d.mp.at(0),
			'@jsv': (d) => d.orr?.msjsType ? new NANOS() : d.orr,
			'@': opAt,
			'==': opNset,
			'>': (d) => d.orr.pop(),
			'|+': (d) => d.orr.push(d.mp),
			'|*': (d) => d.orr.push(...d.mp.values()),
			'=': opSet,
			'<': (d) => d.orr.shift(),
			'+|': (d) => d.orr.unshift(d.mp),
			'*|': (d) => d.orr.unshift(...d.mp.values()),
			at: opAt,
			// autoPromote
			clear: (d) => d.orr.clear(),
			copy: (d) => new NANOS().fromPairs(d.orr.pairs()),
			delete: (d) => d.orr.delete(d.mp.at(0), { raw: d.mp.at('raw') }),
			depend: (d) => d.orr.depend(),
			entries: (d) => new NANOS([...d.orr.entries({ num: d.mp.at('num'), raw: d.mp.at('raw') })]),
			eq: (d) => d.orr === d.mp.at(0),
			// filter: use @kvIter
			// find: use @kvIter
			// findLast: use @kvIter
			// forEach: use @kvIter
			get: opAt,
			getter: opGetter,
			has: (d) => d.orr.has(d.mp.at(0)),
			includes: (d) => d.orr.includes(d.mp.at(0)),
			indexEntries: (d) => new NANOS([...d.orr.indexEntries({ num: d.mp.at('num') || d.mp.at(0), raw: d.mp.at('raw') })]),
			indexKeys: (d) => new NANOS([...d.orr.indexKeys(d.mp.at('num') || d.mp.at(0))]),
			isLocked: (d) => d.orr.isLocked(d.mp.at(0)),
			isRedacted: (d) => d.orr.isRedacted(d.mp.at(0)),
			keyOf: (d) => d.orr.keyOf(d.mp.at(0), { num: d.mp.at('num') }),
			keyIter: (d) => d.orr.keys(),
			keys: (d) => new NANOS([...d.orr.keys(d.mp.at('num') || d.mp.at(0))]),
			lastKeyOf: (d) => d.orr.lastKeyOf(d.mp.at(0), { num: d.mp.at('num') }),
			lock: (d) => d.orr.lock(...d.mp.indexValues()),
			lockAll: (d) => d.orr.lockAll(d.mp.at(0)),
			lockKeys: (d) => d.orr.lockKeys(),
			namedEntries: (d) => new NANOS([...d.orr.namedEntries()]),
			namedKeys: (d) => new NANOS([...d.orr.namedKeys()]),
			ne: (d) => d.orr !== d.mp.at(0),
			next: opNext,
			nset: opNset,
			options: (d) => new NANOS(d.orr.options),
			pairs: (d) => new NANOS(d.orr.pairs(d.mp.at('num') || d.mp.at(0))),
			pop: (d) => d.orr.pop(),
			push: (d) => d.orr.push(d.mp),
			pushx: (d) => d.orr.push(...d.mp.values()),
			redact: (d) => d.orr.redact(...d.mp.indexValues()),
			reverse: (d) => d.orr.reverse(),
			rio: opRIO,
			rxt: opRxt,
			self: (d) => d.orr,
			set: opSet,
			setOpts: opSetOpts,
			setter: opSetter,
			shift: (d) => d.orr.shift(),
			size: (d) => d.orr.size,
			slice: opSlice,
			toJSON: (d) => d.orr.toJSON(),
			toReversed: (d) => d.orr.toReversed(),
			toSLID: (d) => d.orr.toSLID(d.mp?.storage || {}),
			toString: (d) => d.orr.toString(d.mp?.storage || {}),
			unshift: (d) => d.orr.unshift(d.mp),
			unshx: (d) => d.orr.unshift(...d.mp.values()),
			values: (d) => new NANOS([...d.orr.values()]),
		},
		cacheHints: {
			at: 'pin',
			has: 'pin',
			nset: 'pin',
			set: 'pin',
		},
	});
}

// END
