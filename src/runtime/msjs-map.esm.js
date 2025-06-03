/*
 * Mesgjs @map - JS Map wrapper interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, msjsInstance, setRO } from './runtime.esm.js';
import { NANOS } from './vendor.esm.js';

function opInit (d) {
    const { octx, mp } = d, map = mp.at(0);
    setRO(octx, 'js', (map instanceof Map) ? map : new Map());
    setRO(d.js, msjsInstance, d.rr, false);
}

export function install (name) {
    getInterface(name).set({
	lock: true, pristine: true,
	handlers: {
	    '@init': opInit,
	    '@jsv': d => d.js,
	    clear: d => d.js.clear(),
	    delete: d => d.js.delete(d.mp.at(0)),
	    entries: d => new NANOS([...d.js.entries()]),
	    // forEach - use @kvIter
	    get: d => d.js.get(d.mp.at(0)),
	    has: d => d.js.has(d.mp.at(0)),
	    keyIter: d => d.js.keys(),
	    keys: d => new NANOS([...d.js.keys()]),
	    set: d => d.js.set(d.mp.at(0), d.mp.at(1)),
	    size: d => d.js.size,
	    values: d => new NANOS([...d.values()]),
	},
    });
}

// END
