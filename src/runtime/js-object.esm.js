/*
 * Mesgs @jsObject interface - generic JS objects wrapper
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from './runtime.esm.js';
import { unifiedList, uniAt } from './unified-list.esm.js';

function opInit (d) {
	const { octx, mp } = d, obj = mp.at(0);
	setRO(octx, 'js', (typeof obj === 'object' && obj !== null) ? obj : {});
	setRO(d.rr, { jsv: d.js, valueOf: () => d.js });
}

function opAt (d) {
	const { mp } = d, path = mp.has('path') ? unifiedList(mp.at('path')).values() : mp.values();
	return uniAt(d.js, [...path], { wrap: true, defaultFn: () => {
		if (mp.has('else')) return runIfCode(mp.at('else'));
		else throw new Error('Key path not found');
	}});
}

export function install (name) {
	getInterface(name).set({
		lock: true, pristine: true,
		handlers: {
			'@init': opInit,
			'@jsv': d => d.js,
			'@': opAt,
			'=': d => { d.js[d.mp.at(0)] = d.mp.at('to', d.mp.at(1)); },
			at: opAt,
			entries: d => Object.entries(d.js),
			get: opAt,
			keys: d => Object.keys(d.js),
			keyIter: d => Object.keys(d.js).values(),
			set: d => { d.js[d.mp.at(0)] = d.mp.at('to', d.mp.at(1)); },
			size: d => Object.keys(d.js).length,
			toList: d => new NANOS(d.js),
			values: d => Object.values(d.js),
		},
	});
}

// END
