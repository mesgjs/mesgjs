/*
 * SysCL boolean interface wrapper
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from 'syscl/runtime.esm.js';
// import { getInterface, jsToSCL, NANOS, runIfCode, setRO } from 'syscl/runtime.esm.js';
// import { isIndex, NANOS } from 'syscl/nanos.esm.js';

export function installBoolean () {
    const ix = getInterface('@boolean');
    ix.set({
	abstract: true, lock: true, pristine: true, // singleton: true,
	handlers: {
	    toString: d => d.ps ? '@t' : '@f',
	},
	init: (octx, pi, ary) => setRO(octx, 'ps', ary),
    });
    getInterface('@false').set({
	final: true, lock: true, pristine: true, singleton: true,
	chain: [ '@boolean' ],
	init: octx => setRO(octx, 'ps', false),
    });
    getInterface('@true').set({
	final: true, lock: true, pristine: true, singleton: true,
	chain: [ '@boolean' ],
	init: octx => setRO(octx, 'ps', true),
    });
}

// END
