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
    return (mp?.entries ? Array.from(mp.entries()).filter(e => isIndex(e[0])).reduce((a, b) => a + b[1], ps) : ps);
}

function opDiv (d) {
    const { ps, mp } = d;
    return (mp?.entries ? Array.from(mp.entries()).filter(e => isIndex(e[0])).reduce((a, b) => a / b[1], ps) : ps);
}

function opMul (d) {
    const { ps, mp } = d;
    return (mp?.entries ? Array.from(mp.entries()).filter(e => isIndex(e[0])).reduce((a, b) => a * b[1], ps) : ps);
}

function opSub (d) {
    const { ps, mp } = d;
    return (mp?.entries ? Array.from(mp.entries()).filter(e => isIndex(e[0])).reduce((a, b) => a - b[1], ps) : ps);
}

export function installNumber () {
    const ix = getInterface('@number');
    ix.set({
	final: true, lock: true, pristine: true,
	handlers: {
	    add: opAdd,
	    div: opDiv,
	    mul: opMul,
	    neg: d => -d.ps,
	    sub: opSub,
	    toString: d => d.ps.toString(),
	    valueOf: d => d.ps,
	},
	init: (octx, pi, num) => setRO(octx, 'ps', num),
    });
}

// END
