import { describe, it } from '@compat/test';
import { assert, assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { debugConfig, getInterface, getInstance } from '../../src/runtime/runtime.esm.js';

function createSpy (target, methodName) {
	const original = target[methodName];
	const calls = [];
	const spyFn = function (...args) {
		calls.push({ args, this: this });
		return original?.apply(this, args);
	};
	spyFn.calls = calls;
	spyFn.restore = () => {
		target[methodName] = original;
	};
	target[methodName] = spyFn;
	return spyFn;
}

describe("Debug System End-to-End Tracing", () => {
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

	it("should produce correct dispatch, param, and return logs", () => {
		try {
			logSpy = createSpy(console, "log");
			warnSpy = createSpy(console, "warn");

			debugConfig({
				dispatch: true,
				dispatchTypes: true,
				stack: 1, // Keep stack trace minimal for this test
			});

			const result = $c.sm(instance, "double", 5);

			assertStrictEquals(result, 10);

			// Check for the expected log messages
			const firstLog = logSpy.calls[0].args[0];
			const secondLog = logSpy.calls[1].args[0];

			assert(firstLog.includes("Mesgjs dispatch"));
			assert(firstLog.includes("@u => debug-test-iface(double J.number)"));

			assert(secondLog.includes("Mesgjs return"));
			assert(secondLog.includes("J.number")); // The return type of 10

			assertStrictEquals(warnSpy.calls.length, 0); // No warnings should be issued

		} finally {
			logSpy?.restore();
			warnSpy?.restore();
			debugConfig(originalConfig); // Cleanup
		}
	});

	it({
		name: "anonymous call: only MsjsObject.sm is active during handler (not MsjsDispatch.sm)",
		bun: false,
		fn: () => {
			// For an anonymous call ($c.sm(instance, op, mp)), the trampoline design means:
			// - MsjsObject.sm gets the handler, then invokes the handler directly
			// - MsjsDispatch.sm is NOT on the stack during handler execution
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

			$c.sm(inst, "captureStack");

			assert(capturedStack !== null, "Handler was not called");
			// MsjsObject.sm should be present (anonymous call path)
			assert(capturedStack.includes("MsjsObject.sm"));
			// MsjsDispatch.sm should NOT be present
			assertStrictEquals(capturedStack.includes("MsjsDispatch.sm"), false,
				"MsjsDispatch should not be on the stack during an anonymous call handler");
		}
	});

	it({
		name: "attributed call: only MsjsDispatch.sm is active during handler (not MsjsObject.sm)",
		bun: false,
		fn: () => {
			// For an attributed call (d.sm(rr, op, mp)), the trampoline design means:
			// - MsjsDispatch.sm gets the handler, then invokes the handler directly
			// - MsjsObject.sm is NOT on the stack during handler execution
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
			const d = $c.sm(inst, "getD");
			d.sm(inst, "captureStack");

			assert(capturedStack !== null, "Handler was not called");
			// msjsS$SendMsg should be present (attributed call path)
			assert(capturedStack.includes("MsjsDispatch.sm"));
			// msjsR$RecvMsg should NOT be present (trampoline: receiver frame is gone after baton handshake)
			assertStrictEquals(capturedStack.includes("MsjsObject.sm"), false,
				"msjsR$RecvMsg should not be on the stack during an attributed call handler");
		}
	});

	it("stack tracing: Mesgjs dispatch stack is appended to exception on error", () => {
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
				$c.sm(inst, "throwOp");
			} catch (e) {
				caughtError = e;
			}
			assert(caughtError !== null, "Exception was not thrown");
			assert(caughtError.stack.includes("-- Mesgjs Dispatch Stack --"),
				"Mesgjs dispatch stack header should be appended to the error stack");
			assert(caughtError.stack.includes("throwOp"),
				"The dispatched operation name should appear in the Mesgjs stack trace");
		} finally {
			debugConfig(originalConfig);
		}
	});

	it("stack tracing: Mesgjs stack entry shows correct sender and receiver types", () => {
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
				$c.sm(inst, "namedOp");
			} catch (e) {
				caughtError = e;
			}
			assert(caughtError !== null, "Exception was not thrown");
			// Anonymous call: sender is @u, receiver is the interface type
			assert(caughtError.stack.includes(`@u => ${aif.ifName}(namedOp)`),
				"Stack entry should show '@u => interfaceType(op)' for anonymous calls");
		} finally {
			debugConfig(originalConfig);
		}
	});

	it("stack tracing: attributed call shows correct sender type in stack entry", () => {
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
				$c.sm(senderInst, "doSend");
			} catch (e) {
				caughtError = e;
			}
			assert(caughtError !== null, "Exception was not thrown");
			assert(caughtError.stack.includes("-- Mesgjs Dispatch Stack --"),
				"Mesgjs dispatch stack header should be present");
			// The attributed throwOp call should show the sender type
			assert(caughtError.stack.includes(`${senderIf.ifName} => ${receiverIf.ifName}(throwOp)`),
				"Stack entry should show 'senderType => receiverType(op)' for attributed calls");
		} finally {
			debugConfig(originalConfig);
		}
	});
});
