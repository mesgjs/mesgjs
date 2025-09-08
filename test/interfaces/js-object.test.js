import {
    assert,
    assertEquals,
    assertStrictEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { NANOS } from "../../src/runtime/vendor.esm.js";

Deno.test("@jsObject Interface", async (t) => {
    const { $c } = globalThis;
    const { getInstance } = $c;

    const newTestObject = () => ({ a: 1, b: { c: 2 }, d: [3, 4] });

    await t.step("consistent instances", () => {
	const o = { key: 'value' };
	assertStrictEquals($toMsjs(o), $toMsjs(o));
    });

    await t.step("(@init) should initialize with a JS object", () => {
	const testObj = { x: 1 };
	const mo = $c.getInstance('@jsObject', [testObj]);
	assertEquals(mo('@jsv'), testObj);
    });

    await t.step("(@jsv) should return the underlying JS object", () => {
	const testObj = { y: 2 };
	const mo = $c.getInstance('@jsObject', [testObj]);
	assertEquals(mo('@jsv'), testObj);
    });

    await t.step("(at)/(get)/(@) should retrieve a value by key path", () => {
	const mo = $c.getInstance('@jsObject', [newTestObject()]);
	assertEquals(mo("at", ['a']), 1);
	assertEquals(mo("get", ['b', 'c']), 2);
	assertEquals(mo("@", ['d', 0]), 3);
    });

    await t.step("(set)/(=) should modify a value by key", () => {
	const testObj = newTestObject();
	const mo = $c.getInstance('@jsObject', [testObj]);
	mo("set", new NANOS('e', { to: 5 }));
	assertEquals(testObj.e, 5);
	mo("=", new NANOS('a', { to: 'A' }));
	assertEquals(testObj.a, 'A');
    });

    await t.step("(entries) should return object entries", () => {
	const testObj = { a: 1, b: 2 };
	const mo = $c.getInstance('@jsObject', [testObj]);
	const entries = mo("entries");
	assertEquals(entries, [['a', 1], ['b', 2]]);
    });

    await t.step("(keys) should return object keys", () => {
	const testObj = { a: 1, b: 2 };
	const mo = $c.getInstance('@jsObject', [testObj]);
	assertEquals(mo("keys"), ['a', 'b']);
    });

    await t.step("(keyIter) should return a key iterator", () => {
	const testObj = { a: 1, b: 2 };
	const mo = $c.getInstance('@jsObject', [testObj]);
	const iter = mo("keyIter");
	assertEquals(iter.next().value, 'a');
	assertEquals(iter.next().value, 'b');
	assert(iter.next().done);
    });

    await t.step("(size) should return the number of keys", () => {
	const mo = $c.getInstance('@jsObject', [newTestObject()]);
	assertEquals(mo("size"), 3);
    });

    await t.step("(toList) should convert to a Mesgjs @list (NANOS)", () => {
	const mo = $c.getInstance('@jsObject', [{ a: 1, b: 2 }]);
	const list = mo("toList");
	assert(list instanceof NANOS, "Result should be a NANOS instance");
	assertEquals(list.at('a'), 1);
	assertEquals(list.at('b'), 2);
    });

    await t.step("(values) should return object values", () => {
	const testObj = { a: 1, b: 2 };
	const mo = $c.getInstance('@jsObject', [testObj]);
	assertEquals(mo("values"), [1, 2]);
    });
});
