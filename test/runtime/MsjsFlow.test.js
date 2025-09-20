import {
	assertEquals,
	assert,
	assertIsError,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import { MsjsFlow, MsjsFlowError } from "../../src/runtime/runtime.esm.js";

Deno.test("MsjsFlow class", async (t) => {
	await t.step("should be instantiable with a message", () => {
		const flow = new MsjsFlow("test-message");
		assertIsError(flow, Error, "test-message");
		assertEquals(flow.name, "MsjsFlow");
	});
});

Deno.test("MsjsFlowError class", async (t) => {
	await t.step("should be instantiable", () => {
		const flowError = new MsjsFlowError("test-error");
		assertIsError(flowError, RangeError, "test-error");
		assertEquals(flowError.name, "MsjsFlowError");
	});
});