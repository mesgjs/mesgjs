/*
 * SysCL @string interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, jsToSCL, setRO, typeAccepts } from 'syscl/runtime.esm.js';

// Join strings together with an optional separator
// a(join b c with=-) // a-b-c
function opJoin (d) {
    const { mp, ps } = d, sep = mp.at('with') ?? '', parts = [ ps ];
    for (const v of mp.values()) {
	const so = jsToSCL(v);
	if (typeAccepts(so.sclType, 'toString')) parts.push(so('toString'));
    }
    return parts.join(sep);
}

// Join strings together with the receiver as separator
// ,(joining a b c) // a,b,c
function opJoining (d) {
    const { mp, ps } = d, parts = [];
    for (const v of mp.values()) {
	const so = jsToSCL(v);
	if (typeAccepts(so.sclType, 'toString')) parts.push(so('toString'));
    }
    return parts.join(ps);
}

export function installString () {
    getInterface('@string').set({
	final: true, lock: true, pristine: true,
	handlers: {
	    join: opJoin,
	    joining: opJoining,
	    length: d => d.ps.length,
	    toString: d => d.ps,
	    valueOf: d => d.ps,
	},
	init: (octx, pi, str) => setRO(octx, 'ps', str),
    });
}

// END
