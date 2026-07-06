import {
  assert,
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";

import "../../src/runtime/mesgjs.esm.js";

Deno.test("@undefined Interface", async (t) => {
	await t.step("Consistent receiver", () => {
		assertEquals($msjsReceiver(undefined), $msjsReceiver(undefined));
	});

	await t.step("Singleton properties", () => {
		assertEquals($msjsReceiver(undefined).msjsType, "@undefined");
		assertEquals($c.sm(undefined, "valueOf"), undefined);
		assertEquals($c.sm(undefined, "@jsv"), undefined);
	});

	await t.step("Operations", () => {
		assertEquals($c.sm(undefined, "toString"), "@u");
		assertEquals($c.sm(undefined, "has"), undefined);
	});
});
