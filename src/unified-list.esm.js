/*
 * Mesgjs Unified List Interface
 *
 * A minimalist universal interface to support passing JS arrays, plain
 * objects, and other native JS values as message parameter lists with
 * consistent semantics. NANOS is the reference interface.
 *
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 */

import { NANOS, isIndex } from 'nanos/nanos.esm.js';
export { NANOS, isIndex };

const noKey = Symbol();

class Proxy {
    constructor (list) {
	this._list = list;
    }

    // Get value for key
    at (k, def) {
	k = this.wrapIndex(k);
	return Object.hasOwn(this._list, k) ? this._list[k] : def;
    }

    // Alias for at
    get (k, def) { return this.at(k, def); }

    // Return with a key is present
    has (k) { return Object.hasOwn(this._list, this.wrapIndex(k)); }

    // Return only the index entries
    *indexEntries () {
	for (const e of this.entries()) if (isIndex(e[0])) yield e;
    }

    // Return only the index keys
    *indexes () { for (const k of this.keys()) if (isIndex(k)) yield k; }

    // Return the size of the list (= # of keys)
    get size () {
	if (this._size === undefined) this._size = Object.keys(this._list).length;
	return this._size;
    }

    wrapIndex (k) {
	if (/^-[1-9]\d*$/.test(k)) {
	    k = parseInt(k) + this.next;
	    if (k < 0) return noKey;
	}
	return k;
    }
}

class ArrayProxy extends Proxy {
    *entries () { for (const k of this.keys()) yield [ k, this._list[k] ]; }
    indexEntries () { return this._list.entries(); }
    keys () { return Object.keys(this._list).values(); }
    get next () { return this._list.length; }
    values () { return this._list.values(); }
}

class ObjectProxy extends Proxy {
    entries () { return Object.entries(this._list).values(); }
    keys () { return Object.keys(this._list).values(); }
    get next () {
	if (this._next === undefined) this._next = this.indexes().reduce((acc, cur) => Math.max(acc, cur), -1) + 1;
	return this._next;
    }
    *values () {		// NB: *indexed* values
	for (let i = 0; i < this.next; ++i) yield this.at(i);
    }
}

const emptyList = new ArrayProxy([]);

export function unifiedList (list, promote) {
    for (const type of [NANOS, ArrayProxy, ObjectProxy]) if (list instanceof type) return list;
    if (Array.isArray(list)) return new ArrayProxy(list);
    if (typeof list === 'object' && list !== null) return new ObjectProxy(list);
    if (!promote) return list;
    if (list === undefined) return emptyList;
    return new ArrayProxy([ list ]);
}

// END
