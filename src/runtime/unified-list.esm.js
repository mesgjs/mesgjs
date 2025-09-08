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

import { NANOS, isIndex, isNegIndex } from './vendor.esm.js';

export const isPlainObject = (obj) => {
    const type = typeof obj, consName = obj?.constructor?.name;
    return (type === 'object' && obj !== null && (consName === undefined || consName === 'Object'));
};

/**
 * Traverse mixed-type object structures.
 * @param {object} [opts] Options
 * @param {*} [opts.default] Default return value if next key is not present
 * @param {*} [opts.defaultFn] Default return-value function if next key is not present
 * @param {boolean} [opts.wrap] Wrap around negative index keys
 */
export const uniAt = (obj, keyPath, opts = {}) => {
    const defFn = (typeof opts?.defaultFn === 'function') ? opts.defaultFn : (() => opts.default);
    keyPath = unifiedList(keyPath, true);
    for (let key of keyPath.values()) {
	if (obj?.msjsType && obj.jsv) obj = obj.jsv;
	if (opts.wrap) key = wrapKey(obj, key);
	if (!uniHas(obj, key)) return defFn();
	if (obj instanceof NANOS) obj = obj.at(key, { raw: opts.raw });
	else if (obj instanceof Map) obj = obj.get(key);
	else if (isPlainObject(obj) || Array.isArray(obj)) obj = obj[key];
	else if (obj instanceof Set) obj = true;
	else return defFn();
    }
    return obj;
};

// Does the object have the specified key?
export const uniHas = (obj, key) => {
    if (obj?.msjsType && obj.jsv) obj = obj.jsv;
    if (obj instanceof NANOS || obj instanceof Map || obj instanceof Set) return obj.has(key);
    if (isPlainObject(obj) || Array.isArray(obj)) return Object.hasOwn(obj, key);
    // Unknown/undefined for unsupported types
};

// Return the next-index for map-ish values
export const uniNext = (obj) => {
    if (obj instanceof NANOS) return obj.next;
    if (Array.isArray(obj)) return obj.length;
    let keys;
    if (isPlainObject(obj)) keys = Object.keys(obj);
    else if (obj instanceof Map) keys = obj.keys();
    if (keys) {
	const next = keys.filter(isIndex).reduce((acc, cur) => Math.max(acc, parseInt(cur, 10)), -1) + 1;
	return next;
    }
};

// Wrap negative index keys relative to the object's "next"
export const wrapKey = (obj, key) => {
    if (!isNegIndex(key)) return key;
    const newKey = uniNext(obj) + parseInt(key, 10);
    return ((newKey >= 0) ? newKey : undefined);
};

class ListProxy {
    constructor (list) {
	this._list = list;
    }

    // Get value for key
    at (key, def) {
	return uniAt(this._list, key, { default: def, wrap: true });
    }

    // Iterates over all the key/value entries
    entries () {
	const list = this._list;
	if (list instanceof NANOS || list instanceof Map || list instanceof Set) return list.entries();
	if (isPlainObject(list) || Array.isArray(list)) return Object.entries(list).values();
	return [].entries();
    }

    // Alias for at
    get (key, def) { return this.at(key, def); }

    // Return with a key is present
    has (key) { return uniHas(this._list, key); }

    // Iterates over index entries
    *indexEntries () {
	for (const kv of this.entries()) if (isIndex(kv[0])) yield kv;
    }

    // Iterates over index keys
    *indexes () {
	for (const kv of this.entries()) if (isIndex(kv[0])) yield kv[0];
    }

    // Iterates over all keys
    *keys () {
	for (const kv of this.entries()) yield kv[0];
    }

    // Iterates over named entries
    *namedEntries () {
	for (const kv of this.entries()) if (!isIndex(kv[0])) yield kv;
    }

    // Return the next-index key
    get next () {
	return uniNext(this._list);
    }

    // Return the size of the list (= # of keys)
    get size () {
	const list = this._list;
	if (list instanceof NANOS || list instanceof Map || list instanceof Set) return list.size;
	return [...this.entries()].length;
    }

    // Iterate over *positional* values
    *values () {
	for (const kv of this.entries()) if (isIndex(kv[0])) yield kv[1];
    }
}

const emptyList = new ListProxy([]);

export function unifiedList (value, promote) {
    if (value instanceof NANOS || value instanceof ListProxy) return value;
    if (isPlainObject(value) || Array.isArray(value) || value instanceof Map || value instanceof Set) return new ListProxy(value);
    if (Array.isArray(value)) return new ListProxy(value);
    if (typeof value === 'object' && value !== null) return new ListProxy(value);
    if (!promote) return value;
    if (value === undefined) return emptyList;
    return new ListProxy([ value ]);
}

// END
