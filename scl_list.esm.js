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

function opAtInit (d) {
    const { octx, mp } = d, list = mp.at(0);
    setRO(octx, 'js', (list instanceof NANOS) ? list : new NANOS());
}

function opAt (d) {
    const { mp } = d;
    let cur = d.js;
    for (const k of mp.values()) {
	if (cur.has(k)) cur = unifiedList(cur.at(k));
	else if (mp.has('else')) return runIfCode(mp.at('else'));
	else throw new Error('Key path not found');
    }
    return cur;
}

function opNset (d) {
    const { mp, js } = d;
    for (const e of mp.entries()) js.set(e[0], e[1]);
}

function opSet (d) {
    // Supported key type
    const skt = k => { const t = typeof k; return t === 'string' || t === 'number' || t === 'symbol'; };
    const { mp } = d, path = [...mp.values()].filter(k => skt(k)), limit = path.length - (mp.has('to') ? 1 : 0);
    let cur = d.js;
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
	/* final: true, */ lock: true, pristine: true, // singleton: true,
	handlers: {
	    '@init': opAtInit,
	    at: opAt,
	    clear: d => d.js.clear(),
	    copy: d => new NANOS().fromPairs(d.js.pairs()),
	    entries: d => [...d.js.entries()],
	    has: d => d.js.has(d.mp.at(0)),
	    includes: d => d.js.includes(d.mp.at(0)),
	    indexEntries: d => [...d.js.indexEntries(d.mp.at(0))],
	    indexes: d => [...d.js.indexes()],
	    keys: d => [...d.js.keys()],
	    next: d => d.js.next,
	    nset: opNset,
	    pairs: d => d.js.pairs(d.mp.at(0)),
	    pop: d => d.js.pop(),
	    push: d => d.js.push(d.mp),
	    pushFirst: d => d.js.push(d.mp.at(0)),
	    self: d => d.js,
	    set: opSet,
	    shift: d => d.js.shift(),
	    size: d => d.js.size,
	    toJSON: d => d.js.toJSON(),
	    toString: d => d.js.toString(' '),
	    unshift: d => d.js.unshift(d.mp),
	},
    });
}

// END
