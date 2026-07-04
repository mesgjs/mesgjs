/*
 * Mesgs @jsObject interface - generic JS object receiver singleton
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, MsjsObject, setRO } from './runtime.esm.js';
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

// object(at key ... else=default?)
// object(at path=[key ...] else=default?)
function opAt (d) {
	const { mp } = d, path = mp.has('path') ? unifiedList(mp.at('path')).values() : mp.values();

	return uniAt(d.orr, [...path], { wrap: true, defaultFn: () => {
		if (mp.has('else')) return runIfCode(mp.at('else'));
		else throw new Error('Key path not found');
	}});
}

// (new from?=source)
function opNew (d) {
	const obj = new Verifiable();

	if (d.mp.has('from')) {
		for (const [key, value] of unifiedList(d.mp.at('from').entries())) {
			obj[key] = value;
		}
	}
	return obj;
}

// object(nset key1=value1 ...)
function opNset (d) {
	// Treat bring-your-own objects as read-only.
	if (!Verifiable.isOurs(d.orr)) throw new TypeError('External JS Objects are read-only in Mesgjs');
	for (const [key, value] of d.mp.namedEntries()) {
		d.orr[key] = value;
	}
}

// object(set key value)
// object(set key to=value)
function opSet (d) {
	// Treat bring-your-own objects as read-only.
	if (!Verifiable.isOurs(d.orr)) throw new TypeError('External JS Objects are read-only in Mesgjs');
	d.orr[d.mp.at(0)] = d.mp.at('to', d.mp.at(1));
}

export function install (name) {
	getInterface(name).set({
		lock: true, pristine: true, singleton: true,
		handlers: {
			'@eq': (d) => d.orr === d.mp.at(0),
			'@jsv': (d) => d.orr?.msjsType ? new Verifiable() : d.orr,
			'@': opAt,
			'=': opSet,
			'==': opNset,
			at: opAt,
			entries: (d) => Object.entries(d.orr),
			eq: (d) => d.orr === d.mp.at(0),
			get: opAt,
			keys: (d) => Object.keys(d.orr),
			keyIter: (d) => Object.keys(d.orr).values(),
			ne: (d) => d.orr !== d.mp.at(0),
			new: opNew,
			nset: opNset,
			set: opSet,
			size: (d) => Object.keys(d.orr).length,
			toList: (d) => new NANOS(d.orr),
			values: (d) => Object.values(d.orr),
		},
	});
}

// END
