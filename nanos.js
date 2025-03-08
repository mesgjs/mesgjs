// Named and numbered ordered storage
class NANOS {
    #next;
    #keys;
    #storage;

    constructor (...items) {
	this.clear();
	this.push(...items);
    }

    // Get value at key or index (negative index relative to end)
    at (key) {
	if (/^-[1-9]\d*$/.test(key)) {
	    key = parseInt(key) + this.#next;
	    if (key < 0) return undefined;
	}
	return this.#storage[key];
    }

    clear () {
	this.#next = 0;
	this.#keys = [];
	this.#storage = {};
	return this;
    }

    // NOTE: returns deleted value!
    delete (key) {
	const skey = '' + key;
	const ret = this.#storage[skey];
	if (Object.hasOwn(this.#storage, skey)) {
	    delete this.#storage[skey];
	    this.#keys = this.#keys.filter(k => k !== skey);
	}
	return ret;
    }

    // Returns [ [ key1, value1 ], ... [ keyN, valueN ] ]
    entries () {
	const ik = k => this.#isIndex(k) ? parseInt(k) : k;
	return this.#keys.map(key => [ ik(key), this.#storage[key] ]);
    }

    // Returns a shallow copy of elements for which f(value, key) is true
    filter (f) {
	return new NANOS.fromEntries(this.entries.filter(kv => f(kv[1], kv[0], this)));
    }

    // Returns first [key, value] where f(value, key) is true; cf find, findIndex
    find (f) {
	const s = this.#storage;
	for (const key of this.#keys) if (f(s[key], key, this)) return [key, s[key]];
    }

    // Returns last [key, value] where f(value, key) is true; cf findLast, findLastIndex
    findLast (f) {
	const s = this.#storage;
	for (const key of this.#keys.toReversed()) if (f(s[key], key, this)) return [key, s[key]];
    }

    forEach (f) {
	for (const key of this.#keys) f(this.#storage[key], key, this);
    }

    // [ [ key1, value1 ], ... [ keyN, valueN ] ]
    fromEntries (entries) {
	for (let i = 0; i < end; ++i) this.set(entries[i][0], entries[i][1]);
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
    hasKey (key) { return this.#keys.includes(key); }

    includes (value) { return this.keyOf(value) !== undefined; }

    #isIndex (key) { return /^(?:0|[1-9]\d*)$/.test(key); }

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

    pairs () { return [...this.entries()].flat(1); }

    // Like Array.pop (only applies to indexed values)
    pop () {
	if (!this.#next) return undefined;
	return this.delete(--this.#next);
    }

    /*
     * Pushing an array appends the values, preserving any gaps in between.
     * Pushing an object adds the keys and values.
     * Push [ array ] or [ object ] to add the actual array or object.
     */
    push (...items) {
	items.forEach(value => {
	    if (Array.isArray(value)) {
		let base = this.#next;
		for (const k of Object.keys(value)) if (this.#isIndex(k)) this.set(base + parseInt(k), value[k]);
	    } else if (typeof value === 'object') for (const key of Object.keys(value)) this.set(key, value[key]);
	    else this.set(this.#next, value);
	});
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
	    const ind = this.#isIndex(key) && parseInt(key);
	    if (ind !== false && ind >= from && ind < to) return ind + by + '';
	    return key;
	});
    }

    // Reverse *in place*
    reverse () {
	const s = this.#storage, nks = [], ns = {}, last = this.#next - 1;
	for (const ok of this.#keys.toReversed()) {
	    const nk = this.#isIndex(ok) ? (last - ok) : ok;
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
	const ind = this.#isIndex(skey) && parseInt(skey);
	if (!Object.hasOwn(this.#storage, skey)) {
	    if (insert) {
		if (ind === false || !this.#next) this.#keys.unshift(skey);
		else {
		    let ki = this.#keys.length;
		    while (ki > 0 && (!this.#isIndex(this.#keys[ki - 1]) || ind < this.#keys[ki - 1])) --ki;
		    this.#keys.splice(ki, 0, skey);
		}
	    } else { // append
		if (ind === false || ind >= this.#next) this.#keys.push(skey);
		else {
		    let ki = 0;
		    while (ki < this.#keys.length && (!this.#isIndex(this.#keys[ki]) || ind > this.#keys[ki])) ++ki;
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
    toJSON () { return {type:'@NANOS@', next: this.#next, pairs: this.pairs()}; }

    toString (sep = ',') {
	const tos = v => v?.toString() ?? { null: 'null', undefined: 'undefined' }[v];
	const s = this.#storage, parts = [];
	for (const key of this.#keys) {
	    if (this.#isIndex(key)) parts.push(tos(s[key]));
	    else parts.push(key + '=' + tos(s[key]));
	}
	return 'N[' + parts.join(sep) + ']';
    }

    // See push re: handling of items
    unshift (...items) {
	items.toReversed().forEach(value => {
	    if (Array.isArray(value)) {
		this.#renumber(0, this.#next, value.length);
		for (const k of Object.keys(value).reverse()) if (this.#isIndex(k)) this.set(k, value[k], true);
	    } else if (typeof value === 'object') for (const key of Object.keys(value).reverse()) this.set(key, value[key], true);
	    else this.unshift([value]);
	});
    }
}

// END
