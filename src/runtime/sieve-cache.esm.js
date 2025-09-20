/*
 * SIEVE Cache Implementation
 * (with option to pin additional entries)
 * Authors: Chat GPT and Brian Katzung
 */

export class SieveEntry {
	constructor (key, value) {
		this.key = key;
		this.value = value;
		this.ref = false;
		this.next = null;
	}
}

export class SieveCache {
	constructor (capacity = 256) {
		this.capacity = capacity;
		this.map = new Map();	// key -> entry
		this.hand = null;		// eviction pointer
		this.size = 0;
	}

	clear () {
		this.map.clear();
		this.hand = null;
		this.size = 0;
	}

	_evictAndInsert (newEntry) {
		let scanned = 0;
		while (scanned < this.capacity) {
			const candidate = this.hand.next;
			if (!candidate.ref) {
				// Evict
				this.map.delete(candidate.key);
				newEntry.next = candidate.next;
				this.hand.next = newEntry;
				// Replace candidate
				return;
			} else {
				candidate.ref = false;
				this.hand = candidate;
				scanned++;
			}
		}

		// All were recently used - replace next anyway (fallback policy)
		const fallback = this.hand.next;
		this.map.delete(fallback.key);
		newEntry.next = fallback.next;
		this.hand.next = newEntry;
	}

	get (key) {
		const entry = this.map.get(key);
		if (entry) {
			entry.ref = true;
			return entry.value;
		}
	}

	has (key) { return this.map.has(key); }

	_insert (entry) {
		if (!this.hand) {
			entry.next = entry;
			this.hand = entry;
		} else {
			entry.next = this.hand.next;
			this.hand.next = entry;
		}
	}

	// Keys iterator
	keys () { return this.map.keys(); }

	set (key, value, pinned = false) {
		let entry = this.map.get(key);

		if (entry) {
			entry.value = value;
			entry.ref = true;
			return;
		}

		entry = new SieveEntry(key, value);

		if (!pinned) {
			// Pinned entries aren't counted and will never be evicted
			if (this.size < this.capacity) {
				this._insert(entry);
				this.size++;
			} else {
				this._evictAndInsert(entry);
			}
		}

		this.map.set(key, entry);
	}
}

export { SieveCache as default };

// END
