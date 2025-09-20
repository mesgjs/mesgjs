import {
	assert,
	assertEquals,
	assertStrictEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { listFromPairs as ls } from "../../src/runtime/runtime.esm.js";

Deno.test("@map Interface", async (t) => {
	const { $c } = globalThis;

	const newMap = (initialEntries) => {
		const jsMap = new Map(initialEntries);
		return $c("get", ls([, "@map", 'init', ls([,jsMap])]));
	};

	await t.step("consistent instances", () => {
		const m = new Map([['from', 'to']]);
		assertStrictEquals($toMsjs(m), $toMsjs(m));
	});

	await t.step("should get, set, has, and delete entries", () => {
		const map = newMap([["key1", "value1"]]);
		
		assertEquals(map("has", ls([,"key1"])), true);
		assertEquals(map("get", ls([,"key1"])), "value1");
		
		map("set", ls([,"key2", ,"value2"]));
		assertEquals(map("get", ls([,"key2"])), "value2");
		
		assertEquals(map("delete", ls([,"key1"])), true);
		assertEquals(map("has", ls([,"key1"])), false);
	});

	await t.step("size should return the number of entries", () => {
		const map = newMap([["a", 1], ["b", 2]]);
		assertEquals(map("size"), 2);
	});

	await t.step("clear should remove all entries", () => {
		const map = newMap([["a", 1], ["b", 2]]);
		map("clear");
		assertEquals(map("size"), 0);
	});

	await t.step("entries, keys, and values should return correct lists", () => {
		const map = newMap([["a", 1], ["b", 2]]);
		
		const entries = map("entries");
		assertEquals(entries.at(0), ['a', 1]);
		assertEquals(entries.at(1), ['b', 2]);

		const keys = map("keys");
		assertEquals(keys.at(0), "a");
		assertEquals(keys.at(1), "b");
		
		const values = map("values");
		assertEquals(values.at(0), 1);
		assertEquals(values.at(1), 2);
	});
});
