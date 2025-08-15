/*
 * Mesgjs boolean interfaces - JS true/false wrapper
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from './runtime.esm.js';

const retTrue = () => true;
const retFalse = () => false;
const isBool = (d, expect, type) => {
    const value = d.mp.at(0);
    return value === expect || value?.msjsType === type;
};

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
	    eq: d => isBool(d, false, '@false'),
	    ne: d => !isBool(d, false, '@false'),
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
	    eq: d => isBool(d, true, '@true'),
	    ne: d => !isBool(d, true, '@true'),
	    toString: () => '@t',
	    valueOf: retTrue,
	},
    });
}

// END
