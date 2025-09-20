/*
 * Mesgs @jsArray interface - wrapper for JS arrays
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from './runtime.esm.js';
import { unifiedList, uniAt } from './unified-list.esm.js';

function opInit (d) {
	const { octx, mp } = d, ary = mp.at(0);
	setRO(octx, 'js', Array.isArray(ary) ? ary : []);
	setRO(d.js, $c.symbols.instance, d.rr, false);
	setRO(d.rr, { jsv: d.js, valueOf: () => d.js });
}

function opAt (d) {
	const { mp } = d, path = mp.has('path') ? unifiedList(mp.at('path')).values() : mp.values();
	return uniAt(d.js, [...path], { wrap: true, defaultFn: () => {
		if (mp.has('else')) return runIfCode(mp.at('else'));
		else throw new Error('Key path not found');
	}});
}

function opSet (d) {
	// Set value at index only if index is numeric
	const index = parseInt(d.mp.at(0), 10);
	if (index === index) d.js[index] = d.mp.at('to', d.mp.at(1));
	return d.js;
}

export function install (name) {
	getInterface(name).set({
		lock: true, pristine: true,
		handlers: {
			'@init': opInit,
			'@jsv': d => d.js,
			'@': opAt,
			'=': opSet,
			at: opAt,
			concat: d => d.js.concat(...d.mp.values()),
			entries: d => Object.entries(d.js),
			flat: d => d.js.flat(d.mp.at(0)),
			get: opAt,
			keys: d => Object.keys(d.js),
			keyIter: d => Object.keys(d.js).values(),
			length: d => d.js.length,
			pop: d => d.js.pop(),
			push: d => d.js.push(...d.mp.values()),
			reverse: d => d.js.reverse(),
			set: opSet,
			setKey: d => (d.js[d.mp.at(0)] = d.mp.at('to', d.mp.at(1)), d.js),
			setLength: d => { d.js.length = parseInt(d.mp.at(0), 10); },
			shift: d => d.js.shift(),
			size: d => d.js.length,
			slice: d => d.js.slice(d.mp.at(0), d.mp.at(1)),
			sort: d => d.js.sort(d.mp.at(0)),
			toList: d => new NANOS(d.js),
			toReversed: d => d.js.toReversed(),
			toSorted: d => d.js.toSorted(d.mp.at(0)),
			unshift: d => d.js.unshift(...d.mp.values()),
			values: d => Object.values(d.js),
		},
	});
}

// END
