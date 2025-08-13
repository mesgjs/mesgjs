import {
    assertEquals,
    assertThrows,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import { setRO } from "../../src/runtime/runtime.esm.js";

Deno.test("setRO", async (t) => {
    await t.step("should set a single read-only property", () => {
	const obj = {};
	setRO(obj, "a", 1);
	assertEquals(obj.a, 1);
	assertThrows(() => (obj.a = 2), TypeError);
    });

    await t.step("should set multiple read-only properties from a map", () => {
	const obj = {};
	setRO(obj, { b: 2, c: 3 });
	assertEquals(obj.b, 2);
	assertEquals(obj.c, 3);
	assertThrows(() => (obj.b = 99), TypeError);
	assertThrows(() => (obj.c = 99), TypeError);
    });

    await t.step("should respect the enumerable flag", () => {
	const objVisible = {};
	setRO(objVisible, "a", 1, true);
	assertEquals(Object.keys(objVisible).includes("a"), true);

	const objHidden = {};
	setRO(objHidden, "a", 1, false);
	assertEquals(Object.keys(objHidden).includes("a"), false);
    });

    await t.step("should respect the enumerable flag with map syntax", () => {
	const objVisible = {};
	setRO(objVisible, { a: 1 }, true);
	assertEquals(Object.keys(objVisible).includes("a"), true);

	const objHidden = {};
	setRO(objHidden, { a: 1 }, false);
	assertEquals(Object.keys(objHidden).includes("a"), false);
    });
});