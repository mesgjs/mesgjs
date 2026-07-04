import { assertEquals } from "https://deno.land/std@0.152.0/testing/asserts.ts";
import '../../src/runtime/mesgjs.esm.js';
import { runIfCode, runWhileCode } from "../../src/runtime/runtime.esm.js";
import { codeBlock } from "../harness.esm.js";

Deno.test("runIfCode", async (t) => {
	await t.step("should return non-@code values directly", () => {
		assertEquals(runIfCode(42), 42);
		assertEquals(runIfCode("hello"), "hello");
		assertEquals(runIfCode({}), {});
	});

	await t.step("should execute a @code object", () => {
		const codeFn = codeBlock(() => 'executed');

		assertEquals(runIfCode(codeFn), "executed");
	});
});

Deno.test("runWhileCode", async (t) => {
	const finalValue = "done";
	const codeFn3 = codeBlock(() => finalValue);
	const codeFn2 = codeBlock(() => codeFn3.run());
	const codeFn1 = codeBlock(() => codeFn2.run());

	await t.step("should return non-@code values directly", () => {
		assertEquals(runWhileCode(42), 42);
	});

	await t.step("should execute a single @code object", () => {
		const codeFn = codeBlock(() => 'executed');

		assertEquals(runWhileCode(codeFn), "executed");
	});

	await t.step("should execute a chain of @code objects", () => {
		assertEquals(runWhileCode(codeFn1), finalValue);
	});
});
