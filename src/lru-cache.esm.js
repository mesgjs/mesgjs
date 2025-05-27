/*
 * LRU Cache - Subclass to use NANOS as a simple LRU cache
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 */

import { isIndex, NANOS } from 'nanos/nanos.esm.js';

export class LRUCache extends NANOS {
    #limit;

    constructor (limit) {
	super();
	this.#limit = limit;
    }

    at (key, defVal) {
	if (!this.has(key)) return defVal;
	const val = this.delete(key);
	if (isIndex(key)) this.push([val]);
	else this.set(key, val);
	return val;
    }

    get limit () { return this.#limit; }
    set limit (v) { this.#limit = v; }

    set (key, value, insert) {
	super.set(key, value, insert);
	while (this.size > this.#limit) this.delete(this.keys().next().value);
    }
}

// END
