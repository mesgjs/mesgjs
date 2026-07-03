import {
	assertEquals,
	assertStrictEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";

Deno.test("@true and @false Interfaces", async (t) => {
	const { $msjsReceiver } = globalThis;
	const { getInstance } = globalThis.$c;
	const mt = $msjsReceiver(true);
	const mf = $msjsReceiver(false);

	await t.step("consistent intances", () => {
		assertStrictEquals(mt, getInstance('@true'));
		assertStrictEquals(mf, getInstance('@false'));
		assertStrictEquals(mt, $msjsReceiver(true));
		assertStrictEquals(mf, $msjsReceiver(false));
	});

	await t.step("should support (valueOf) message", () => {
		assertEquals($c.sm(mt, "valueOf"), true);
		assertEquals($c.sm(mf, "valueOf"), false);
	});

	await t.step("should support (toString) message", () => {
		assertEquals($c.sm(mt, "toString"), "@t");
		assertEquals($c.sm(mf, "toString"), "@f");
	});
});
