/*
 * Mesgjs @set - JS Set wrapper interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from './runtime.esm.js';
import { NANOS } from '@nanos';

function opInit (d) {
	const { octx, mp } = d, set = mp.at(0), from = mp.at('from');
	const initial = (typeof from?.values === 'function') ? [...from.values()] : [];

	setRO(octx, 'js', (set instanceof Set) ? set : new Set(initial));
	setRO(d.rr, { jsv: d.js, valueOf: () => d.js });
}

// (add value...)
// Add (positional) values to the set
function opAdd (d) {
	const { js, mp } = d;

	for (const v of mp.values()) {
		js.add(v);
	}
	return js;
}

// (eq to)
// Returns @t if "to" refers to the identical JS Set
function opEq (d) {
	const to = d.mp.at(0);

	return d.jsv === to || (typeof to === 'function' && to.msjsType && d.jsv === to.jsv);
}

// List of (keys or) values
const kv = (d) => [...d.js.values()];

export function install (name) {
	getInterface(name).set({
		lock: true, pristine: true,
		handlers: {
			'@init': opInit,
			'@eq': opEq,
			'@jsv': (d) => d.js,
			'+': opAdd,
			'-': (d) => d.js.delete(d.mp.at(0)),
			add: opAdd,
			clear: (d) => (d.js.clear(), d.js),
			delete: (d) => d.js.delete(d.mp.at(0)),
			// difference
			entries: (d) => [...d.js.entries()],
			eq: opEq,
			// forEach - use @kvIter
			has: (d) => d.js.has(d.mp.at(0)),
			// intersection
			// isDisjointFrom
			// isSubsetOf
			// isSupersetOf
			keyIter: (d) => d.js.keys(),
			keys: kv,
			ne: (d) => !opEq(d),
			size: (d) => d.js.size,
			toList: (d) => new NANOS(d.js),
			// union
			values: kv,
		},
	});
}

// END
