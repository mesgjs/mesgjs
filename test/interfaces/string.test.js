import {
  assert,
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";

import "../../src/runtime/mesgjs.esm.js";
import { listFromPairs as ls } from "../../src/runtime/runtime.esm.js";
import { codeBlock } from "../harness.esm.js";

Deno.test("@string Interface", async (t) => {
	const mString = $toMsjs("hello");

	await t.step("Initialization and Primitives", () => {
		assertEquals($msjsReceiver('').msjsType, "@string");
		assertEquals(mString("valueOf"), "hello");
		assertEquals(mString("toString"), "hello");
		assertEquals(mString("@jsv"), "hello");
		assertEquals(mString("length"), 5);
	});

	await t.step("Character Access", () => {
		assertEquals(mString("at", 1), "e");
		assertEquals(mString("at", -1), "o");
		assertEquals(mString("at", 10), undefined);
		assertEquals(mString("charAt", 1), "e");
		assertEquals(mString("charAt", 10), "");
		assertEquals(mString("charCodeAt", 1), 101);
		assertEquals(mString("codePointAt", 1), 101);
	});

	await t.step("Comparison and Equality", () => {
		assertEquals(mString("eq", "hello"), true);
		assertEquals(mString("=", "hello"), true);
		assertEquals(mString("ne", "world"), true);
		assertEquals(mString("!=", "world"), true);
		assertEquals(mString("gt", "helln"), true);
		assertEquals(mString(">", "helln"), true);
		assertEquals(mString("ge", "hello"), true);
		assertEquals(mString(">=", "hello"), true);
		assertEquals(mString("lt", "hellp"), true);
		assertEquals(mString("<", "hellp"), true);
		assertEquals(mString("le", "hello"), true);
		assertEquals(mString("<=", "hello"), true);
	});

	await t.step("Multi-parameter Equality (eq/=)", () => {
		// Test with multiple parameters - should match if any parameter matches
		assertEquals(mString("eq", ls([, "hi", , "hello", , "hey"])), true, "Should match 'hello' in list");
		assertEquals(mString("=", ls([, "hi", , "hello", , "hey"])), true, "Should match 'hello' in list using = operator");
		assertEquals(mString("eq", ls([, "hi", , "hey", , "howdy"])), false, "Should not match any in list");
		assertEquals(mString("=", ls([, "hi", , "hey", , "howdy"])), false, "Should not match any in list using = operator");

		// Test with single parameter (backward compatibility)
		assertEquals(mString("eq", "hello"), true, "Single parameter should still work");
		assertEquals(mString("=", "hello"), true, "Single parameter with = should still work");

		// Test case-insensitive matching pattern (like the example in docs)
		const answer = $toMsjs("yes");
		assertEquals($toMsjs(answer("toLower"))("=", ls([, "y", , "yes", , "yup", , "yeah"])), true, "Should match 'yes' after toLower");

		const answer2 = $toMsjs("YUP");
		assertEquals($toMsjs(answer2("toLower"))("=", ls([, "y", , "yes", , "yup", , "yeah"])), true, "Should match 'yup' after toLower");

		const answer3 = $toMsjs("nope");
		assertEquals($toMsjs(answer3("toLower"))("=", ls([, "y", , "yes", , "yup", , "yeah"])), false, "Should not match 'nope'");

		// Test with RIC (run-if-code) values - mocked code blocks
		const ricHello = codeBlock(() => 'hello');
		const ricWorld = codeBlock(() => 'world');
		const ricHey = codeBlock(() => 'hey');

		assertEquals(mString("eq", ls([, "hi", , ricHello, , ricHey])), true, "Should match RIC value that returns 'hello'");
		assertEquals(mString("=", ls([, ricWorld, , ricHello])), true, "Should match RIC value using = operator");
		assertEquals(mString("eq", ls([, ricWorld, , ricHey])), false, "Should not match any RIC values");
	});

	await t.step("Multi-parameter Inequality (ne/!=)", () => {
		// Test with multiple parameters - should be false if any parameter matches
		assertEquals(mString("ne", ls([, "hi", , "hello", , "hey"])), false, "Should be false when 'hello' matches");
		assertEquals(mString("!=", ls([, "hi", , "hello", , "hey"])), false, "Should be false when 'hello' matches using != operator");
		assertEquals(mString("ne", ls([, "hi", , "hey", , "howdy"])), true, "Should be true when none match");
		assertEquals(mString("!=", ls([, "hi", , "hey", , "howdy"])), true, "Should be true when none match using != operator");

		// Test with single parameter (backward compatibility)
		assertEquals(mString("ne", "hello"), false, "Single parameter should still work");
		assertEquals(mString("!=", "hello"), false, "Single parameter with != should still work");
		assertEquals(mString("ne", "world"), true, "Single non-matching parameter should return true");

		// Test case-insensitive matching pattern (like the example in docs)
		const answer = $toMsjs("no");
		assertEquals($toMsjs(answer("toLower"))("!=", ls([, "n", , "no", , "nope", , "nah"])), false, "Should be false when 'no' matches");

		const answer2 = $toMsjs("maybe");
		assertEquals($toMsjs(answer2("toLower"))("!=", ls([, "n", , "no", , "nope", , "nah"])), true, "Should be true when 'maybe' doesn't match");

		// Test with RIC (run-if-code) values - mocked code blocks
		const ricHello = codeBlock(() => 'hello');
		const ricWorld = codeBlock(() => 'world');
		const ricHey = codeBlock(() => 'hey');

		assertEquals(mString("ne", ls([, "hi", , ricHello, , ricHey])), false, "Should be false when RIC value returns 'hello'");
		assertEquals(mString("!=", ls([, ricWorld, , ricHello])), false, "Should be false when RIC value matches using != operator");
		assertEquals(mString("ne", ls([, ricWorld, , ricHey])), true, "Should be true when no RIC values match");
	});

	await t.step("Searching and Substrings", () => {
		assertEquals(mString("includes", "ell"), true);
		assertEquals(mString("startsWith", "he"), true);
		assertEquals(mString("endsWith", "lo"), true);
		assertEquals(mString("indexOf", "l"), 2);
		assertEquals(mString("lastIndexOf", "l"), 3);
		assertEquals(mString("slice", ls([, 1, , 4])), "ell");
		assertEquals(mString("substring", ls([, 1, , 4])), "ell");
	});

	await t.step("Modification and Manipulation", () => {
		assertEquals(mString("toUpper"), "HELLO");
		assertEquals(mString("toLower"), "hello");
		const padded = $toMsjs("  hi  ");
		assertEquals(padded("trim"), "hi");
		assertEquals(padded("trimStart"), "hi  ");
		assertEquals(padded("trimEnd"), "  hi");
		assertEquals(mString("repeat", 2), "hellohello");
		assertEquals(mString("padStart", ls([, 8, , "."])), "...hello");
		assertEquals(mString("padEnd", ls([, 8, , "."])), "hello...");
		assertEquals(mString("replace", ls([, "l", , "x"])), "hexlo");
		assertEquals(mString("replaceAll", ls([, "l", , "x"])), "hexxo");
	});

	await t.step("Joining and Splitting", () => {
		const arr = $toMsjs(["a", "b"]);
		assertEquals(mString("join", ls([, "a", , "b"])), "helloab");
		assertEquals(mString("join", ls([, "a", , "b", "with", "-"])), "hello-a-b");
		assertEquals($toMsjs("-")("joining", ls([, "a", , "b"])), "a-b");
		const split = mString("split", "");
		assertEquals(split.size, 5);
		assertEquals(split.at(0), "h");
	});

	await t.step("Conversion", () => {
		assertEquals($toMsjs("123")("toInt"), 123);
		assertEquals($toMsjs("123.45")("toFloat"), 123.45);
		assertEquals($toMsjs("123")("toBigInt"), 123n);
		const re = mString("re", "g");
		assertEquals(re instanceof RegExp, true);
		assertEquals($c.sm(re, "source"), "hello");
		assertEquals($c.sm(re, "flags"), "g");
	});
});
