import {
  assert,
  assertEquals,
  assertNotEquals,
  assertThrows,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";

import "../../src/runtime/mesgjs.esm.js";
import { listFromPairs as ls } from "../../src/runtime/runtime.esm.js";
import { codeBlock } from '../harness.esm.js';

Deno.test("@try Interface", async (t) => {
	const mTry = $c.getInstance("@try");

	await t.step("Successful execution", () => {
		const main = codeBlock(() => "success");
		const result = $c.sm(mTry, "try", ls([, main]));
		assertEquals(result, "success");
	});

	await t.step("Catch block", () => {
		const main = codeBlock(() => {
			throw new Error("test error");
		});
		let caught = false;
		const catchBlock = codeBlock(() => {
			caught = true;
			assertEquals($c.sm(mTry, "error").message, "test error");
			assertEquals($c.sm(mTry, "name"), "Error");
			assertEquals($c.sm(mTry, "message"), "test error");
		});
		$c.sm(mTry, "try", ls([, main, "catch", catchBlock]));
		assertEquals(caught, true);
	});

	await t.step("Catchers block", () => {
		const main = codeBlock(() => {
			throw new TypeError("type error");
		});
		let caught = false;
		const catchers = ls([
			'TypeError',
			codeBlock(() => {
				caught = true;
				assertEquals($c.sm(mTry, "name"), "TypeError");
			}),
		]);
		$c.sm(mTry, "try", ls([, main, "catchers", catchers]));
		assertEquals(caught, true);
	});

	await t.step("Always block", () => {
		let always = false;
		const main = codeBlock(() => "success");
		const alwaysBlock = codeBlock(() => {
			always = true;
		});
		$c.sm(mTry, "try", ls([, main, "always", alwaysBlock]));
		assertEquals(always, true);

		always = false;
		const errorMain = codeBlock(() => {
			throw new Error("fail");
		});
		assertThrows(() => $c.sm(mTry, "try", ls([, errorMain, "always", alwaysBlock])), Error);
		assertEquals(always, true);
	});

	await t.step("Unhandled exception", () => {
		const main = codeBlock(() => {
			throw new Error("unhandled");
		});
		assertThrows(() => $c.sm(mTry, "try", main), Error, "unhandled");
	});

	await t.step("Flow control", () => {
		let secondBlockRun = false;
		const first = codeBlock(() => {
			$c.sm(mTry, "next");
		});
		const second = codeBlock(() => {
			secondBlockRun = true;
			return "second";
		});
		const result = $c.sm(mTry, "try", ls([, first, , second]));
		assertEquals(secondBlockRun, true);
		assertEquals(result, "second");

		const stopBlock = codeBlock(() => {
			$c.sm(mTry, "stop", ls(["result", "stopped"]));
			return "not stopped";
		});
		const stopResult = $c.sm(mTry, "try", [stopBlock]);
		assertEquals(stopResult, "stopped");
	});
});
