/*
 * Mesgs @jsArray interface - receiver singleton for JS arrays
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, MsjsObject, setRO } from './runtime.esm.js';
import { unifiedList, uniAt } from './unified-list.esm.js';

// (at key...)
// Returns value at key path
function opAt (d) {
	const { mp } = d, path = mp.has('path') ? unifiedList(mp.at('path')).values() : mp.values();

	return uniAt(d.orr, [...path], { wrap: true, defaultFn: () => {
		if (mp.has('else')) return runIfCode(mp.at('else'));
		else throw new Error('Key path not found');
	}});
}

// (new from?=source)
// Returns a new JS Array
function opNew (d) {
	if (!d.mp.has('from')) return [];
	return [...unifiedList(d.mp.at('from'), true).values()];
}

// (set index value) or (set index to=value)
function opSet (d) {
	// Set value at index only if index is numeric
	const index = parseInt(d.mp.at(0), 10);

	if (index === index) d.orr[index] = d.mp.at('to', d.mp.at(1));
	return d.orr;
}

export function install (name) {
	getInterface(name).set({
		lock: true, pristine: true, singleton: true,
		handlers: {
			'@eq': (d) => d.orr === d.mp.at(0),
			'@jsv': (d) => (d.orr instanceof MsjsObject) ? [] : d.orr,
			'@': opAt,
			'=': opSet,
			at: opAt,
			concat: (d) => d.orr.concat(...d.mp.values()),
			entries: (d) => Object.entries(d.orr),
			eq: (d) => d.orr === d.mp.at(0),
			flat: (d) => d.orr.flat(d.mp.at(0)),
			get: opAt,
			keys: (d) => Object.keys(d.orr),
			keyIter: (d) => Object.keys(d.orr).values(),
			length: (d) => d.orr.length,
			ne: (d) => d.orr !== d.mp.at(0),
			new: opNew,
			next: (d) => d.orr.length, // For @list compatibility
			pop: (d) => d.orr.pop(),
			push: (d) => d.orr.push(...d.mp.values()),
			reverse: (d) => d.orr.reverse(),
			set: opSet,
			setKey: (d) => (d.orr[d.mp.at(0)] = d.mp.at('to', d.mp.at(1)), d.orr),
			setLength: (d) => { d.orr.length = parseInt(d.mp.at(0), 10); },
			shift: (d) => d.orr.shift(),
			size: (d) => Object.keys(d.orr).length,
			slice: (d) => d.orr.slice(d.mp.at(0), d.mp.at(1)),
			sort: (d) => d.orr.sort(d.mp.at(0)),
			toList: (d) => new NANOS(d.orr),
			toReversed: (d) => d.orr.toReversed(),
			toSorted: (d) => d.orr.toSorted(d.mp.at(0)),
			unshift: (d) => d.orr.unshift(...d.mp.values()),
			values: (d) => Object.values(d.orr),
		},
	});
}

// END
