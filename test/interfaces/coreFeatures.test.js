import {
	assertEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import '../../src/runtime/mesgjs.esm.js';
import { setModMeta } from '../../src/runtime/runtime.esm.js';

const mockMeta = {
	testMode: true,
	features: ["feat1", "feat2"],
};

setModMeta(mockMeta);

Deno.test("Feature System (@core Interface)", async (t) => {

	await t.step("fcheck should return false for a pending feature", () => {
		assertEquals($c('fcheck', "feat1"), false);
	});

	await t.step("fready should mark a feature as fulfilled", () => {
		$c('fready', "feat1"); // mid is not checked in testMode
		assertEquals($c('fcheck', "feat1"), true);
	});

	await t.step("fwait should resolve when a feature is ready", async () => {
		let waited = false;
		const waitPromise = $c('fwait', "feat2").then(() => {
			waited = true;
		});

		// Feature is not ready yet
		assertEquals(waited, false);
		
		$c('fready', "feat2");

		await waitPromise;
		assertEquals(waited, true);
	});
	
	await t.step("fcheck should return undefined for an unknown feature", () => {
		assertEquals($c('fcheck', "unheard-of-feature"), undefined);
	});

});
