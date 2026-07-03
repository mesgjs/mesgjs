/*
 * Mesgjs @map - JS Map receiver singleton
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, MsjsObject, setRO } from './runtime.esm.js';
import { unifiedList, uniAt } from './unified-list.esm.js';
import { NANOS } from '@nanos';

function opAt (d) {
	const { mp } = d, path = mp.has('path') ? unifiedList(mp.at('path')).values() : mp.values();

	return uniAt(d.orr, [...path], { wrap: true, defaultFn: () => {
	if (mp.has('else')) return runIfCode(mp.at('else'));
	else throw new Error('Key path not found');
	}});
}

// (new from?=source)
// Returns a new JS Map
function opNew (d) {
	if (!d.mp.has('from')) return new Map();
	return new Map([...unifiedList(d.mp.at('from').entries())]);
}

// (nset key=value...)
function opNset (d) {
	const { orr, mp } = d;

	for (const [key, value] of mp.namedEntries()) {
		orr.set(key, value);
	}
	return orr;
}

// (set key value) or (set key to=value)
function opSet (d) {
	d.orr.set(d.mp.at(0), d.mp.at('to', d.mp.at(1)));
	return d.orr;
}

export function install (name) {
	getInterface(name).set({
		lock: true, pristine: true, singleton: true,
		handlers: {
			'@eq': (d) => d.orr === d.mp.at(0),
			'@jsv': (d) => (d.orr instanceof MsjsObject) ? new Map() : d.orr,
			'@': opAt,
			'=': opSet,
			at: opAt,
			clear: (d) => (d.orr.clear(), d.orr),
			delete: (d) => d.orr.delete(d.mp.at(0)),
			entries: (d) => [...d.orr.entries()],
			eq: (d) => d.orr === d.mp.at(0),
			// forEach - use @kvIter
			get: opAt,
			has: (d) => d.orr.has(d.mp.at(0)),
			keyIter: (d) => d.orr.keys(),
			keys: (d) => [...d.orr.keys()],
			ne: (d) => d.orr !== d.mp.at(0),
			new: opNew,
			nset: opNset,
			set: opSet,
			size: (d) => d.orr.size,
			toList: (d) => new NANOS(d.orr),
			values: (d) => [...d.orr.values()],
		},
	});
}

// END
