/*
 * SysCL @string interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO, typeAccepts } from 'syscl/runtime.esm.js';
// import { getInterface, jsToSCL, NANOS, runIfCode, setRO } from 'syscl/runtime.esm.js';
// import { isIndex } from 'syscl/nanos.esm.js';

// Add string bits together with an optional separator
function opAdd (d) {
    const { mp, ps } = d, sep = mp.at('sep') ?? '', parts = [ ps ];
    for (const e of mp.indexEntries()) {
	const so = jsToSCL(e[1]);
	if (typeAccepts(so.sclType, 'toString')) parts.push(so('toString'));
    }
    return parts.join(sep);
}

// Join bits of string together with the receiver in between
function opJoin (d) {
    const { mp, ps } = d, parts = [];
    for (const e of mp.indexEntries()) {
	const so = jsToSCL(e[1]);
	if (typeAccepts(so.sclType, 'toString')) parts.push(so('toString'));
    }
    return parts.join(ps);
}

export function installString () {
    getInterface('@string').set({
	final: true, lock: true, pristine: true,
	handlers: {
	    add: opAdd,
	    join: opJoin,
	    length: d => d.ps.length,
	    toString: d => d.ps,
	    valueOf: d => d.ps,
	},
	init: (octx, pi, str) => setRO(octx, 'ps', str),
    });
}

// END
