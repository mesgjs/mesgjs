import {
	assert,
	assertEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import '../../src/runtime/mesgjs.esm.js';

Deno.test("Core Initialization JavaScript Contract", async (t) => {

	// This test verifies the JAVASCRIPT RUNTIME EXPECTATION that loading 
	// mesgjs.esm.js has the side-effect of creating a global $c object.
	// This $c object serves as the primary JS interface to the Mesgjs 
	// runtime and is expected to have a specific set of public properties
	// for use by JS code.

	await t.step("should install helper functions on globalThis", () => {
		assert(typeof globalThis.$toMsjs === "function", "$toMsjs function should be installed on globalThis");
	});

	await t.step("should install core interface ($c) on globalThis", () => {
		assert(globalThis.$c, "Core interface ($c) should be installed on globalThis");
		assertEquals(globalThis.$c.msjsType, "@core");
	});

	await t.step("should expose the standard JS interface functions on $c", () => {
		const expectedFunctions = [
			'fcheck',
			'fready',
			'fwait',
			'getInstance',
			'getInterface',
			'getModMeta',
			'modHasCap',
			'runIfCode',
			'runWhileCode',
			'setModMeta',
			'setRO',
			'typeAccepts',
			'typeChains',
		];

		for (const funcName of expectedFunctions) {
			assert(typeof globalThis.$c[funcName] === "function", `$c.${funcName} should be a function`);
		}
	});

	await t.step("should expose conversion-related symbols on $c.symbols", () => {
		assert(globalThis.$c.symbols, "$c.symbols object should exist");
		assertEquals(typeof globalThis.$c.symbols.convert, "symbol", "$c.symbols.convert should be a symbol");
		assertEquals(typeof globalThis.$c.symbols.instance, "symbol", "$c.symbols.instance should be a symbol");
	});

});