import {
    assertEquals,
    assert,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import '../../src/runtime/mesgjs.esm.js';
import { setModMeta, fcheck, fready, fwait } from '../../src/runtime/runtime.esm.js';

const mockMeta = {
    testMode: true,
    features: ["feat1", "feat2"],
};

setModMeta(mockMeta);

Deno.test("Feature System (Test Mode)", async (t) => {

    await t.step("fcheck should return false for a pending feature", () => {
	assertEquals(fcheck("feat1"), false);
    });

    await t.step("fready should mark a feature as fulfilled", () => {
	fready(null, "feat1"); // mid is not checked in testMode
	assertEquals(fcheck("feat1"), true);
    });

    await t.step("fwait should resolve when a feature is ready", async () => {
	let waited = false;
	const waitPromise = fwait("feat2").then(() => {
	    waited = true;
	});

	// Feature is not ready yet
	assertEquals(waited, false);
	
	fready(null, "feat2");

	await waitPromise;
	assertEquals(waited, true);
    });
    
    await t.step("fcheck should return undefined for an unknown feature", () => {
	assertEquals(fcheck("unheard-of-feature"), undefined);
    });

});