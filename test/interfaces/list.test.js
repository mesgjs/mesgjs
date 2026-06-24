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

	// Tests for num option
	await t.step("(entries) with num=@t should return numeric index keys", () => {
		const list = newList(ls([,"a",,"b", "name", "value"]));
		const entries = list("entries", ls(["num", true]));
		// Check that index keys are numeric
		assertEquals(entries.at(0).at(0), 0, "First entry key should be numeric 0");
		assertEquals(entries.at(1).at(0), 1, "Second entry key should be numeric 1");
		// Named keys should remain strings
		assertEquals(entries.at(2).at(0), "name", "Named key should remain string");
	});

	await t.step("(entries) with num=@f should return string index keys", () => {
		const list = newList(ls([,"a",,"b"]));
		const entries = list("entries", ls(["num", false]));
		assertEquals(entries.at(0).at(0), "0", "First entry key should be string '0'");
		assertEquals(entries.at(1).at(0), "1", "Second entry key should be string '1'");
	});

	await t.step("(indexEntries) with num=@t should return numeric keys", () => {
		const list = newList(ls([,"a",,"b", "name", "value"]));
		const entries = list("indexEntries", ls(["num", true]));
		assertEquals(entries.size, 2, "Should only have index entries");
		assertEquals(entries.at(0).at(0), 0, "First key should be numeric 0");
		assertEquals(entries.at(1).at(0), 1, "Second key should be numeric 1");
	});

	await t.step("(indexEntries) with num=@f should return string keys", () => {
		const list = newList(ls([,"a",,"b"]));
		const entries = list("indexEntries", ls(["num", false]));
		assertEquals(entries.at(0).at(0), "0", "First key should be string '0'");
		assertEquals(entries.at(1).at(0), "1", "Second key should be string '1'");
	});

	await t.step("(indexKeys) with num=@t should return numeric keys", () => {
		const list = newList(ls([,"a",,"b", "name", "value"]));
		const keys = list("indexKeys", ls([,true]));
		assertEquals(keys.size, 2, "Should have 2 index keys");
		assertEquals(keys.at(0), 0, "First key should be numeric 0");
		assertEquals(keys.at(1), 1, "Second key should be numeric 1");
	});

	await t.step("(indexKeys) with num=@f should return string keys", () => {
		const list = newList(ls([,"a",,"b"]));
		const keys = list("indexKeys", ls([,false]));
		assertEquals(keys.at(0), "0", "First key should be string '0'");
		assertEquals(keys.at(1), "1", "Second key should be string '1'");
	});

	await t.step("(keys) with num=@t should return numeric index keys", () => {
		const list = newList(ls([,"a",,"b", "name", "value"]));
		const keys = list("keys", ls(["num", true]));
		assertEquals(keys.size, 3, "Should have 3 keys total");
		assertEquals(keys.at(0), 0, "First key should be numeric 0");
		assertEquals(keys.at(1), 1, "Second key should be numeric 1");
		assertEquals(keys.at(2), "name", "Named key should remain string");
	});

	await t.step("(keys) with num=@f should return string index keys", () => {
		const list = newList(ls([,"a",,"b"]));
		const keys = list("keys", ls(["num", false]));
		assertEquals(keys.at(0), "0", "First key should be string '0'");
		assertEquals(keys.at(1), "1", "Second key should be string '1'");
	});

	await t.step("(keyOf) with num=@t should return numeric key for index", () => {
		const list = newList(ls([,"a",,"b",,"c"]));
		const key = list("keyOf", ls([,"b", "num", true]));
		assertEquals(key, 1, "Should return numeric 1");
	});

	await t.step("(keyOf) with num=@f should return string key for index", () => {
		const list = newList(ls([,"a",,"b",,"c"]));
		const key = list("keyOf", ls([,"b", "num", false]));
		assertEquals(key, "1", "Should return string '1'");
	});

	await t.step("(keyOf) should return string key for named entry regardless of num", () => {
		const list = newList(ls(["name", "value"]));
		const key1 = list("keyOf", ls([,"value", "num", true]));
		const key2 = list("keyOf", ls([,"value", "num", false]));
		assertEquals(key1, "name", "Should return string 'name' with num=@t");
		assertEquals(key2, "name", "Should return string 'name' with num=@f");
	});

	await t.step("(lastKeyOf) with num=@t should return numeric key for index", () => {
		const list = newList(ls([,"a",,"b",,"a"]));
		const key = list("lastKeyOf", ls([,"a", "num", true]));
		assertEquals(key, 2, "Should return numeric 2 (last occurrence)");
	});

	await t.step("(lastKeyOf) with num=@f should return string key for index", () => {
		const list = newList(ls([,"a",,"b",,"a"]));
		const key = list("lastKeyOf", ls([,"a", "num", false]));
		assertEquals(key, "2", "Should return string '2' (last occurrence)");
	});

	await t.step("(pairs) with num=@t should return numeric index keys", () => {
		const list = newList(ls([,"a",,"b", "name", "value"]));
		const pairs = list("pairs", ls(["num", true]));
		// Pairs are flattened: [key1, value1, key2, value2, ...]
		assertEquals(pairs.at(0), 0, "First key should be numeric 0");
		assertEquals(pairs.at(1), "a", "First value should be 'a'");
		assertEquals(pairs.at(2), 1, "Second key should be numeric 1");
		assertEquals(pairs.at(3), "b", "Second value should be 'b'");
		assertEquals(pairs.at(4), "name", "Named key should remain string");
		assertEquals(pairs.at(5), "value", "Named value should be 'value'");
	});

	await t.step("(pairs) with num=@f should return string index keys", () => {
		const list = newList(ls([,"a",,"b"]));
		const pairs = list("pairs", ls(["num", false]));
		assertEquals(pairs.at(0), "0", "First key should be string '0'");
		assertEquals(pairs.at(1), "a", "First value should be 'a'");
		assertEquals(pairs.at(2), "1", "Second key should be string '1'");
		assertEquals(pairs.at(3), "b", "Second value should be 'b'");
	});
});
