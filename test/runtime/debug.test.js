import {
	assert,
	assertEquals,
	assertStringIncludes,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import { spy, assertSpyCalls } from "https://deno.land/std@0.152.0/testing/mock.ts";
import '../../src/runtime/mesgjs.esm.js';
import { debugConfig, getInterface, getInstance } from '../../src/runtime/runtime.esm.js';

Deno.test("Debug System End-to-End Tracing", async (t) => {

	const iface = getInterface("debug-test-iface");
	iface.set({
		handlers: {
			"double": (d) => {
				const input = d.mp.at(0);
				return input * 2;
			}
		}
	});
	const instance = getInstance("debug-test-iface");

	// Capture original config to restore it later
	const originalConfig = debugConfig().storage;
	let logSpy, warnSpy;

	await t.step("should produce correct dispatch, param, and return logs", () => {
		try {
			logSpy = spy(console, "log");
			warnSpy = spy(console, "warn");

			debugConfig({
				dispatch: true,
				dispatchTypes: true,
				stack: 1, // Keep stack trace minimal for this test
			});

			const result = instance("double", 5);

			assertEquals(result, 10);

			// Check for the expected log messages
			const firstLog = logSpy.calls[0].args[0];
			const secondLog = logSpy.calls[1].args[0];

			assertStringIncludes(firstLog, "Mesgjs dispatch");
			assertStringIncludes(firstLog, "@u => debug-test-iface(double J.number)");

			assertStringIncludes(secondLog, "Mesgjs return");
			assertStringIncludes(secondLog, "J.number"); // The return type of 10

			assertSpyCalls(warnSpy, 0); // No warnings should be issued

		} finally {
			logSpy?.restore();
			warnSpy?.restore();
			debugConfig(originalConfig); // Cleanup
		}
	});

	await t.step("anonymous call: only msjsR$RecvMsg is active during handler (not msjsS$SendMsg)", () => {
		// For an anonymous call (instance(op, mp)), the trampoline design means:
		// - msjsR$RecvMsg calls dispatch(), gets the handler, then calls handler() directly
		// - msjsS$SendMsg is NOT on the stack during handler execution
		// We verify this by capturing the JS call stack from inside the handler.
		let capturedStack = null;

		const aif = getInterface(":?");
		aif.set({
			handlers: {
				captureStack: (_d) => {
					capturedStack = new Error().stack || '';
				}
			}
		});
		const inst = getInstance(aif.ifName);

		inst("captureStack");

		assert(capturedStack !== null, "Handler was not called");
		// msjsR$RecvMsg should be present (anonymous call path)
		assertStringIncludes(capturedStack, "msjsR$");
		// msjsS$SendMsg should NOT be present (trampoline: sender frame is gone)
		assertEquals(capturedStack.includes("msjsS$"), false,
			"msjsS$SendMsg should not be on the stack during an anonymous call handler");
	});

	await t.step("attributed call: only msjsS$SendMsg is active during handler (not msjsR$RecvMsg)", () => {
		// For an attributed call (d.sm(d, op, mp)), the trampoline design means:
		// - msjsS$SendMsg calls rr() to get rrThis (baton handshake), then calls dispatch(), then handler()
		// - msjsR$RecvMsg is NOT on the stack during handler execution (it returned after the baton handshake)
		// We verify this by capturing the JS call stack from inside the handler.
		let capturedStack = null;

		const aif = getInterface(":?");
		aif.set({
			handlers: {
				getD: (d) => d,
				captureStack: (_d) => {
					capturedStack = new Error().stack || '';
				}
			}
		});
		const inst = getInstance(aif.ifName);

		// Get a dispatch object so we can use d.sm for an attributed call
		const d = inst("getD");
		d.sm(inst, "captureStack");

		assert(capturedStack !== null, "Handler was not called");
		// msjsS$SendMsg should be present (attributed call path)
		assertStringIncludes(capturedStack, "msjsS$");
		// msjsR$RecvMsg should NOT be present (trampoline: receiver frame is gone after baton handshake)
		assertEquals(capturedStack.includes("msjsR$"), false,
			"msjsR$RecvMsg should not be on the stack during an attributed call handler");
	});

	await t.step("stack tracing: Mesgjs dispatch stack is appended to exception on error", () => {
		// When stack > 0 and an exception is thrown, appendStackTrace should add
		// the '-- Mesgjs Dispatch Stack --' section to the error's .stack string.
		const aif = getInterface(":?");
		aif.set({
			handlers: {
				throwOp: (_d) => {
					throw new Error("test-exception");
				}
			}
		});
		const inst = getInstance(aif.ifName);

		try {
			debugConfig({ stack: 1 });
			let caughtError = null;
			try {
				inst("throwOp");
			} catch (e) {
				caughtError = e;
			}
			assert(caughtError !== null, "Exception was not thrown");
			assertStringIncludes(caughtError.stack, "-- Mesgjs Dispatch Stack --",
				"Mesgjs dispatch stack header should be appended to the error stack");
			assertStringIncludes(caughtError.stack, "throwOp",
				"The dispatched operation name should appear in the Mesgjs stack trace");
		} finally {
			debugConfig(originalConfig);
		}
	});

	await t.step("stack tracing: Mesgjs stack entry shows correct sender and receiver types", () => {
		// The stack entry format is: "${sender_type} => ${receiver_type}(${op})"
		// For an anonymous call, sender type is '@u' (undefined).
		const aif = getInterface(":?");
		aif.set({
			handlers: {
				namedOp: (_d) => {
					throw new Error("stack-format-test");
				}
			}
		});
		const inst = getInstance(aif.ifName);

		try {
			debugConfig({ stack: 1 });
			let caughtError = null;
			try {
				inst("namedOp");
			} catch (e) {
				caughtError = e;
			}
			assert(caughtError !== null, "Exception was not thrown");
			// Anonymous call: sender is @u, receiver is the interface type
			assertStringIncludes(caughtError.stack, `@u => ${aif.ifName}(namedOp)`,
				"Stack entry should show '@u => interfaceType(op)' for anonymous calls");
		} finally {
			debugConfig(originalConfig);
		}
	});

	await t.step("stack tracing: attributed call shows correct sender type in stack entry", () => {
		// For an attributed call (d.sm(d, op, mp)), the sender type should be the
		// type of the object that owns the dispatch object (d.rt).
		const senderIf = getInterface(":?");
		const receiverIf = getInterface(":?");
		let caughtError = null;

		senderIf.set({
			handlers: {
				doSend: (d) => {
					// Get a receiver instance and send an attributed message to it
					const recv = getInstance(receiverIf.ifName);
					d.sm(recv, "throwOp");
				}
			}
		});
		receiverIf.set({
			handlers: {
				throwOp: (_d) => {
					throw new Error("attributed-stack-test");
				}
			}
		});

		const senderInst = getInstance(senderIf.ifName);

		try {
			debugConfig({ stack: 2 });
			try {
				senderInst("doSend");
			} catch (e) {
				caughtError = e;
			}
			assert(caughtError !== null, "Exception was not thrown");
			assertStringIncludes(caughtError.stack, "-- Mesgjs Dispatch Stack --",
				"Mesgjs dispatch stack header should be present");
			// The attributed throwOp call should show the sender type
			assertStringIncludes(caughtError.stack, `${senderIf.ifName} => ${receiverIf.ifName}(throwOp)`,
				"Stack entry should show 'senderType => receiverType(op)' for attributed calls");
		} finally {
			debugConfig(originalConfig);
		}
	});
});
