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
    const ix = getInterface('@jsArray');
    ix.set({
	final: true, lock: true, pristine: true, // singleton: true,
	handlers: {
	    length: d => d.ps.length,
	    pop: d => d.ps.pop(),
	    shift: d => d.ps.shift(),
	},
	init: (octx, pi, ary) => setRO(octx, 'ps', ary),
    });
}

// END
