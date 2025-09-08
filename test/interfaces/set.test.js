import {
  assert,
  assertEquals,
  assertStrictEquals,
  assertNotEquals,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";

import "../../src/runtime/mesgjs.esm.js";

const { $c, $toMsjs } = globalThis;

Deno.test("@set Interface", async (t) => {
    const mSet = $c("get", "@set");
    mSet("add", 1);
    mSet("add", "hello");

    await t.step("Consistent Instances", () => {
	const set = new Set();
	assertStrictEquals($toMsjs(set), $toMsjs(set));
    });

    await t.step("Initialization and State", () => {
	assertEquals(mSet.msjsType, "@set");
	assertEquals(mSet("size"), 2);
	assertEquals(mSet("has", 1), true);
	assertEquals(mSet("has", "world"), false);
    });

    await t.step("Manipulation", () => {
	assertEquals(mSet("delete", 2), false);
	assertEquals(mSet("delete", 1), true);
	assertEquals(mSet("size"), 1);
	mSet("clear");
	assertEquals(mSet("size"), 0);
    });

    await t.step("Iteration", () => {
	mSet("add", 1);
	mSet("add", 2);
	mSet("add", 3);
	const keys = mSet("keys");
	assertEquals(keys.length, 3);
	assertEquals(keys[0], 1);
	const values = mSet("values");
	assertEquals(values[2], 3);
	const entries = mSet("entries");
	assertEquals(entries[0], [1, 1]);
    });
});
