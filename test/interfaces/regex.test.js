import {
  assert,
  assertEquals,
  assertStrictEquals,
  assertNotEquals,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";

import "../../src/runtime/mesgjs.esm.js";
import { listFromPairs as ls } from "../../src/runtime/runtime.esm.js";
import { codeBlock } from "../harness.esm.js";

Deno.test("@regex Interface", async (t) => {
	const mString = $toMsjs("hello world");

	await t.step("consistent receivers", () => {
		const re = /hello/;
		assertStrictEquals($msjsReceiver(re), $msjsReceiver(re));
	});

	await t.step("Initialization", () => {
		const mRegex = mString("re", "g");
		assertEquals(mRegex instanceof RegExp, true);
		assertEquals($c.sm(mRegex, "source"), "hello world");
		assertEquals($c.sm(mRegex, "flags"), "g");
	});

	await t.step("(test)", () => {
		const mRegex = mString("re", "g");
		assertEquals($c.sm(mRegex, "test", "hello"), false);
		assertEquals($c.sm(mRegex, "test", "hello world hello"), true);
	});

	await t.step("(exec)", () => {
		const mRegex = mString('re', 'g');
		const res = $c.sm(mRegex, "exec", "Well, hello world!");
		assertEquals(res?.at(0), "hello world");
	});

	await t.step("(match1)", () => {
		const mRegex = mString("re", "g");
		const res = $c.sm(mRegex, "match1", "Well, hello world!");
		assertEquals(res?.at(0), "hello world");
		const noMatch = $toMsjs(/a/)("match1", "b");
		assertEquals(noMatch, null);
	});

	await t.step("(search)", () => {
		const mRegex = mString("re", "g");
		const res = $c.sm(mRegex, "search", "Well, hello world!");
		assertEquals(res, 6);
		const noMatch = $toMsjs(/a/)("search", "b");
		assertEquals(noMatch, -1);
	});

	await t.step("(matchAll)", () => {
		const re = /t(e)(st(\d?))/g;
		const rem = $c.getInstance('@rematch');
		const str = "test1test2";
		const expected = [
			["test1", "e", "st1", "1"],
			["test2", "e", "st2", "2"],
		];
		let i = 0;
		const each = codeBlock(() => {
			const match = $c.sm(rem, "match");
			assert(match?.size >= 4);
			assertEquals(match?.at(0), expected[i][0]);
			assertEquals(match?.at(1), expected[i][1]);
			assertEquals(match?.at(2), expected[i][2]);
			assertEquals(match?.at(3), expected[i][3]);
			i++;
		});
		$c.sm(rem, "matchAll", ls([, re, , str, "each", each]));
		assertEquals(i, 2);

		const elseBlock = codeBlock(() => assert(true));
		$c.sm(rem, 'matchAll', ls([, /a/g, , 'b', 'else', elseBlock]));
	});
});
