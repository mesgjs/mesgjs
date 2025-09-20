/*
 * Mesgjs @null interface - JS null wrapper
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from './runtime.esm.js';

const retNull = () => null;
const retUndef = () => undefined;
const isNull = (d) => {
	const value = d.mp.at(0);
	return value === null || value?.msjsType === '@null';
};

export function install () {
	getInterface('@null').set({
		final: true, lock: true, pristine: true, singleton: true,
		handlers: {
			'@init': d => {
				setRO(d.octx, 'js', null);
				setRO(d.rr, { jsv: null, valueOf: retNull });
			},
			'@jsv': retNull,
			eq: d => isNull(d),
			has: retUndef,
			ne: d => !isNull(d),
			toString: () => '@n',
			valueOf: retNull,
		},
	});
}

// END
