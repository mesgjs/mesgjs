import { describe, it } from '@compat/test';
import { assertStrictEquals } from '@std/assert';
import "../../src/runtime/mesgjs.esm.js";
import { sendAnonMessage } from "../../src/runtime/runtime.esm.js";

describe("sendAnonMessage", () => {
	it("should promote a JS primitive and send it a message", () => {
		const result = sendAnonMessage(3, 'add', 1);
		const internalValue = result.valueOf();
		assertStrictEquals(internalValue, 4);
	});

	it("should send a message to a Mesgjs object", () => {
		const result = sendAnonMessage($c, 'type', $c);
		assertStrictEquals(result, '@core');
	});
});
