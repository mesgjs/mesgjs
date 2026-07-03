import {
	assert,
	assertEquals,
	assertStrictEquals,
	assertThrows,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { NANOS } from "@nanos";

Deno.test("@jsObject Interface", async (t) => {
	const { $c } = globalThis;
	const { getInstance } = $c;

	const newTestObject = () => ({ a: 1, b: { c: 2 }, d: [3, 4] });

	await t.step("consistent receiver", () => {
		const o = { key: 'value' };
		assertStrictEquals($msjsReceiver(o), $msjsReceiver(o));
	});

	await t.step("(new) should return a JS object", () => {
		const testObj = $c.sm({}, 'new');
		assertEquals(typeof testObj, 'object')
		assertEquals(testObj.constructor, undefined);
	});

	await t.step("(@jsv) should return the underlying JS object", () => {
		const testObj = { y: 2 };
		const result = $c.sm(testObj, '@jsv');
		assertEquals(result, testObj);
	});

	await t.step("(at)/(get)/(@) should retrieve a value by key path", () => {
		const mo = $toMsjs(newTestObject());
		assertEquals(mo("at", ['a']), 1);
		assertEquals(mo("get", ['b', 'c']), 2);
		assertEquals(mo("@", ['d', 0]), 3);
	});

	await t.step("(set)/(=) should modify a fresh (r/w) object", () => {
		const mo = $toMsjs($c.sm({}, 'new'));
		const testObj = mo.jsv;
		mo("set", new NANOS('e', { to: 5 }));
		assertEquals(testObj.e, 5);
		mo("=", new NANOS('a', { to: 'A' }));
		assertEquals(testObj.a, 'A');
	});

	await t.step("(nset)/(==) should set multiple keys on a fresh (r/w) object", () => {
		const mo = $toMsjs($c.sm({}, 'new'));
		const testObj = mo.jsv;
		mo("nset", new NANOS({ x: 10, y: 20 }));
		assertEquals(testObj.x, 10);
		assertEquals(testObj.y, 20);
		mo("==", new NANOS({ p: 'hello', q: 'world' }));
		assertEquals(testObj.p, 'hello');
		assertEquals(testObj.q, 'world');
	});

	await t.step("(set)/(=) should throw TypeError on a BYO (r/o) object", () => {
		const byoObj = { a: 1 };
		const mo = $toMsjs(byoObj);
		assertThrows(() => mo("set", new NANOS('a', { to: 99 })), TypeError);
		assertThrows(() => mo("=",   new NANOS('a', { to: 99 })), TypeError);
	});

	await t.step("(nset)/(==) should throw TypeError on a BYO (r/o) object", () => {
		const byoObj = { a: 1 };
		const mo = $toMsjs(byoObj);
		assertThrows(() => mo("nset", new NANOS({ a: 99 })), TypeError);
		assertThrows(() => mo("==",   new NANOS({ a: 99 })), TypeError);
	});

	await t.step("(entries) should return object entries", () => {
		const testObj = { a: 1, b: 2 };
		const mo = $toMsjs(testObj);
		const entries = mo("entries");
		assertEquals(entries, [['a', 1], ['b', 2]]);
	});

	await t.step("(keys) should return object keys", () => {
		const testObj = { a: 1, b: 2 };
		const mo = $toMsjs(testObj);
		assertEquals(mo("keys"), ['a', 'b']);
	});

	await t.step("(keyIter) should return a key iterator", () => {
		const testObj = { a: 1, b: 2 };
		const mo = $toMsjs(testObj);
		const iter = mo("keyIter");
		assertEquals(iter.next().value, 'a');
		assertEquals(iter.next().value, 'b');
		assert(iter.next().done);
	});

	await t.step("(size) should return the number of keys", () => {
		const mo = $toMsjs(newTestObject());
		assertEquals(mo("size"), 3);
	});

	await t.step("(toList) should convert to a Mesgjs @list (NANOS)", () => {
		const mo = $toMsjs({ a: 1, b: 2 });
		const list = mo("toList");
		assert(list instanceof NANOS, "Result should be a NANOS instance");
		assertEquals(list.at('a'), 1);
		assertEquals(list.at('b'), 2);
	});

	await t.step("(values) should return object values", () => {
		const testObj = { a: 1, b: 2 };
		const mo = $toMsjs(testObj);
		assertEquals(mo("values"), [1, 2]);
	});
});
