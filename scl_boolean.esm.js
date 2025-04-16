/*
 * SysCL boolean interface wrapper
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from 'syscl/runtime.esm.js';
// import { getInterface, jsToSCL, NANOS, runIfCode, setRO } from 'syscl/runtime.esm.js';
// import { isIndex, NANOS } from 'syscl/nanos.esm.js';

export function install () {
    getInterface('@boolean').set({
	abstract: true, lock: true, pristine: true,
    });
    getInterface('@false').set({
	final: true, lock: true, pristine: true, singleton: true,
	chain: [ '@boolean' ],
	handlers: {
	    '@init': d => setRO(d.octx, 'js', false),
	    toString: () => '@f',
	    valueOf: () => false,
	},
    });
    getInterface('@true').set({
	final: true, lock: true, pristine: true, singleton: true,
	chain: [ '@boolean' ],
	handlers: {
	    '@init': d => setRO(d.octx, 'js', true),
	    toString: () => '@t',
	    valueOf: () => true,
	},
    });
}

// END
