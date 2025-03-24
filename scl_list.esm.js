/*
 * SysCL NANOS wrapper interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, NANOS, runIfCode, setRO } from 'syscl/runtime.esm.js';
import { unifiedList } from 'syscl/unified_list.esm.js';
/*
import { getInterface, isIndex, jsToSCL, NANOS, runIfCode, setRO } from 'syscl/runtime.esm.js';

const opAF = d => { };
*/

function opAt (d) {
    const { mp } = d;
    let cur = d.ps;
    for (const k of mp.values()) {
	if (cur.has(k)) cur = unifiedList(cur.at(k));
	else if (mp.has('else')) return runIfCode(mp.at('else'));
	else throw new Error('Key path not found');
    }
    return cur;
}

function opNset (d) {
    const { mp, ps } = d;
    for (const e of mp.entries()) ps.set(e[0], e[1]);
}

function opSet (d) {
    // Supported key type
    const skt = k => { const t = typeof k; return t === 'string' || t === 'number' || t === 'symbol'; };
    const { mp } = d, path = [...mp.values()].filter(k => skt(k)), limit = path.length - (mp.has('to') ? 1 : 0);
    let cur = d.ps;
    for (let i = 0; i < limit; ++i) {
	const k = path[i];
	if (!(cur.at(k) instanceof NANOS)) cur.set(k, new NANOS());
	cur = cur.at(k);
    }
    console.log('set', path, limit);
    if (mp.has('to')) cur.set(path[limit], mp.at('to'));
    else {
	if (mp.has('first')) cur.unshift(mp.at('first'));
	if (mp.has('next')) cur.push(mp.at('next'));
    }
}

export function installList () {
    getInterface('@list').set({
	final: true, lock: true, pristine: true, // singleton: true,
	handlers: {
	    at: opAt,
	    clear: d => d.ps.clear(),
	    copy: d => new NANOS().fromPairs(d.ps.pairs()),
	    entries: d => [...d.ps.entries()],
	    has: d => d.ps.has(d.mp.at(0)),
	    includes: d => d.ps.includes(d.mp.at(0)),
	    indexEntries: d => [...d.ps.indexEntries(d.mp.at(0))],
	    indexes: d => [...d.ps.indexes()],
	    keys: d => [...d.ps.keys()],
	    next: d => d.ps.next,
	    nset: opNset,
	    pairs: d => d.ps.pairs(d.mp.at(0)),
	    pop: d => d.ps.pop(),
	    self: d => d.ps,
	    set: opSet,
	    shift: d => d.ps.shift(),
	    size: d => d.ps.size,
	    toJSON: d => d.ps.toJSON(),
	    toString: d => d.ps.toString(' '),
	},
	init: (octx, pi, list) => setRO(octx, 'ps', list),
    });
}

// END
