import {
  assert,
  assertEquals,
  assertStrictEquals,
  assertNotEquals,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";

import "../../src/runtime/mesgjs.esm.js";

const { $c, $toMsjs } = globalThis;

Deno.test("@set Interface", async (t) => {
	const mSet = new Set([1, 'hello']);

	await t.step("Consistent Receivers", () => {
		const set = new Set();
		assertStrictEquals($msjsReceiver(set), $msjsReceiver(set));
	});

	await t.step("Initialization and State", () => {
		assertEquals($msjsReceiver(mSet).msjsType, "@set");
		assertEquals($c.sm(mSet, "size"), 2);
		assertEquals($c.sm(mSet, "has", 1), true);
		assertEquals($c.sm(mSet, "has", "world"), false);
	});

	await t.step("Manipulation", () => {
		assertEquals($c.sm(mSet, "delete", 2), false);
		assertEquals($c.sm(mSet, "delete", 1), true);
		assertEquals($c.sm(mSet, "size"), 1);
		$c.sm(mSet, "clear");
		assertEquals($c.sm(mSet, "size"), 0);
	});

	await t.step("Iteration", () => {
		$c.sm(mSet, "add", 1);
		$c.sm(mSet, "add", 2);
		$c.sm(mSet, "add", 3);
		const keys = $c.sm(mSet, "keys");
		assertEquals(keys.length, 3);
		assertEquals(keys[0], 1);
		const values = $c.sm(mSet, "values");
		assertEquals(values[2], 3);
		const entries = $c.sm(mSet, "entries");
		assertEquals(entries[0], [1, 1]);
	});
});
