/*
 * SysCL @string interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from 'syscl/runtime.esm.js';
// import { getInterface, jsToSCL, NANOS, runIfCode, setRO } from 'syscl/runtime.esm.js';
// import { isIndex } from 'syscl/nanos.esm.js';

export function installString () {
    const ix = getInterface('@string');
    ix.set({
	final: true, lock: true, pristine: true,
	handlers: {
	    length: d => d.ps.length,
	    toString: d => d.ps,
	    valueOf: d => d.ps,
	},
	init: (octx, pi, str) => setRO(octx, 'ps', str),
    });
}

// END
