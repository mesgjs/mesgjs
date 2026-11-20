import { describe, it } from '@compat/test';
import { assert, assertEquals, assertNotStrictEquals, assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';

describe('@js-array Interface', () => {
	const { NANOS, $toMsjs, $msjsReceiver } = globalThis;

	it('consistent receiver', () => {
		const a = [1];
		assertStrictEquals($msjsReceiver(a), $msjsReceiver(a));
	});

	it('(at)/(get)/(@) should retrieve a value by index', () => {
		const ma = $toMsjs(['a', 'b', 'c']);
		assertStrictEquals(ma('at', [1]), 'b');
		assertStrictEquals(ma('get', [2]), 'c');
		assertStrictEquals(ma('@', [0]), 'a');
	});

	it('(set)/(=) should modify a value by index', () => {
		const testArray = ['a', 'b', 'c'];
		const ma = $toMsjs(testArray);
		ma('set', new NANOS(1, { to: 'B' }));
		assertStrictEquals(testArray[1], 'B');
		ma('=', new NANOS(2, { to: 'C' }));
		assertStrictEquals(testArray[2], 'C');
	});

	it('length/size should return the array length', () => {
		const ma = $toMsjs([1, 2, 3, 4]);
		assertStrictEquals(ma('length'), 4);
		assertStrictEquals(ma('size'), 4);
	});

	it('pop/push/shift/unshift should mirror array methods', () => {
		const testArray = [1, 2, 3];
		const ma = $toMsjs(testArray);
		assertStrictEquals(ma('pop'), 3);
		assertEquals(testArray, [1, 2]);
		ma('push', [3, 4]);
		assertEquals(testArray, [1, 2, 3, 4]);
		assertStrictEquals(ma('shift'), 1);
		assertEquals(testArray, [2, 3, 4]);
		ma('unshift', [0, 1]);
		assertEquals(testArray, [0, 1, 2, 3, 4]);
	});

	it('should create new arrays for concat, flat, slice, etc.', () => {
		const testArray = [1, [2, 3]];
		const ma = $toMsjs(testArray);

		const concatenated = ma('concat', [[4, 5]]);
		assertNotStrictEquals(concatenated, testArray);
		assertEquals(concatenated, [1, [2, 3], 4, 5]);

		const flattened = ma('flat');
		assertEquals(flattened, [1, 2, 3]);

		const sliced = ma('slice', [1]);
		assertEquals(sliced, [[2, 3]]);
	});

	it('toList should convert to a Mesgjs @list (NANOS)', () => {
		const ma = $toMsjs(['a', 'b']);
		const list = ma('toList');
		assert(list instanceof NANOS, 'Result should be a NANOS instance');
		assertStrictEquals(list.at('0'), 'a');
		assertStrictEquals(list.at('1'), 'b');
	});
});
