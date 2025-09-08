/*
 * Mesgjs @map - JS Map wrapper interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from './runtime.esm.js';
import { unifiedList, uniAt } from './unified-list.esm.js';
import { NANOS } from './vendor.esm.js';

function opInit (d) {
    const { octx, mp } = d, map = mp.at(0);
    setRO(octx, 'js', (map instanceof Map) ? map : new Map());
    setRO(d.rr, { jsv: d.js, valueOf: () => d.js });
}

function opAt (d) {
    const { mp } = d, path = mp.has('path') ? unifiedList(mp.at('path')).values() : mp.values();
    return uniAt(d.js, [...path], { wrap: true, defaultFn: () => {
    if (mp.has('else')) return runIfCode(mp.at('else'));
    else throw new Error('Key path not found');
    }});
}

function opSet (d) {
    d.js.set(d.mp.at(0), d.mp.at('to', d.mp.at(1)));
    return d.js;
}

export function install (name) {
    getInterface(name).set({
	lock: true, pristine: true,
	handlers: {
	    '@init': opInit,
	    '@jsv': d => d.js,
	    '@': opAt,
	    '=': opSet,
	    at: opAt,
	    clear: d => (d.js.clear(), d.js),
	    delete: d => d.js.delete(d.mp.at(0)),
	    entries: d => [...d.js.entries()],
	    // forEach - use @kvIter
	    get: opAt,
	    has: d => d.js.has(d.mp.at(0)),
	    keyIter: d => d.js.keys(),
	    keys: d => [...d.js.keys()],
	    set: opSet,
	    size: d => d.js.size,
	    toList: d => new NANOS(d.js),
	    values: d => [...d.js.values()],
	},
    });
}

// END
