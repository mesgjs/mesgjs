import {
	assert,
	assertEquals,
	assertStrictEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { listFromPairs as ls } from "../../src/runtime/runtime.esm.js";

Deno.test("@list Interface", async (t) => {
	const { $c, $toMsjs, NANOS } = globalThis;
	const { getInstance } = $c;

	const newList = (initParams = ls()) => $c("get", ls([, '@list', "init", ls([, initParams])]));

	await t.step("consistent instances", () => {
		const n = new NANOS().deepFreeze();
		assertStrictEquals($toMsjs(n), $toMsjs(n));
	});

	await t.step("consistent JS value of @list", () => {
		// It should also be the one we supply when we supply one
		const n = new NANOS();
		const l = getInstance('@list', [n]);
		assertStrictEquals(n, l('@jsv'), "(@jsv)");
		assertStrictEquals(n, l.jsv, ".jsv");
		assertStrictEquals(n, l.valueOf(), ".valueOf()");
	});

	await t.step("should initialize and retrieve values with (at)", () => {
		const list = newList(ls([,"a",,"b"])); // [0]: "a", [1]: "b"
		assertEquals(list("at", ls([,0])), "a");
		assertEquals(list("at", ls([,1])), "b");
	});

	await t.step("should set values with (set)", () => {
		const list = newList(ls([,"a",,"b"]));
		list("set", ls([,1, "to", "B"]));
		assertEquals(list("at", ls([,1])), "B");
	});

	await t.step("(set) should auto-nest lists", () => {
		const list = newList();
		list("set", ls([,"key1", ,"key2", "to", "value"]));
		const nested = list("at", ls([,"key1"]));
		assert(nested instanceof globalThis.NANOS, "Should have created a nested list");
		assertEquals(nested.at('key2'), 'value');
	});

	await t.step("(set) with 'first' should unshift into a nested list", () => {
		const list = newList(ls(["key1", ls([,"a"])]));
		list("set", ls([,"key1", "first", "z"]));
		const nested = list("at", ls([,"key1"]));
		assertEquals(nested.at(0), 'z');
		assertEquals(nested.at(1), 'a');
	});

	await t.step("(set) with 'next' should push into a nested list", () => {
		const list = newList(ls(["key1", ls([,"a"])]));
		list("set", ls([,"key1", "next", "z"]));
		const nested = list("at", ls([,"key1"]));
		assertEquals(nested.at(0), 'a');
		assertEquals(nested.at(1), 'z');
	});

	await t.step("should handle named values with (nset)", () => {
		const list = newList();
		list("nset", ls(["key1", "value1", "key2", "value2"]));
		assertEquals(list("at", ls([,"key1"])), "value1");
		assertEquals(list("size"), 2);
	});

	await t.step("(push) should add elements to the end", () => {
		const list = newList(ls([,"a"]));
		list("push", ls([,"b",,"c"]));
		assertEquals(list("at", ls([,1])), "b");
		assertEquals(list("at", ls([,2])), "c");
		assertEquals(list("size"), 3);
	});

	await t.step("(pop) should remove and return the last element", () => {
		const list = newList(ls([,"a",,"b"]));
		assertEquals(list("pop"), "b");
		assertEquals(list("size"), 1);
	});

	await t.step("(unshift) should add elements to the beginning", () => {
		const list = newList(ls([,"c"]));
		list("unshift", ls([,"a",,"b"]));
		assertEquals(list("at", ls([,0])), "a");
		assertEquals(list("at", ls([,1])), "b");
		assertEquals(list("at", ls([,2])), "c");
		assertEquals(list("size"), 3);
	});

	await t.step("(shift) should remove and return the first element", () => {
		const list = newList(ls([,"a",,"b",,"c"]));
		assertEquals(list("shift"), "a");
		assertEquals(list("at", ls([,0])), "b");
		assertEquals(list("size"), 2);
	});

	await t.step("(slice) should return a shallow copy of a portion", () => {
		const list = newList(ls([,"a",,"b",,"c",,"d",,"e"]));
		const sliced = list("slice", ls([,1,,4]));
		assert(sliced instanceof NANOS, "Should return a NANOS instance");
		assertEquals(sliced.at(0), "b");
		assertEquals(sliced.at(1), "c");
		assertEquals(sliced.at(2), "d");
		assertEquals(sliced.size, 3);
	});

	await t.step("(slice) with no arguments should copy entire list", () => {
		const list = newList(ls([,"a",,"b",,"c"]));
		const sliced = list("slice");
		assertEquals(sliced.size, 3);
		assertEquals(sliced.at(0), "a");
		assertEquals(sliced.at(1), "b");
		assertEquals(sliced.at(2), "c");
	});

	await t.step("(slice) with only start should slice to end", () => {
		const list = newList(ls([,"a",,"b",,"c",,"d"]));
		const sliced = list("slice", ls([,2]));
		assertEquals(sliced.size, 2);
		assertEquals(sliced.at(0), "c");
		assertEquals(sliced.at(1), "d");
	});

	await t.step("(slice) with negative start should count from end", () => {
		const list = newList(ls([,"a",,"b",,"c",,"d",,"e"]));
		const sliced = list("slice", ls([,-2]));
		assertEquals(sliced.size, 2);
		assertEquals(sliced.at(0), "d");
		assertEquals(sliced.at(1), "e");
	});

	await t.step("(slice) with negative end should count from end", () => {
		const list = newList(ls([,"a",,"b",,"c",,"d",,"e"]));
		const sliced = list("slice", ls([,1,,-1]));
		assertEquals(sliced.size, 3);
		assertEquals(sliced.at(0), "b");
		assertEquals(sliced.at(1), "c");
		assertEquals(sliced.at(2), "d");
	});

	await t.step("(slice) should preserve sparseness", () => {
		const list = newList();
		list("set", ls([,0, "to", "a"]));
		list("set", ls([,2, "to", "c"]));
		list("set", ls([,4, "to", "e"]));
		const sliced = list("slice", ls([,0, 5]));
		assertEquals(sliced.size, 3);
		assertEquals(sliced.at(0), "a");
		assertEquals(sliced.at(2), "c");
		assertEquals(sliced.at(4), "e");
		assert(!sliced.has(1), "Should not have index 1");
		assert(!sliced.has(3), "Should not have index 3");
	});

	await t.step("(slice) should not modify original list", () => {
		const list = newList(ls([,"a",,"b",,"c"]));
		const sliced = list("slice", ls([,1, 2]));
		sliced.set(0, "modified");
		assertEquals(list("at", ls([,1])), "b", "Original should be unchanged");
		assertEquals(sliced.at(0), "modified", "Slice should be modified");
	});
});
