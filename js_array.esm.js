/*
 * SysCL interface wrapper for JS arrays
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from 'syscl/runtime.esm.js';
// import { getInterface, jsToSCL, NANOS, runIfCode, setRO } from 'syscl/runtime.esm.js';
// import { isIndex, NANOS } from 'syscl/nanos.esm.js';

function opF (d) {
    const { mp } = d;
}

const opAF = d => { };

export function installJSArray () {
    getInterface('@jsArray').set({
	final: true, lock: true, pristine: true, // singleton: true,
	handlers: {
	    at: d => d.ps.at(d.mp.at(0)),
	    concat: d => d.ps.concat(...d.mp.values()),
	    entries: d => [...d.ps.entries()],
	    flat: d => d.ps.flat(d.mp.at(0)),
	    length: d => d.ps.length,
	    pop: d => d.ps.pop(),
	    push: d => d.ps.push(...d.mp.values()),
	    reverse: d => d.ps.reverse(),
	    setLength: d => d.ps.length = d.mp.at(0),
	    shift: d => d.ps.shift(),
	    slice: d => d.ps.slice(d.mp.at(0), d.mp.at(1)),
	    sort: d => d.ps.sort(d.mp.at(0)),
	    toReversed: d => d.ps.toReversed(),
	    toSorted: d => d.ps.toSorted(d.mp.at(0)),
	    unshift: d => d.ps.unshift(...d.mp.values()),
	},
	init: (octx, pi, ary) => setRO(octx, 'ps', ary),
    });
}

// END
