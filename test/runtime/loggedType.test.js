import { describe, it } from '@compat/test';
import { assertStrictEquals } from '@std/assert';
import "../../src/runtime/mesgjs.esm.js";
import { loggedType, getInstance } from "../../src/runtime/runtime.esm.js";

describe("loggedType", () => {
	it("should log primitive types correctly", () => {
		assertStrictEquals(loggedType(true), "@t");
		assertStrictEquals(loggedType(false), "@f");
		assertStrictEquals(loggedType(null), "@n");
		assertStrictEquals(loggedType(undefined), "@u");
	});

	it("should log standard JavaScript types correctly", () => {
		assertStrictEquals(loggedType(123), "J.number");
		assertStrictEquals(loggedType("hello"), "J.string");
		assertStrictEquals(loggedType({ a: 1 }), "J.Object");
		assertStrictEquals(loggedType([1, 2]), "J.Array");
		assertStrictEquals(loggedType(() => {}), "J.function");
	});

	it("should log Mesgjs objects correctly", () => {
		const msjsString = getInstance("@string", ["test"]);
		const msjsNumber = getInstance("@number", [42]);
		const msjsPromise = getInstance("@promise");

		assertStrictEquals(loggedType(msjsString), "M.@string");
		assertStrictEquals(loggedType(msjsNumber), "M.@number");
		assertStrictEquals(loggedType(msjsPromise), "M.@promise");
	});
});
