/*
 * Mesgjs boolean interface wrapper
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from './runtime.esm.js';

const retTrue = () => true;
const retFalse = () => false;

export function install () {
    getInterface('@boolean').set({
	abstract: true, lock: true, pristine: true,
    });
    getInterface('@false').set({
	final: true, lock: true, pristine: true, singleton: true,
	chain: [ '@boolean' ],
	handlers: {
	    '@init': d => {
		setRO(d.octx, 'js', false);
		setRO(d.rr, { jsv: false, valueOf: retFalse });
	    },
	    '@jsv': retFalse,
	    toString: () => '@f',
	    valueOf: retFalse,
	},
    });
    getInterface('@true').set({
	final: true, lock: true, pristine: true, singleton: true,
	chain: [ '@boolean' ],
	handlers: {
	    '@init': d => {
		setRO(d.octx, 'js', true);
		setRO(d.rr, { jsv: true, valueOf: retTrue });
	    },
	    '@jsv': retTrue,
	    toString: () => '@t',
	    valueOf: retTrue,
	},
    });
}

// END
