import {
    assertEquals,
    assert,
    assertNotStrictEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { NANOS } from "../../src/runtime/vendor.esm.js";

Deno.test("@js-array Interface", async (t) => {
    const { $toMsjs } = globalThis;

    await t.step("(at)/(get)/(@) should retrieve a value by index", () => {
	const ma = $toMsjs(['a', 'b', 'c']);
	assertEquals(ma("at", [1]), 'b');
	assertEquals(ma("get", [2]), 'c');
	assertEquals(ma("@", [0]), 'a');
    });

    await t.step("(set)/(=) should modify a value by index", () => {
	const testArray = ['a', 'b', 'c'];
	const ma = $toMsjs(testArray);
	ma("set", new NANOS(1, { to: 'B' }));
	assertEquals(testArray[1], 'B');
	ma("=", new NANOS(2, { to: 'C' }));
	assertEquals(testArray[2], 'C');
    });

    await t.step("length/size should return the array length", () => {
	const ma = $toMsjs([1, 2, 3, 4]);
	assertEquals(ma("length"), 4);
	assertEquals(ma("size"), 4);
    });

    await t.step("pop/push/shift/unshift should mirror array methods", () => {
	const testArray = [1, 2, 3];
	const ma = $toMsjs(testArray);
	assertEquals(ma("pop"), 3);
	assertEquals(testArray, [1, 2]);
	ma("push", [3, 4]);
	assertEquals(testArray, [1, 2, 3, 4]);
	assertEquals(ma("shift"), 1);
	assertEquals(testArray, [2, 3, 4]);
	ma("unshift", [0, 1]);
	assertEquals(testArray, [0, 1, 2, 3, 4]);
    });
    
    await t.step("should create new arrays for concat, flat, slice, etc.", () => {
	const testArray = [1, [2, 3]];
	const ma = $toMsjs(testArray);
	
	const concatenated = ma("concat", [[4, 5]]);
	assertNotStrictEquals(concatenated, testArray);
	assertEquals(concatenated, [1, [2, 3], 4, 5]);

	const flattened = ma("flat");
	assertEquals(flattened, [1, 2, 3]);

	const sliced = ma("slice", [1]);
	assertEquals(sliced, [[2,3]]);
    });

    await t.step("toList should convert to a Mesgjs @list (NANOS)", () => {
	const ma = $toMsjs(['a', 'b']);
	const list = ma("toList");
	assert(list instanceof NANOS, "Result should be a NANOS instance");
	assertEquals(list.at('0'), 'a');
	assertEquals(list.at('1'), 'b');
    });
});