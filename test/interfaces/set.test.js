import { describe, it } from '@compat/test';
import { assertEquals, assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';

describe('@set Interface', () => {
	const { $c, $msjsReceiver } = globalThis;
	const mSet = new Set([1, 'hello']);

	it('Consistent Receivers', () => {
		const set = new Set();
		assertStrictEquals($msjsReceiver(set), $msjsReceiver(set));
	});

	it('Initialization and State', () => {
		assertStrictEquals($msjsReceiver(mSet).msjsType, '@set');
		assertStrictEquals($c.sm(mSet, 'size'), 2);
		assertStrictEquals($c.sm(mSet, 'has', 1), true);
		assertStrictEquals($c.sm(mSet, 'has', 'world'), false);
	});

	it('Manipulation', () => {
		assertStrictEquals($c.sm(mSet, 'delete', 2), false);
		assertStrictEquals($c.sm(mSet, 'delete', 1), true);
		assertStrictEquals($c.sm(mSet, 'size'), 1);
		$c.sm(mSet, 'clear');
		assertStrictEquals($c.sm(mSet, 'size'), 0);
	});

	it('Iteration', () => {
		$c.sm(mSet, 'add', 1);
		$c.sm(mSet, 'add', 2);
		$c.sm(mSet, 'add', 3);
		const keys = $c.sm(mSet, 'keys');
		assertStrictEquals(keys.length, 3);
		assertStrictEquals(keys[0], 1);
		const values = $c.sm(mSet, 'values');
		assertStrictEquals(values[2], 3);
		const entries = $c.sm(mSet, 'entries');
		assertEquals(entries[0], [1, 1]);
	});
});
