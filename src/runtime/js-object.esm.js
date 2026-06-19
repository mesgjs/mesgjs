/*
 * Mesgs @jsObject interface - generic JS objects wrapper
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from './runtime.esm.js';
import { unifiedList, uniAt } from './unified-list.esm.js';

// Helper classes to create null-prototyped objects "stamped" as locally-created
class NullProto { constructor () { return Object.create(null); } }
class Verifiable extends NullProto {
	#isOurs;
	static isOurs (obj) {
		try { obj.#isOurs; return true; }
		catch (_) { return false; }
	}
}

function opInit (d) {
	const { octx, mp } = d, obj = mp.at(0);

	setRO(octx, 'js', (typeof obj === 'object' && obj !== null) ? obj : new Verifiable());
	setRO(d.rr, { jsv: d.js, valueOf: () => d.js });
}

// object(at key ... else=default?)
// object(at path=[key ...] else=default?)
function opAt (d) {
	const { mp } = d, path = mp.has('path') ? unifiedList(mp.at('path')).values() : mp.values();

	return uniAt(d.js, [...path], { wrap: true, defaultFn: () => {
		if (mp.has('else')) return runIfCode(mp.at('else'));
		else throw new Error('Key path not found');
	}});
}

// (eq to)
// Returns @t if "to" refers to the identical JS object
function opEq (d) {
	const to = d.mp.at(0);

	return d.jsv === to || (typeof to === 'function' && to.msjsType && d.jsv === to.jsv);
}

// object(nset key1=value1 ...)
function opNset (d) {
	// Treat bring-your-own objects as read-only.
	if (!Verifiable.isOurs(d.js)) throw new TypeError('External JS Objects are read-only in Mesgjs');
	for (const [key, value] of d.mp.namedEntries()) {
		d.js[key] = value;
	}
}

// object(set key value)
// object(set key to=value)
function opSet (d) {
	// Treat bring-your-own objects as read-only.
	if (!Verifiable.isOurs(d.js)) throw new TypeError('External JS Objects are read-only in Mesgjs');
	d.js[d.mp.at(0)] = d.mp.at('to', d.mp.at(1));
}

export function install (name) {
	getInterface(name).set({
		lock: true, pristine: true,
		handlers: {
			'@init': opInit,
			'@eq': opEq,
			'@jsv': (d) => d.js,
			'@': opAt,
			'=': opSet,
			'==': opNset,
			at: opAt,
			entries: (d) => Object.entries(d.js),
			eq: opEq,
			get: opAt,
			keys: (d) => Object.keys(d.js),
			keyIter: (d) => Object.keys(d.js).values(),
			ne: (d) => !opEq(d),
			nset: opNset,
			set: opSet,
			size: (d) => Object.keys(d.js).length,
			toList: (d) => new NANOS(d.js),
			values: (d) => Object.values(d.js),
		},
	});
}

// END
