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

	return value === null || (typeof value === 'function' && value.msjsType === '@null');
};
const isNullOrUndef = (d) => {
	const value = d.mp.at(0);

	return value === null || value === undefined ||
	(typeof value === 'function' && (value.msjsType === '@null' || value.msjsType === '@undefined'));
}

export function install () {
	getInterface('@null').set({
		final: true, lock: true, pristine: true, singleton: true,
		handlers: {
			'@init': d => {
				setRO(d.octx, 'js', null);
				setRO(d.rr, { jsv: null, valueOf: retNull });
			},
			'@eq': isNull,
			'@jsv': retNull,
			'=': isNull,
			'!=': (d) => !isNull(d),
			def: (d) => !isNullOrUndef(d), // Defined (not null or undefined)
			eq: isNull,
			has: retUndef,
			ne: (d) => !isNull(d),
			nou: isNullOrUndef, // (N)ull (O)r (U)ndefined
			toString: () => '@n',
			valueOf: retNull,
		},
	});
}

// END
