/*
 * NANOS - Named and numbered ordered storage
 * Copyright 2024-2025 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 */

export const isIndex = key => /^(?:0|[1-9]\d*)$/.test(key);

export class NANOS {
    #next;
    #keys;
    #storage;

    constructor (...items) {
	this.clear();
	this.push(...items);
    }

    // Get value at key or index (negative index relative to end)
    at (key, defVal) {
	key = this.#wrapKey(key);
	return Object.hasOwn(this.#storage, key) ? this.#storage[key] : defVal;
    }

    clear () {
	this.#next = 0;
	this.#keys = [];
	this.#storage = {};
	return this;
    }

    // NOTE: unlike the delete statement, this returns the deleted value!
    delete (key) {
	const skey = '' + key;
	const ret = this.#storage[skey];
	if (Object.hasOwn(this.#storage, skey)) {
	    delete this.#storage[skey];
	    this.#keys = this.#keys.filter(k => k !== skey);
	}
	return ret;
    }

    /*
     * Returns [ [ key1, value1 ], ... [ keyN, valueN ] ]
     * Compact mode uses numeric index keys instead of the standard strings
     * (e.g. 0 instead of '0').
     */
    *entries (compact = false) {
	const ik = compact ? (k => isIndex(k) ? parseInt(k) : k) : (k => k);
	for (const k of this.#keys) yield [ ik(k), this.#storage[k] ];
    }

    // Returns a shallow copy of elements for which f(value, key) is true
    filter (f) {
	return new NANOS.fromEntries([...this.entries()].filter(kv => f(kv[1], kv[0], this)));
    }

    // Returns first [key, value] where f(value, key) is true; cf find, findIndex
    find (f) {
	const s = this.#storage;
	for (const k of this.#keys) if (f(s[k], k, this)) return [k, s[k]];
    }

    // Returns last [key, value] where f(value, key) is true; cf findLast, findLastIndex
    findLast (f) {
	const s = this.#storage;
	for (const k of this.#keys.toReversed()) if (f(s[k], k, this)) return [k, s[k]];
    }

    forEach (f) {
	for (const k of this.#keys) f(this.#storage[k], k, this);
    }

    // [ [ key1, value1 ], ... [ keyN, valueN ] ]
    fromEntries (entries, insert = false) {
	if (insert) for (const e of [...entries].reverse()) this.set(e[0], e[1], true);
	else for (const e of entries) this.set(e[0], e[1]);
	return this;
    }

    /*
     * [ key1, value1, ... keyN, valueN ]
     * { type: '@NANOS@', next, pairs }
     */
    fromPairs (...pairs) {
	if (pairs[0]?.type === '@NANOS@') {
	    this.fromPairs(pairs[0].pairs);
	    this.next = pairs[0].next;
	    return this;
	}
	if (Array.isArray(pairs[0])) pairs = pairs[0];
	const end = pairs.length - 1;
	for (let i = 0; i < end; i += 2) {
	    if (pairs[i] === undefined && !(i + 1 in pairs)) ++this.#next;
	    else this.set(pairs[i], pairs[i + 1]);
	}
	return this;
    }

    // Instead of "key in NANOS"
    has (key) { return Object.hasOwn(this.#storage, this.#wrapKey(key)); }

    includes (value) { return this.keyOf(value) !== undefined; }

    *indexEntries (compact = false) {
	for (const e of this.entries(compact)) if (isIndex(e[0])) yield e;
    }

    // Just the index keys
    *indexes () { for (const k of this.#keys) if (isIndex(k)) yield k; }

    // Returns first key/index with matching value, or undefined; cf indexOf
    keyOf (value) {
	return this.find(v => v === value)?.[0];
    }

    // keys iterator
    keys () { return this.#keys.values(); }

    // Returns last key/index with matchien value, or undefined; cf lastIndexOf
    lastKeyOf (value) {
	return this.findLast(v => v === value)?.[0];
    }

    // "Next" index (max index + 1); similar to array.length
    get next () { return this.#next; }
    set next (nn) {
	if (!Number.isInteger(nn) || nn < 0) return;
	for (let i = this.#next; --i >= nn; this.delete(i));
	this.#next = nn;
    }

    pairs (compact = false) { return [...this.entries(compact)].flat(1); }

    // Like Array.pop (only applies to indexed values)
    pop () {
	if (!this.#next) return undefined;
	return this.delete(--this.#next);
    }

    /*
     * When pushing an object (array, NANOS, object), named keys are set
     * directly and index keys are appended as an offset from #next
     * (therefore preserving any gaps).
     * Push [ object ] to add the actual object itself.
     */
    push (...items) {
	items.forEach(value => {
	    const base = this.#next;
	    if (value instanceof NANOS) {
		for (const e of value.entries()) {
		    if (isIndex(e[0])) this.set(base + parseInt(e[0]), e[1]);
		    else this.set(e[0], e[1]);
		}
	    } else if (typeof value === 'object') {
		for (const k of Object.keys(value)) {
		    if (isIndex(k)) this.set(base + parseInt(k), value[k]);
		    else this.set(k, value[k]);
		}
	    } else this.set(this.#next, value);
	});
	return this;
    }

    #renumber (from, to, by) {
	const move = (k, by) => {
	    if (Object.hasOwn(this.#storage, k)) {
		this.#storage[k + by] = this.#storage[k];
		delete this.#storage[k];
	    }
	};

	if (by > 0) {
	    if (to + by > this.#next) this.#next = to + by;
	    for (let k = to; --k >= from; ) move(k, by);
	} else if (by < 0) {
	    if (to >= this.#next) this.#next += by;
	    for (let k = from; k < to; ++k) move(k, by);
	}
	if (by) this.#keys = this.#keys.map(key => {
	    const ind = isIndex(key) && parseInt(key);
	    if (ind !== false && ind >= from && ind < to) return ind + by + '';
	    return key;
	});
    }

    // Reverse *in place*
    reverse () {
	const s = this.#storage, nks = [], ns = {}, last = this.#next - 1;
	for (const ok of this.#keys.toReversed()) {
	    const nk = isIndex(ok) ? (last - ok) : ok;
	    ns[nk] = s[ok];
	    nks.push(nk);
	}
	this.#storage = ns;
	this.#keys = nks;
	return this;
    }

    /*
     * If the key is undefined, the next sequential index is used.
     * New keys are added in the first (insert true) or last (insert false)
     * possible position that maintain increasing-index ordering constraints.
     */
    set (key, value, insert = false) {
	if (key === undefined) key = this.#next;
	const skey = '' + key;
	const ind = isIndex(skey) && parseInt(skey);
	if (!Object.hasOwn(this.#storage, skey)) {
	    if (insert) {
		if (ind === false || !this.#next) this.#keys.unshift(skey);
		else {
		    let ki = this.#keys.length;
		    while (ki > 0 && (!isIndex(this.#keys[ki - 1]) || ind < this.#keys[ki - 1])) --ki;
		    this.#keys.splice(ki, 0, skey);
		}
	    } else { // append
		if (ind === false || ind >= this.#next) this.#keys.push(skey);
		else {
		    let ki = 0;
		    while (ki < this.#keys.length && (!isIndex(this.#keys[ki]) || ind > this.#keys[ki])) ++ki;
		    this.#keys.splice(ki, 0, skey);
		}
	    }
	    if (ind !== false && ind >= this.#next) this.#next = ind + 1;
	}
	this.#storage[skey] = value;
	return value;
    }

    // Like Array.shift (only applies to indexed values)
    shift () {
	if (!this.#next) return undefined;
	const res = this.delete(0);
	this.#renumber(1, this.#next, -1);
	return res;
    }

    // Size of list (# of keys / indexes)
    get size () { return this.#keys.length; }

    get storage () { return this.#storage; }

    toReversed () {
	return new NANOS().fromPairs(this.toJSON()).reverse();
    }

    // Might be the best we can do
    toJSON () { return {type:'@NANOS@', next: this.#next, pairs: this.pairs(true)}; }

    toString (sep = ',') {
	const tos = v => (v instanceof NANOS) ? v.toString(sep) : (v?.toString() ?? { null: 'null', undefined: 'undefined' }[v]);
	const s = this.#storage, parts = [];
	let nextInd = 0;
	for (const k of this.#keys) {
	    if (isIndex(k)) {
		const ik = parseInt(k);
		if (ik === nextInd) parts.push(tos(s[k]));
		else parts.push(k + '=' + tos(s[k]));
		nextInd = ik + 1;
	    }
	    else parts.push(k + '=' + tos(s[k]));
	}
	return 'N[' + parts.join(sep) + ']';
    }

    /*
     * Unshift works like push, except that indexed values are offset-from-0
     * inserted instead (therefore preserving any gaps).
     */
    unshift (...items) {
	items.toReversed().forEach(value => {
	    if (value instanceof NANOS) {
		this.#renumber(0, this.#next, value.next);
		this.fromEntries(value.entries(), true);
	    } else if (typeof value === 'object') {
		const next = Array.isArray(value) ? value.length : Object.keys(value).filter(k => isIndex(k)).reduce((acc, cur) => Math.max(acc, cur), -1) + 1;
		this.#renumber(0, this.#next, next);
		this.fromEntries(Object.entries(value), true);
	    } else this.unshift([value]);
	});
	return this;
    }

    // Return a (non-sparse) iterator of *indexed* values [0..#next-1]
    *values () {
	for (let i = 0; i < this.#next; ++i) yield this.at(i);
    }

    #wrapKey (key) {
	if (/^-[1-9]\d*$/.test(key)) {
	    key = parseInt(key) + this.#next;
	    if (key < 0) return;
	}
	return key;
    }
}

export { NANOS as default };

// END
