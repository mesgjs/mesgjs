import { assertEquals } from "https://deno.land/std@0.152.0/testing/asserts.ts";
import { runIfCode, runWhileCode } from "../../src/runtime/runtime.esm.js";

Deno.test("runIfCode", async (t) => {
    await t.step("should return non-@code values directly", () => {
	assertEquals(runIfCode(42), 42);
	assertEquals(runIfCode("hello"), "hello");
	assertEquals(runIfCode({}), {});
    });

    await t.step("should execute a @code object", () => {
	const codeFn = (op) => {
	    if (op === 'run') return "executed";
	};
	codeFn.msjsType = '@code';

	assertEquals(runIfCode(codeFn), "executed");
    });
});

Deno.test("runWhileCode", async (t) => {
    const finalValue = "done";
    
    const codeFn3 = (op) => finalValue;
    codeFn3.msjsType = '@code';
    const codeFn2 = (op) => codeFn3;
    codeFn2.msjsType = '@code';
    const codeFn1 = (op) => codeFn2;
    codeFn1.msjsType = '@code';

    await t.step("should return non-@code values directly", () => {
	assertEquals(runWhileCode(42), 42);
    });

    await t.step("should execute a single @code object", () => {
	const codeFn = (op) => "executed";
	codeFn.msjsType = '@code';
	assertEquals(runWhileCode(codeFn), "executed");
    });

    await t.step("should execute a chain of @code objects", () => {
	assertEquals(runWhileCode(codeFn1), finalValue);
    });
});