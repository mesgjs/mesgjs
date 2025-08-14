import {
    assertEquals,
    assert,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { sendAnonMessage } from "../../src/runtime/runtime.esm.js";

Deno.test("sendAnonMessage", async (t) => {

    await t.step("should promote a JS primitive and send it a message", () => {
	const result = sendAnonMessage(3, 'add', 1);
	const internalValue = result.valueOf();
	assertEquals(internalValue, 4);
    });

    await t.step("should send a message to a Mesgjs object", () => {
	const str = globalThis.$toMsjs("hello");
	const result = sendAnonMessage(str, "length");
	const internalValue = result.valueOf();
	assertEquals(internalValue, 5);
    });

});