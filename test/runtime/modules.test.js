import {
	assertEquals,
	assert,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import { stub } from "https://deno.land/std@0.152.0/testing/mock.ts";
import "../../src/runtime/mesgjs.esm.js";
import * as runtime from "../../src/runtime/runtime.esm.js";

// NOTE: setModMeta can only be called once per runtime instantiation.
// These tests run sequentially and depend on the state from the previous step.
// This is not ideal, but necessary given the singleton nature of the module metadata.

const code = 'globalThis.moduleCode = "loaded";';
const integrity = 'sha512-h+EbhhN+gQReENaD1p8e/XYipxbq0kg2nH/eX6LtrDt4lragpmM9jN2qewluv7iloSqzdTUs95aRKUzaP8HINw==';
const dataURL = `data:application/javascript;base64,${btoa(code)}`;
const mockMeta = {
	modules: {
		"test-mod": {
			version: "1.0.0",
			modcaps: ["cap1", "cap2"],
			url: dataURL,
			deferLoad: true,
			integrity,
		}
	}
};

Deno.test("Module System", async (t) => {
	runtime.setModMeta(mockMeta);

	await t.step("getModMeta should retrieve the configured metadata", () => {
		const meta = runtime.getModMeta();
		assert(meta, "getModMeta should return metadata");
		assertEquals(meta.at(['modules', 'test-mod', 'version']), "1.0.0");
	});

	await t.step("modHasCap should correctly check module capabilities", () => {
		assertEquals(runtime.modHasCap("test-mod", "cap1"), true);
		assertEquals(runtime.modHasCap("test-mod", "cap3"), false);
		assertEquals(runtime.modHasCap("other-mod", "cap1"), false);
	});

	await t.step("moduleScope should return a valid module dispatch object", () => {
		const scope = runtime.moduleScope();
		assert(scope.d, "Should have a dispatch object 'd'");
		assert(scope.m, "Should have a module object 'm'");
		assertEquals(scope.m.msjsType, "@module");
		assertEquals(scope.d.msjsType, "@dispatch");
	});

	await t.step("loadModule should attempt to fetch a module", async () => {
		await runtime.loadModule("test-mod");
		assertEquals(globalThis.moduleCode, 'loaded');
	});

});
