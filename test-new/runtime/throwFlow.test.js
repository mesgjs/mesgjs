import {
    assertEquals,
    assertThrows,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import { MsjsFlow, MsjsFlowError, throwFlow } from "../../src/runtime/runtime.esm.js";
import { NANOS } from "../../src/runtime/vendor.esm.js";

Deno.test("throwFlow", async (t) => {

    await t.step("should throw MsjsFlow in an active context", () => {
	const d = {
	    js: { active: true },
	    mp: new NANOS(),
	};
	assertThrows(() => throwFlow(d, "return", "@test"), MsjsFlow, "return");
	assertEquals(d.js.capture, true);
    });

    await t.step("should capture the result in the dispatch object", () => {
	const d = {
	    js: { active: true },
	    mp: new NANOS({ result: "the-result" }),
	};
	assertThrows(() => throwFlow(d, "return", "@test"), MsjsFlow, "return");
	assertEquals(d.js.hasFlowRes, true);
	assertEquals(d.js.flowRes, "the-result");
    });

    await t.step("should throw MsjsFlowError in an inactive context", () => {
	const d = {
	    js: { active: false },
	    mp: new NANOS(),
	};
	assertThrows(
	    () => throwFlow(d, "return", "@test"),
	    MsjsFlowError,
	    "(return) to inactive @test"
	);
    });

});
