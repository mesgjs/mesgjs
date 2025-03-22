/*
 * SysCL @number interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from 'syscl/runtime.esm.js';
// import { getInterface, jsToSCL, NANOS, runIfCode, setRO } from 'syscl/runtime.esm.js';
import { isIndex } from 'syscl/nanos.esm.js';

function opAdd (d) {
    const { ps, mp } = d;
    return [...mp.indexEntries()].reduce((a, b) => a + b[1], ps);
}

function opDiv (d) {
    const { ps, mp } = d;
    return [...mp.indexEntries()].reduce((a, b) => a / b[1], ps);
}

function opMod (d) {
    const { ps, mp } = d;
    return [...mp.indexEntries()].reduce((a, b) => a % b[1], ps);
}

function opMul (d) {
    const { ps, mp } = d;
    return [...mp.indexEntries()].reduce((a, b) => a * b[1], ps);
}

function opPow (d) {
    const { ps, mp } = d;
    return [...mp.indexEntries()].reduce((a, b) => a ** b[1], ps);
}

function opSub (d) {
    const { ps, mp } = d;
    return [...mp.indexEntries()].reduce((a, b) => a - b[1], ps);
}

export function installNumber () {
    getInterface('@number').set({
	final: true, lock: true, pristine: true,
	handlers: {
	    add: opAdd,
	    div: opDiv,
	    mod: opMod,
	    mul: opMul,
	    neg: d => -d.ps,
	    pow: opPow,
	    sub: opSub,
	    toString: d => d.ps.toString(),
	    valueOf: d => d.ps,
	},
	init: (octx, pi, num) => setRO(octx, 'ps', num),
    });
}

// END
