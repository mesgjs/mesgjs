/*
 * Mesgjs @null interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from './runtime.esm.js';

const retNull = () => null;
const retUndef = () => undefined;

export function install () {
    getInterface('@null').set({
	final: true, lock: true, pristine: true, singleton: true,
	handlers: {
	    '@init': d => {
		setRO(d.octx, 'js', null);
		setRO(d.rr, { jsv: null, valueOf: retNull });
	    },
	    '@jsv': retNull,
	    has: retUndef,
	    toString: () => '@n',
	    valueOf: retNull,
	},
    });
}

// END
