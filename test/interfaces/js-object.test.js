import { describe, it } from '@compat/test';
import { assert, assertEquals, assertStrictEquals, assertThrows } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { NANOS } from '@nanos';

describe('@jsObject Interface', () => {
	const { $c, $msjsReceiver, $toMsjs } = globalThis;

	const newTestObject = () => ({ a: 1, b: { c: 2 }, d: [3, 4] });

	it('consistent receiver', () => {
		const o = { key: 'value' };
		assertStrictEquals($msjsReceiver(o), $msjsReceiver(o));
	});

	it('(new) should return a JS object', () => {
		const testObj = $c.sm({}, 'new');
		assertStrictEquals(typeof testObj, 'object');
		assertStrictEquals(testObj.constructor, undefined);
	});

	it('(@jsv) should return the underlying JS object', () => {
		const testObj = { y: 2 };
		const result = $c.sm(testObj, '@jsv');
		assertStrictEquals(result, testObj);
	});

	it('(at)/(get)/(@) should retrieve a value by key path', () => {
		const mo = $toMsjs(newTestObject());
		assertStrictEquals(mo('at', ['a']), 1);
		assertStrictEquals(mo('get', ['b', 'c']), 2);
		assertStrictEquals(mo('@', ['d', 0]), 3);
	});

	it('(set)/(=) should modify a fresh (r/w) object', () => {
		const mo = $toMsjs($c.sm({}, 'new'));
		const testObj = mo.jsv;
		mo('set', new NANOS('e', { to: 5 }));
		assertStrictEquals(testObj.e, 5);
		mo('=', new NANOS('a', { to: 'A' }));
		assertStrictEquals(testObj.a, 'A');
	});

	it('(nset)/(==) should set multiple keys on a fresh (r/w) object', () => {
		const mo = $toMsjs($c.sm({}, 'new'));
		const testObj = mo.jsv;
		mo('nset', new NANOS({ x: 10, y: 20 }));
		assertStrictEquals(testObj.x, 10);
		assertStrictEquals(testObj.y, 20);
		mo('==', new NANOS({ p: 'hello', q: 'world' }));
		assertStrictEquals(testObj.p, 'hello');
		assertStrictEquals(testObj.q, 'world');
	});

	it('(set)/(=) should throw TypeError on a BYO (r/o) object', () => {
		const byoObj = { a: 1 };
		const mo = $toMsjs(byoObj);
		assertThrows(() => mo('set', new NANOS('a', { to: 99 })), TypeError);
		assertThrows(() => mo('=',   new NANOS('a', { to: 99 })), TypeError);
	});

	it('(nset)/(==) should throw TypeError on a BYO (r/o) object', () => {
		const byoObj = { a: 1 };
		const mo = $toMsjs(byoObj);
		assertThrows(() => mo('nset', new NANOS({ a: 99 })), TypeError);
		assertThrows(() => mo('==',   new NANOS({ a: 99 })), TypeError);
	});

	it('(entries) should return object entries', () => {
		const testObj = { a: 1, b: 2 };
		const mo = $toMsjs(testObj);
		const entries = mo('entries');
		assertEquals(entries, [['a', 1], ['b', 2]]);
	});

	it('(keys) should return object keys', () => {
		const testObj = { a: 1, b: 2 };
		const mo = $toMsjs(testObj);
		assertEquals(mo('keys'), ['a', 'b']);
	});

	it('(keyIter) should return a key iterator', () => {
		const testObj = { a: 1, b: 2 };
		const mo = $toMsjs(testObj);
		const iter = mo('keyIter');
		assertStrictEquals(iter.next().value, 'a');
		assertStrictEquals(iter.next().value, 'b');
		assert(iter.next().done);
	});

	it('(size) should return the number of keys', () => {
		const mo = $toMsjs(newTestObject());
		assertStrictEquals(mo('size'), 3);
	});

	it('(toList) should convert to a Mesgjs @list (NANOS)', () => {
		const mo = $toMsjs({ a: 1, b: 2 });
		const list = mo('toList');
		assert(list instanceof NANOS, 'Result should be a NANOS instance');
		assertStrictEquals(list.at('a'), 1);
		assertStrictEquals(list.at('b'), 2);
	});

	it('(values) should return object values', () => {
		const testObj = { a: 1, b: 2 };
		const mo = $toMsjs(testObj);
		assertEquals(mo('values'), [1, 2]);
	});
});
