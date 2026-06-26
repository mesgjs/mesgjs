/*
 * Mesgjs @undefined interface - JS undefined wrapper
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from './runtime.esm.js';

const retUndef = () => undefined;
const isUndef = (d) => {
	const value = d.mp.at(0);

	return value === undefined || (typeof value === 'function' && value.msjsType === '@undefined');
};

export function install () {
	getInterface('@undefined').set({
		final: true, lock: true, pristine: true, singleton: true,
		handlers: {
			'@init': d => {
				setRO(d.octx, 'js', undefined);
				setRO(d.rr, { jsv: undefined, valueOf: retUndef });
			},
			'@eq': isUndef,
			'@jsv': retUndef,
			'=': isUndef,
			'!=': (d) => !isUndef(d),
			eq: isUndef,
			has: retUndef,
			ne: (d) => !isUndef(d),
			toString: () => '@u',
			valueOf: retUndef,
		},
	});
}

// END
