/*
 * Mesgjs @undefined interface - JS undefined receiver singleton
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from './runtime.esm.js';

const retUndef = () => undefined;

export function install () {
	getInterface('@undefined').set({
		final: true, lock: true, pristine: true, singleton: true,
		handlers: {
			'@eq': (d) => d.orr === undefined,
			'@jsv': retUndef,
			'=': (d) => d.mp.at(0) === undefined,
			'!=': (d) => d.mp.at(0) !== undefined,
			eq: (d) => d.mp.at(0) === undefined,
			has: retUndef,
			ne: (d) => d.mp.at(0) !== undefined,
			toString: () => '@u',
			valueOf: retUndef,
		},
	});
}

// END
