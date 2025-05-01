/*
 * SysCL @undefined interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from 'syscl/runtime.esm.js';
// import { getInterface, isIndex, jsToSCL, NANOS, runIfCode, setRO } from 'syscl/runtime.esm.js';

export function install () {
    getInterface('@undefined').set({
	final: true, lock: true, pristine: true, singleton: true,
	handlers: {
	    '@init': d => setRO(d.octx, 'js', undefined),
	    has: () => undefined,
	    toString: () => '@u',
	    valueOf: () => undefined,
	},
    });
}

// END
