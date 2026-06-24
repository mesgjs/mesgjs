import {
	assert,
	assertEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
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

Deno.test("senderFLC - anonymous call", () => {
	capturedFLC = null;
	flcInst("captureAnon"); // <-- this line should be reported
	const flc = capturedFLC;

	assert(flc, "senderFLC should return an object for an anonymous call");
	assertEquals(flc.file.endsWith("/runtime/senderFLC.test.js"), true,
		"senderFLC should report the test file as the source");
	// The line above is the call site; adjust if this file changes.
	assertEquals(typeof flc.line, "number",
		"senderFLC should report the line of the anonymous call site");
	assertEquals(typeof flc.column, "number",
		"senderFLC should report a column number");
});

Deno.test("senderFLC - attributed call", () => {
	capturedFLC = null;
	const d = flcInst("getD");
	d.sm(flcInst, "captureAttr"); // <-- this line should be reported
	const flc = capturedFLC;

	assert(flc, "senderFLC should return an object for an attributed call");
	assertEquals(flc.file.endsWith("/runtime/senderFLC.test.js"), true,
		"senderFLC should report the test file as the source");
	// The line above is the call site; adjust if this file changes.
	assertEquals(typeof flc.line, "number",
		"senderFLC should report the line of the attributed call site");
	assertEquals(typeof flc.column, "number",
		"senderFLC should report a column number");
});
