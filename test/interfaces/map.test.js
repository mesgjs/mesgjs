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
		return new Map(initialEntries);
	};

	await t.step("consistent receivers", () => {
		const m = new Map();
		assertStrictEquals($msjsReceiver(m), $msjsReceiver(m));
	});

	await t.step("should get, set, has, and delete entries", () => {
		const map = newMap([["key1", "value1"]]);

		assertEquals($c.sm(map, "has", ls([,"key1"])), true);
		assertEquals($c.sm(map, "get", ls([,"key1"])), "value1");

		$c.sm(map, "set", ls([,"key2", ,"value2"]));
		assertEquals($c.sm(map, "get", ls([,"key2"])), "value2");

		assertEquals($c.sm(map, "delete", ls([,"key1"])), true);
		assertEquals($c.sm(map, "has", ls([,"key1"])), false);
	});

	await t.step("size should return the number of entries", () => {
		const map = newMap([["a", 1], ["b", 2]]);
		assertEquals($c.sm(map, "size"), 2);
	});

	await t.step("clear should remove all entries", () => {
		const map = newMap([["a", 1], ["b", 2]]);
		$c.sm(map, "clear");
		assertEquals($c.sm(map, "size"), 0);
	});

	await t.step("entries, keys, and values should return correct lists", () => {
		const map = newMap([["a", 1], ["b", 2]]);

		const entries = $c.sm(map, "entries");
		assertEquals(entries.at(0), ['a', 1]);
		assertEquals(entries.at(1), ['b', 2]);

		const keys = $c.sm(map, "keys");
		assertEquals(keys.at(0), "a");
		assertEquals(keys.at(1), "b");

		const values = $c.sm(map, "values");
		assertEquals(values.at(0), 1);
		assertEquals(values.at(1), 2);
	});
});
