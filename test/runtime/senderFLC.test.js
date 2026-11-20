import { describe, it } from '@compat/test';
import { assert, assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { getInterface, getInstance, senderFLC } from '../../src/runtime/runtime.esm.js';

// Set up a shared interface for senderFLC tests
const flcIface = getInterface(":?");
let capturedFLC = null;

flcIface.set({
	handlers: {
		// Anonymous call: senderFLC() should report the caller of inst(op)
		captureAnon: (_d) => {
			capturedFLC = senderFLC();
		},
		// Attributed call: senderFLC() should report the caller of d.sm(recv, op)
		captureAttr: (_d) => {
			capturedFLC = senderFLC();
		},
		// Helper to get a dispatch object for attributed calls
		getD: (d) => d,
	}
});

const flcInst = getInstance(flcIface.ifName);

describe("senderFLC", () => {
	it("senderFLC - anonymous call", () => {
		capturedFLC = null;
		$c.sm(flcInst, "captureAnon"); // <-- this line should be reported
		const flc = capturedFLC;

		assert(flc, "senderFLC should return an object for an anonymous call");
		assertStrictEquals(flc.file.endsWith("/runtime/senderFLC.test.js"), true,
			"senderFLC should report the test file as the source");
		assertStrictEquals(typeof flc.line, "number",
			"senderFLC should report the line of the anonymous call site");
		assertStrictEquals(typeof flc.column, "number",
			"senderFLC should report a column number");
	});

	it("senderFLC - attributed call", () => {
		capturedFLC = null;
		const d = $c.sm(flcInst, "getD");
		d.sm(flcInst, "captureAttr"); // <-- this line should be reported
		const flc = capturedFLC;

		assert(flc, "senderFLC should return an object for an attributed call");
		assertStrictEquals(flc.file.endsWith("/runtime/senderFLC.test.js"), true,
			"senderFLC should report the test file as the source");
		assertStrictEquals(typeof flc.line, "number",
			"senderFLC should report the line of the attributed call site");
		assertStrictEquals(typeof flc.column, "number",
			"senderFLC should report a column number");
	});
});
