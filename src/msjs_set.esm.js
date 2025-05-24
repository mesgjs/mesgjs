/*
 * Mesgjs @set - JS Set wrapper interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, NANOS, msjsInstance, setRO } from 'mesgjs/runtime.esm.js';

function opInit (d) {
    const { octx, mp } = d, set = mp.at(0);
    setRO(octx, 'js', (set instanceof Set) ? set : new Set());
    setRO(d.js, msjsInstance, d.rr, false);
}

export function install (name) {
    getInterface(name).set({
	lock: true, pristine: true,
	handlers: {
	    '@init': opInit,
	    '@jsv': d => d.js,
	    add: d => d.js.add(d.mp.at(0)),
	    clear: d => d.js.clear(),
	    delete: d => d.js.delete(d.mp.at(0)),
	    // difference
	    entries: d => new NANOS([...d.js.entries()]),
	    // forEach - use @kvIter
	    has: d => d.js.has(d.mp.at(0)),
	    // intersection
	    // isDisjointFrom
	    // isSubsetOf
	    // isSupersetOf
	    keyIter: d => d.js.keys(),
	    keys: d => new NANOS([...d.js.keys()]),
	    // union
	    values: d => new NANOS([...d.values()]),
	},
    });
}

// END
