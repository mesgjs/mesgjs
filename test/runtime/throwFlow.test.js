import {
	assert,
	assertEquals,
	// assertThrows,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import { MsjsFlow, MsjsFlowError, throwFlow } from "../../src/runtime/runtime.esm.js";
import { NANOS } from "@nanos";

function assertThrows (fn, type, message) {
	let exception;
	try { fn(); }
	catch (exc) { exception = exc; }
	assert(exception instanceof type);
	assert(exception?.message.includes(message));
}

Deno.test("throwFlow", async (t) => {

	await t.step("should throw MsjsFlow in an active context", () => {
		const d = {
			rr: { active: true },
			mp: new NANOS(),
		};
		assertThrows(() => throwFlow(d, "return", "@test"), MsjsFlow, "return");
		assertEquals(d.rr.capture, true);
	});

	await t.step("should capture the result in the dispatch object", () => {
		const d = {
			rr: { active: true },
			mp: new NANOS({ result: "the-result" }),
		};
		assertThrows(() => throwFlow(d, "return", "@test"), MsjsFlow, "return");
		assertEquals(d.rr.hasFlowRes, true);
		assertEquals(d.rr.flowRes, "the-result");
	});

	await t.step("should throw MsjsFlowError in an inactive context", () => {
		const d = {
			rr: { active: false },
			mp: new NANOS(),
		};
		assertThrows(
			() => throwFlow(d, "return", "@test"),
			MsjsFlowError,
			"(return) to inactive @test"
		);
	});

});
