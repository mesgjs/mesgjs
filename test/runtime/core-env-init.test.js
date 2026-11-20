import { describe, it } from '@compat/test';
import { assert, assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { MsjsObject } from '../../src/runtime/runtime.esm.js';

describe("Core Initialization JavaScript Contract", () => {

	// This test verifies the JAVASCRIPT RUNTIME EXPECTATION that loading
	// mesgjs.esm.js has the side-effect of creating a global $c object.
	// This $c object serves as the primary JS interface to the Mesgjs
	// runtime and is expected to have a specific set of public properties
	// for use by JS code.

	it("should install helper functions on globalThis", () => {
		assert(typeof globalThis.$toMsjs === "function", "$toMsjs function should be installed on globalThis");
	});

	it("should install core interface ($c) on globalThis", () => {
		assert(globalThis.$c, "Core interface ($c) should be installed on globalThis");
		assertStrictEquals(globalThis.$c.msjsType, "@core");
	});

	it("should expose the standard JS interface functions on $c", () => {
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

	it("should expose conversion-related symbols on $c.symbols", () => {
		assert(globalThis.$c.symbols, "$c.symbols object should exist");
		assertStrictEquals(typeof globalThis.$c.symbols.convert, "symbol", "$c.symbols.convert should be a symbol");
		assertStrictEquals(typeof globalThis.$c.symbols.instance, "symbol", "$c.symbols.instance should be a symbol");
	});

	it("should also find MsjsObject on $c", () => {
		assert(globalThis.$c.MsjsObject, "MsjsObject should be accessible via $c.MsjsObject");
		assertStrictEquals(globalThis.$c.MsjsObject, MsjsObject, "$c.MsjsObject should be class MsjsObject");
	});

});
