/*
 * SysCL @string interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, jsToSCL, setRO, typeAccepts } from 'syscl/runtime.esm.js';

// Join strings together with an optional separator
// a(join b c with=-) // a-b-c
function opJoin (d) {
    const { mp, js } = d, sep = mp.at('with') ?? '', parts = [ js ];
    for (const v of mp.values()) {
	const so = jsToSCL(v);
	if (typeAccepts(so.sclType, 'toString')) parts.push(so('toString'));
    }
    return parts.join(sep);
}

// Join strings together with the receiver as separator
// ,(joining a b c) // a,b,c
function opJoining (d) {
    const { mp, js } = d, parts = [];
    for (const v of mp.values()) {
	const so = jsToSCL(v);
	if (typeAccepts(so.sclType, 'toString')) parts.push(so('toString'));
    }
    return parts.join(js);
}

export function installString () {
    getInterface('@string').set({
	final: true, lock: true, pristine: true,
	handlers: {
	    '@init': d => setRO(d.octx, 'js', d.mp.at(0, '').toString()),
	    eq: d => d.js === d.mp.at(0),
	    ge: d => d.js >= d.mp.at(0),
	    gt: d => d.js > d.mp.at(0),
	    join: opJoin,
	    joining: opJoining,
	    le: d => d.js <= d.mp.at(0),
	    length: d => d.js.length,
	    lt: d => d.js < d.mp.at(0),
	    ne: d => d.js !== d.mp.at(0),
	    toLower: d => d.js.toLowerCase(),
	    toString: d => d.js,
	    toUpper: d => d.js.toUpperCase(),
	    valueOf: d => d.js,
	},
	cacheHints: {
	    '@init': 'pin',
	},
    });
}

// END
