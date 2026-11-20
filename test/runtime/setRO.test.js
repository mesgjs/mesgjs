import { describe, it } from '@compat/test';
import { assertStrictEquals, assertThrows } from '@std/assert';
import { setRO } from '../../src/runtime/runtime.esm.js';

describe('setRO', () => {
	it('should set a single read-only property', () => {
		const obj = {};
		setRO(obj, 'a', 1);
		assertStrictEquals(obj.a, 1);
		assertThrows(() => (obj.a = 2), TypeError);
	});

	it('should set multiple read-only properties from a map', () => {
		const obj = {};
		setRO(obj, { b: 2, c: 3 });
		assertStrictEquals(obj.b, 2);
		assertStrictEquals(obj.c, 3);
		assertThrows(() => (obj.b = 99), TypeError);
		assertThrows(() => (obj.c = 99), TypeError);
	});

	it('should respect the enumerable flag', () => {
		const objVisible = {};
		setRO(objVisible, 'a', 1, true);
		assertStrictEquals(Object.keys(objVisible).includes('a'), true);

		const objHidden = {};
		setRO(objHidden, 'a', 1, false);
		assertStrictEquals(Object.keys(objHidden).includes('a'), false);
	});

	it('should respect the enumerable flag with map syntax', () => {
		const objVisible = {};
		setRO(objVisible, { a: 1 }, true);
		assertStrictEquals(Object.keys(objVisible).includes('a'), true);

		const objHidden = {};
		setRO(objHidden, { a: 1 }, false);
		assertStrictEquals(Object.keys(objHidden).includes('a'), false);
	});
});
