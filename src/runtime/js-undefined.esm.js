/*
 * Mesgjs @undefined interface - JS undefined wrapper
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from './runtime.esm.js';

const retUndef = () => undefined;
const isUndef = (d) => {
    const value = d.mp.at(0);
    return value === undefined || value?.msjsType === '@undefined';
};

export function install () {
    getInterface('@undefined').set({
	final: true, lock: true, pristine: true, singleton: true,
	handlers: {
	    '@init': d => {
		setRO(d.octx, 'js', undefined);
		setRO(d.rr, { jsv: undefined, valueOf: retUndef });
	    },
	    '@jsv': retUndef,
	    eq: d => d.isUndef(),
	    has: retUndef,
	    ne: d => !d.isUndef(),
	    toString: () => '@u',
	    valueOf: retUndef,
	},
    });
}

// END
