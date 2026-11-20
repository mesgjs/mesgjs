import { describe, it } from '@compat/test';
import { assert, assertStrictEquals, assertThrows } from '@std/assert';
import { NANOS } from '@nanos';
import { listFromPairs, namespaceAt } from '../../src/runtime/runtime.esm.js';

describe('listFromPairs', () => {
	it('should create a NANOS list from pairs array', () => {
		const pairs = ['a', 1, /**/, /**/, /**/, 'b', 'c', 2];
		const list = listFromPairs(pairs);
		assert(list instanceof NANOS);
		assertStrictEquals(list.at('a'), 1);
		assertStrictEquals(list.has(0), false);
		assertStrictEquals(list.has('0'), false);
		assertStrictEquals(list.at(1), 'b');
		assertStrictEquals(list.at('1'), 'b');
		assertStrictEquals(list.at('c'), 2);
	});
});

describe('namespaceAt', () => {
	const namespace = new NANOS({ a: 1, b: 2 });

	it('should retrieve a value from a namespace', () => {
		assertStrictEquals(namespaceAt(namespace, 'a'), 1);
	});

	it('should throw a ReferenceError for a missing required key', () => {
		assertThrows(
			() => namespaceAt(namespace, 'c'),
			ReferenceError,
			'Required key "c" not found'
		);
	});

	it('should return undefined for a missing optional key', () => {
		assertStrictEquals(namespaceAt(namespace, 'c', true), undefined);
	});
});
