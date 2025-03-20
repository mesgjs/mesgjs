/*
 * SysCL NANOS wrapper interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from 'syscl/runtime.esm.js';
// import { getInterface, isIndex, jsToSCL, NANOS, runIfCode, setRO } from 'syscl/runtime.esm.js';

function opF (d) {
    const { mp } = d;
}

const opAF = d => { };

export function installList () {
    getInterface('@list').set({
	final: true, lock: true, pristine: true, // singleton: true,
	handlers: {
	    clear: d => d.ps.clear(),
	    entries: d => d.ps.entries(),
	    has: d => d.ps.has(d.mp.at(0)),
	    includes: d => d.ps.includes(d.mp.at(0)),
	    indexEntries: d => d.ps.indexEntries(),
	    indexes: d => d.ps.keys(),
	    keys: d => d.ps.keys(),
	    next: d => d.ps.next,
	    pairs: d => d.ps.pairs(d.mp.at(0)),
	    pop: d => d.ps.pop(),
	    shift: d => d.ps.shift(),
	    size: d => d.ps.size,
	    toJSON: d => d.ps.toJSON(),
	    toString: d => d.ps.toString(),
	},
	init: (octx, pi, list) => setRO(octx, 'ps', list),
    });
}

// END
