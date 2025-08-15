import {
  assert,
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";

import "../../src/runtime/mesgjs.esm.js";
import { listFromPairs as ls } from "../../src/runtime/runtime.esm.js";

const mockCode = (runLogic) => {
    const fn = (op) => {
	if (op === "run") return runLogic();
    };
    fn.msjsType = "@code";
    return fn;
};

Deno.test("@regex Interface", async (t) => {
    const mString = $toMsjs("hello world");

    await t.step("Initialization", () => {
	const mRegex = mString("re", "g");
	assertEquals(mRegex.msjsType, "@regex");
	assertEquals(mRegex("source"), "hello world");
	assertEquals(mRegex("flags"), "g");
    });

    await t.step("(test)", () => {
	const mRegex = mString("re", "g");
	assertEquals(mRegex("test", "hello"), false);
	assertEquals(mRegex("test", "hello world hello"), true);
    });

    await t.step("(exec)", () => {
	const mRegex = mString('re', 'g');
	const res = mRegex("exec", "Well, hello world!");
	assertEquals(res?.at(0), "hello world");
    });

    await t.step("(match1)", () => {
	const mRegex = mString("re", "g");
	const res = mRegex("match1", "Well, hello world!");
	assertEquals(res?.at(0), "hello world");
	const noMatch = $toMsjs(/a/)("match1", "b");
	assertEquals(noMatch, null);
    });

    await t.step("(search)", () => {
	const mRegex = mString("re", "g");
	const res = mRegex("search", "Well, hello world!");
	assertEquals(res, 6);
	const noMatch = $toMsjs(/a/)("search", "b");
	assertEquals(noMatch, -1);
    });

    await t.step("(matchAll)", () => {
	const rx = $toMsjs(/t(e)(st(\d?))/g);
	const str = "test1test2";
	const expected = [
	    ["test1", "e", "st1", "1"],
	    ["test2", "e", "st2", "2"],
	];
	let i = 0;
	const each = mockCode(() => {
	    const match = rx("match");
	    assert(match?.size >= 4);
	    assertEquals(match?.at(0), expected[i][0]);
	    assertEquals(match?.at(1), expected[i][1]);
	    assertEquals(match?.at(2), expected[i][2]);
	    assertEquals(match?.at(3), expected[i][3]);
	    i++;
	});
	rx("matchAll", ls([, str, "each", each]));
	assertEquals(i, 2);

	const elseBlock = mockCode(() => assert(true));
	$toMsjs(/a/g)("matchAll", ls([, "b", "else", elseBlock]));
    });
});