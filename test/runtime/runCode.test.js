import { assertEquals } from "https://deno.land/std@0.152.0/testing/asserts.ts";
import '../../src/runtime/mesgjs.esm.js';
import { runIfCode, runWhileCode } from "../../src/runtime/runtime.esm.js";

const modScope = $modScope();

function getCode (fn) {
	return modScope.d.b(fn);
}

Deno.test("runIfCode", async (t) => {
	await t.step("should return non-@code values directly", () => {
		assertEquals(runIfCode(42), 42);
		assertEquals(runIfCode("hello"), "hello");
		assertEquals(runIfCode({}), {});
	});

	await t.step("should execute a @code object", () => {
		const codeFn = getCode(() => 'executed');

		assertEquals(runIfCode(codeFn), "executed");
	});
});

Deno.test("runWhileCode", async (t) => {
	const finalValue = "done";
	const codeFn3 = getCode(() => finalValue);
	const codeFn2 = getCode(() => codeFn3.run());
	const codeFn1 = getCode(() => codeFn2.run());

	await t.step("should return non-@code values directly", () => {
		assertEquals(runWhileCode(42), 42);
	});

	await t.step("should execute a single @code object", () => {
		const codeFn = getCode(() => 'executed');

		assertEquals(runWhileCode(codeFn), "executed");
	});

	await t.step("should execute a chain of @code objects", () => {
		assertEquals(runWhileCode(codeFn1), finalValue);
	});
});
