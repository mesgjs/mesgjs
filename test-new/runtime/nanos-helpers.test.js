import {
    assertEquals,
    assert,
    assertInstanceOf,
    assertThrows,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import { NANOS } from "../../src/runtime/vendor.esm.js";
import { listFromPairs, namespaceAt } from "../../src/runtime/runtime.esm.js";

Deno.test("listFromPairs", () => {
    const pairs = ["a", 1, /**/, /**/, /**/, "b", "c", 2];
    const list = listFromPairs(pairs);
    assertInstanceOf(list, NANOS);
    assertEquals(list.at("a"), 1);
    assertEquals(list.has(0), false);
    assertEquals(list.has("0"), false);
    assertEquals(list.at(1), "b");
    assertEquals(list.at("1"), "b");
    assertEquals(list.at("c"), 2);
});

Deno.test("namespaceAt", async (t) => {
    const namespace = new NANOS({ a: 1, b: 2 });

    await t.step("should retrieve a value from a namespace", () => {
	assertEquals(namespaceAt(namespace, "a"), 1);
    });

    await t.step("should throw a ReferenceError for a missing required key", () => {
	assertThrows(
	    () => namespaceAt(namespace, "c"),
	    ReferenceError,
	    'Required key "c" not found'
	);
    });

    await t.step("should return undefined for a missing optional key", () => {
	assertEquals(namespaceAt(namespace, "c", true), undefined);
    });
});