import { describe, it } from '@compat/test';
import { assertEquals, assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { listFromPairs as ls } from '../../src/runtime/runtime.esm.js';

describe('@map Interface', () => {
	const { $c, $msjsReceiver } = globalThis;

	const newMap = (initialEntries) => {
		return new Map(initialEntries);
	};

	it('consistent receivers', () => {
		const m = new Map();
		assertStrictEquals($msjsReceiver(m), $msjsReceiver(m));
	});

	it('should get, set, has, and delete entries', () => {
		const map = newMap([['key1', 'value1']]);

		assertStrictEquals($c.sm(map, 'has', ls([,'key1'])), true);
		assertStrictEquals($c.sm(map, 'get', ls([,'key1'])), 'value1');

		$c.sm(map, 'set', ls([,'key2', ,'value2']));
		assertStrictEquals($c.sm(map, 'get', ls([,'key2'])), 'value2');

		assertStrictEquals($c.sm(map, 'delete', ls([,'key1'])), true);
		assertStrictEquals($c.sm(map, 'has', ls([,'key1'])), false);
	});

	it('size should return the number of entries', () => {
		const map = newMap([['a', 1], ['b', 2]]);
		assertStrictEquals($c.sm(map, 'size'), 2);
	});

	it('clear should remove all entries', () => {
		const map = newMap([['a', 1], ['b', 2]]);
		$c.sm(map, 'clear');
		assertStrictEquals($c.sm(map, 'size'), 0);
	});

	it('entries, keys, and values should return correct lists', () => {
		const map = newMap([['a', 1], ['b', 2]]);

		const entries = $c.sm(map, 'entries');
		assertEquals(entries.at(0), ['a', 1]);
		assertEquals(entries.at(1), ['b', 2]);

		const keys = $c.sm(map, 'keys');
		assertStrictEquals(keys.at(0), 'a');
		assertStrictEquals(keys.at(1), 'b');

		const values = $c.sm(map, 'values');
		assertStrictEquals(values.at(0), 1);
		assertStrictEquals(values.at(1), 2);
	});
});
