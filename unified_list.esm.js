/*
 * SysCL Unified List Interface
 *
 * A minimalist universal interface to support passing JS arrays, plain
 * objects, and other native JS values as message parameter lists.
 * NANOS is the reference interface.
 *
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 */

import { NANOS, isIndex } from 'syscl/nanos.esm.js';
export { NANOS, isIndex };

const noKey = Symbol();

class Proxy {
    constructor (list) {
	this._list = list;
    }

    // Get value for key
    at (k) { return this._list[this.wrapIndex(k)]; }

    // Return [key, value] pairs
    entries () { return Object.entries(this._list); }

    // Return with a key is present
    has (k) { return Object.hasOwn(this._list, this.wrapIndex(k)); }

    // Return only the index entries
    indexEntries () {
	return this.entries().filter(e => isIndex(e[0]));
    }

    // Return only the index keys
    indexes () { return Object.keys(this._list).filter(k => isIndex(k)); }

    // Return all the keys
    keys () { return Object.keys(this._list); }

    // Return the size of the list (= # of keys)
    size () {
	if (this._size === undefined) this._size = this.keys().length;
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
    get next () { return this._list.length; }
}

class ObjectProxy extends Proxy {
    get next () {
	if (this._next === undefined) this._next = this.indexes().reduce((acc, cur) => Math.max(acc, cur), -1) + 1;
	return this._next;
    }
}

const emptyList = new ArrayProxy([]);

export function unifiedList (list) {
    if (list instanceof NANOS) return list;
    if (Array.isArray(list)) return new ArrayProxy(list);
    if (typeof list === 'object' && list !== null) return new ObjectProxy(list);
    if (list === undefined) return emptyList;
    return new ArrayProxy([ list ]);
}

// END
