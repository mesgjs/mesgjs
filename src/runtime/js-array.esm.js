/*
 * Mesgs interface wrapper for JS arrays
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, msjsInstance, setRO } from './runtime.esm.js';
import { NANOS } from './vendor.esm.js';

function opAtInit (d) {
    const { octx, mp } = d, ary = mp.at(0);
    setRO(octx, 'js', Array.isArray(ary) ? ary : []);
    setRO(d.js, msjsInstance, d.rr, false);
}

export function install (name) {
    getInterface(name).set({
	lock: true, pristine: true,
	handlers: {
	    '@init': opAtInit,
	    '@jsv': d => d.js,
	    at: d => d.js.at(d.mp.at(0)),
	    concat: d => d.js.concat(...d.mp.values()),
	    entries: d => [...d.js.entries()],
	    flat: d => d.js.flat(d.mp.at(0)),
	    get: d => d.js.at(d.mp.at(0)),
	    keys: d => [...d.js.keys()],
	    keyIter: d => d.js.keys(),
	    length: d => d.js.length,
	    pop: d => d.js.pop(),
	    push: d => d.js.push(...d.mp.values()),
	    reverse: d => d.js.reverse(),
	    setLength: d => d.js.length = d.mp.at(0),
	    shift: d => d.js.shift(),
	    size: d => d.js.length,
	    slice: d => d.js.slice(d.mp.at(0), d.mp.at(1)),
	    sort: d => d.js.sort(d.mp.at(0)),
	    toList: d => new NANOS().fromEntries(d.js.entries()),
	    toReversed: d => d.js.toReversed(),
	    toSorted: d => d.js.toSorted(d.mp.at(0)),
	    unshift: d => d.js.unshift(...d.mp.values()),
	},
    });
}

// END
