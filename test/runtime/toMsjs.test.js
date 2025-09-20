import {
	assertEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { NANOS } from "../../src/runtime/vendor.esm.js";

Deno.test("$toMsjs Type Conversion", async (t) => {
	const $toMsjs = globalThis.$toMsjs;

	await t.step("should convert JS primitives to Mesgjs types", () => {
		assertEquals($toMsjs(true).msjsType, "@true");
		assertEquals($toMsjs(false).msjsType, "@false");
		assertEquals($toMsjs(null).msjsType, "@null");
		assertEquals($toMsjs(undefined).msjsType, "@undefined");
		assertEquals($toMsjs(10n).msjsType, "@number");
		assertEquals($toMsjs(10).msjsType, "@number");
		assertEquals($toMsjs("text").msjsType, "@string");
	});

	await t.step("should convert JS objects to Mesgjs types", () => {
		const n1 = new NANOS();
		const n1o = $toMsjs(n1);
		assertEquals(n1o.msjsType, "@list");
		assertEquals($toMsjs(n1), n1o);
		const a1 = [];
		const a1o = $toMsjs(a1);
		assertEquals(a1o.msjsType, "@jsArray");
		assertEquals($toMsjs(a1), a1o);
	});

});