/*
 * Mesgjs boolean interfaces - JS true/false receiver singletons
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
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
			'@eq': (d) => d.mp.at(0) === false,
			'@jsv': retFalse,
			eq: (d) => d.mp.at(0) === false,
			ne: (d) => d.mp.at(0) !== false,
			toString: () => '@f',
			valueOf: retFalse,
		},
	});
	getInterface('@true').set({
		final: true, lock: true, pristine: true, singleton: true,
		chain: [ '@boolean' ],
		handlers: {
			'@eq': (d) => d.mp.at(0) === true,
			'@jsv': retTrue,
			eq: (d) => d.mp.at(0) === true,
			ne: (d) => d.mp.at(0) !== true,
			toString: () => '@t',
			valueOf: retTrue,
		},
	});
}

// END
