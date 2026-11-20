import { describe, it } from '@compat/test';
import { assertEquals, assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { runIfCode, runWhileCode } from "../../src/runtime/runtime.esm.js";
import { codeBlock } from "../harness.esm.js";

describe("runIfCode", () => {
	it("should return non-@code values directly", () => {
		assertStrictEquals(runIfCode(42), 42);
		assertStrictEquals(runIfCode("hello"), "hello");
		assertEquals(runIfCode({}), {});
	});

	it("should execute a @code object", () => {
		const codeFn = codeBlock(() => 'executed');
		assertStrictEquals(runIfCode(codeFn), "executed");
	});
});

describe("runWhileCode", () => {
	const finalValue = "done";
	const codeFn3 = codeBlock(() => finalValue);
	const codeFn2 = codeBlock(() => codeFn3.run());
	const codeFn1 = codeBlock(() => codeFn2.run());

	it("should return non-@code values directly", () => {
		assertStrictEquals(runWhileCode(42), 42);
	});

	it("should execute a single @code object", () => {
		const codeFn = codeBlock(() => 'executed');
		assertStrictEquals(runWhileCode(codeFn), "executed");
	});

	it("should execute a chain of @code objects", () => {
		assertStrictEquals(runWhileCode(codeFn1), finalValue);
	});
});
