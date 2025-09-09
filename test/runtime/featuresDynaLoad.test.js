import {
	assertEquals,
	assert,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import '../../src/runtime/mesgjs.esm.js';
const { setModMeta, fcheck, fwait } = globalThis.$c;

const mod1JS = `globalThis.$c.fready('mod1', 'feat1');`;
const mod2JS = `globalThis.$c.fready('mod2', 'feat2');`;

const mod1URL = `data:application/javascript;base64,${btoa(mod1JS)}`;
const mod2URL = `data:application/javascript;base64,${btoa(mod2JS)}`;

const mockMeta = {
    testMode: true,
    modules: {
	mod1: {
	    url: mod1URL,
	    integrity: 'DISABLED',
	    featpro: 'feat1',
	    featreq: 'feat2',
	    deferLoad: true,
	},
	mod2: {
	    url: mod2URL,
	    integrity: 'DISABLED',
	    featpro: 'feat2',
	    deferLoad: true,
	},
    },
};

setModMeta(mockMeta);

Deno.test("Feature System (Dynamic Loading)", async (t) => {

    await t.step("fcheck should return false for pending features", () => {
	assertEquals(fcheck("feat1"), false);
	assertEquals(fcheck("feat2"), false);
    });

    await t.step("fwait should trigger chained loading of modules", async () => {
	await fwait('feat1');
	assertEquals(fcheck("feat1"), true);
	assertEquals(fcheck("feat2"), true);
    });
});
