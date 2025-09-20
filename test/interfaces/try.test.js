import {
  assert,
  assertEquals,
  assertNotEquals,
  assertThrows,
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

Deno.test("@try Interface", async (t) => {
	const mTry = $c("get", "@try");

	await t.step("Successful execution", () => {
		const main = mockCode(() => "success");
		const result = mTry("try", ls([, main]));
		assertEquals(result, "success");
	});

	await t.step("Catch block", () => {
		const main = mockCode(() => {
			throw new Error("test error");
		});
		let caught = false;
		const catchBlock = mockCode(() => {
			caught = true;
			assertEquals(mTry("error").message, "test error");
			assertEquals(mTry("name"), "Error");
			assertEquals(mTry("message"), "test error");
		});
		mTry("try", ls([, main, "catch", catchBlock]));
		assertEquals(caught, true);
	});

	await t.step("Catchers block", () => {
		const main = mockCode(() => {
			throw new TypeError("type error");
		});
		let caught = false;
		const catchers = ls([
			'TypeError',
			mockCode(() => {
				caught = true;
				assertEquals(mTry("name"), "TypeError");
			}),
		]);
		mTry("try", ls([, main, "catchers", catchers]));
		assertEquals(caught, true);
	});

	await t.step("Always block", () => {
		let always = false;
		const main = mockCode(() => "success");
		const alwaysBlock = mockCode(() => {
			always = true;
		});
		mTry("try", ls([, main, "always", alwaysBlock]));
		assertEquals(always, true);

		always = false;
		const errorMain = mockCode(() => {
			throw new Error("fail");
		});
		assertThrows(() => mTry("try", ls([, errorMain, "always", alwaysBlock])), Error);
		assertEquals(always, true);
	});

	await t.step("Unhandled exception", () => {
		const main = mockCode(() => {
			throw new Error("unhandled");
		});
		assertThrows(() => mTry("try", main), Error, "unhandled");
	});

	await t.step("Flow control", () => {
		let secondBlockRun = false;
		const first = mockCode(() => {
			mTry("next");
		});
		const second = mockCode(() => {
			secondBlockRun = true;
			return "second";
		});
		const result = mTry("try", ls([, first, , second]));
		assertEquals(secondBlockRun, true);
		assertEquals(result, "second");

		const stopBlock = mockCode(() => {
			mTry("stop", ls(["result", "stopped"]));
			return "not stopped";
		});
		const stopResult = mTry("try", [stopBlock]);
		assertEquals(stopResult, "stopped");
	});
});
