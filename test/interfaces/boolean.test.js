import {
    assertEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";

Deno.test("@true and @false Interfaces", async (t) => {
    const { $toMsjs } = globalThis;
    const mt = $toMsjs(true);
    const mf = $toMsjs(false);

    await t.step("should support (valueOf) message", () => {
	assertEquals(mt("valueOf"), true);
	assertEquals(mf("valueOf"), false);
    });

    await t.step("should support (toString) message", () => {
	assertEquals(mt("toString"), "@t");
	assertEquals(mf("toString"), "@f");
    });
});