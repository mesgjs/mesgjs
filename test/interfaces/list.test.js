import {
    assert,
    assertEquals,
    assertStrictEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { listFromPairs as ls } from "../../src/runtime/runtime.esm.js";

Deno.test("@list Interface", async (t) => {
    const { $c, $toMsjs, NANOS } = globalThis;

    const newList = (initParams = ls()) => $c("get", ls([, '@list', "init", ls([, initParams])]));

    await t.step("consistent instances", () => {
	const n = new NANOS().deepFreeze();
	assertStrictEquals($toMsjs(n), $toMsjs(n));
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
});
