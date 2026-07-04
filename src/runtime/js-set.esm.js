/*
 * Mesgjs @set - JS Set receiver singleton
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from './runtime.esm.js';
import { unifiedList, uniAt } from './unified-list.esm.js';
import { NANOS } from '@nanos';

// (add value...)
// Add (positional) values to the set
function opAdd (d) {
	const { orr, mp } = d;

	for (const v of mp.values()) {
		orr.add(v);
	}
	return orr;
}

// (new from?=source)
function opNew (d) {
	if (!d.mp.has('from')) return new Set();
	return new Set([...unifiedList(d.mp.at('from').values())]);
}

// List of (keys or) values
const kv = (d) => [...d.orr.values()];

export function install (name) {
	getInterface(name).set({
		lock: true, pristine: true, singleton: true,
		handlers: {
			'@eq': (d) => d.orr === d.mp.at(0),
			'@jsv': (d) => d.orr?.msjsType ? new Set() : d.orr,
			'+': opAdd,
			'-': (d) => d.orr.delete(d.mp.at(0)),
			add: opAdd,
			clear: (d) => (d.orr.clear(), d.orr),
			delete: (d) => d.orr.delete(d.mp.at(0)),
			// difference
			entries: (d) => [...d.orr.entries()],
			eq: (d) => d.orr === d.mp.at(0),
			// forEach - use @kvIter
			has: (d) => d.orr.has(d.mp.at(0)),
			// intersection
			// isDisjointFrom
			// isSubsetOf
			// isSupersetOf
			keyIter: (d) => d.orr.keys(),
			keys: kv,
			ne: (d) => d.orr !== d.mp.at(0),
			new: opNew,
			size: (d) => d.orr.size,
			toList: (d) => new NANOS(d.orr),
			// union
			values: kv,
		},
	});
}

// END
