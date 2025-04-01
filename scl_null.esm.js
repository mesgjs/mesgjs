/*
 * SysCL @null interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from 'syscl/runtime.esm.js';
// import { getInterface, jsToSCL, NANOS, runIfCode, setRO } from 'syscl/runtime.esm.js';
// import { isIndex, NANOS } from 'syscl/nanos.esm.js';

export function installNull () {
    getInterface('@null').set({
	final: true, lock: true, pristine: true, singleton: true,
	handlers: {
	    '@init': d => setRO(d.octx, 'js', null),
	    toString: () => '@n',
	    valueOf: () => null,
	},
    });
}

// END
