/*
 * Mesgjs @set - JS Set wrapper interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from './runtime.esm.js';
import { NANOS } from './vendor.esm.js';

function opInit (d) {
    const { octx, mp } = d, set = mp.at(0);
    setRO(octx, 'js', (set instanceof Set) ? set : new Set());
    setRO(d.js, $c.symbols.instance, d.rr, false);
    setRO(d.rr, { jsv: d.js, valueOf: () => d.js });
}

// List of (keys or) values
const kv = (d) => [...d.js.values()];

export function install (name) {
    getInterface(name).set({
	lock: true, pristine: true,
	handlers: {
	    '@init': opInit,
	    '@jsv': d => d.js,
	    '+': d => (d.js.add(d.mp.at(0)), d.js),
	    '-': d => d.js.delete(d.mp.at(0)),
	    add: d => (d.js.add(d.mp.at(0)), d.js),
	    clear: d => (d.js.clear(), d.js),
	    delete: d => d.js.delete(d.mp.at(0)),
	    // difference
	    entries: d => [...d.js.entries()],
	    // forEach - use @kvIter
	    has: d => d.js.has(d.mp.at(0)),
	    // intersection
	    // isDisjointFrom
	    // isSubsetOf
	    // isSupersetOf
	    keyIter: d => d.js.keys(),
	    keys: kv,
	    size: d => d.js.size,
	    toList: d => new NANOS(d.js),
	    // union
	    values: kv,
	},
    });
}

// END
