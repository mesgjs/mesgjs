import { assertEquals } from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { loggedType, getInstance } from "../../src/runtime/runtime.esm.js";

Deno.test("loggedType", async (t) => {

    await t.step("should log primitive types correctly", () => {
	assertEquals(loggedType(true), "@t");
	assertEquals(loggedType(false), "@f");
	assertEquals(loggedType(null), "@n");
	assertEquals(loggedType(undefined), "@u");
    });

    await t.step("should log standard JavaScript types correctly", () => {
	assertEquals(loggedType(123), "J.number");
	assertEquals(loggedType("hello"), "J.string");
	assertEquals(loggedType({ a: 1 }), "J.Object");
	assertEquals(loggedType([1, 2]), "J.Array");
	assertEquals(loggedType(() => {}), "J.function");
    });

    await t.step("should log Mesgjs objects correctly", () => {
	const msjsString = getInstance("@string", ["test"]);
	const msjsNumber = getInstance("@number", [42]);
	const msjsPromise = getInstance("@promise");

	assertEquals(loggedType(msjsString), "M.@string");
	assertEquals(loggedType(msjsNumber), "M.@number");
	assertEquals(loggedType(msjsPromise), "M.@promise");
    });

});