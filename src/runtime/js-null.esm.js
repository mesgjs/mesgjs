/*
 * Mesgjs @null interface - JS null receiver singleton
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from './runtime.esm.js';

const retNull = () => null;
const retUndef = () => undefined;
const isNullOrUndef = (d) => {
	const value = d.mp.at(0);

	return value === null || value === undefined;
}

export function install () {
	getInterface('@null').set({
		final: true, lock: true, pristine: true, singleton: true,
		handlers: {
			'@eq': (d) => d.mp.at(0) === null,
			'@jsv': retNull,
			'=': (d) => d.mp.at(0) === null,
			'!=': (d) => d.mp.at(0) !== null,
			def: (d) => !isNullOrUndef(d), // Defined (not null or undefined)
			eq: (d) => d.mp.at(0) === null,
			has: retUndef,
			ne: (d) => d.mp.at(0) !== null,
			nou: isNullOrUndef, // (N)ull (O)r (U)ndefined
			toString: () => '@n',
			valueOf: retNull,
		},
	});
}

// END
