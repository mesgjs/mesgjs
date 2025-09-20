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
});
