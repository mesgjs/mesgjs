import {
	assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import "../../src/runtime/mesgjs.esm.js";
import { debugConfig, getInstance, getInterface } from "../../src/runtime/runtime.esm.js";

debugConfig({ handlerCache: true });

Deno.test("Dispatch Stability", async (t) => {
	await t.step("should handle chained dispatches", () => {
		const order = [];
		const ifA = getInterface(":?");
		ifA.set({
			lock: true,
			handlers: {
				opA: (d) => {
					order.push("ifA.opA");
				},
			},
		});

		const ifB = getInterface(":?");
		ifB.set({
			lock: true,
			chain: [ifA.ifName],
		});

		const instB = getInstance(ifB.ifName);
		let run1, run2;

		order.length = 0;
		instB("opA");
		run1 = order.join(" ");

		order.length = 0;
		instB("opA");
		run2 = order.join(" ");

		assertEquals(run1, "ifA.opA");
		assertEquals(run2, "ifA.opA");
	});

	await t.step("should handle redispatching (default)", () => {
		const order = [];
		const ifA = getInterface(":?");
		ifA.set({
			handlers: {
				opA: (d) => {
					order.push("ifA.opA");
				},
			},
		});

		const ifB = getInterface(":?");
		ifB.set({
			chain: [ifA.ifName],
			handlers: {
				opA: (d) => {
					order.push("ifB.opA");
					d.sm(d, "redis");
				},
			},
		});

		const instB = getInstance(ifB.ifName);
		let run1, run2;

		order.length = 0;
		instB("opA");
		run1 = order.join(" ");

		order.length = 0;
		instB("opA");
		run2 = order.join(" ");

		assertEquals(run1, "ifB.opA ifA.opA");
		assertEquals(run2, "ifB.opA ifA.opA");
	});

	await t.step("should handle redispatching (super-type)", () => {
		const order = [];
		const ifA = getInterface(":?");
		ifA.set({
			lock: true,
			handlers: {
				opA: (d) => {
					order.push("ifA.opA");
				},
			},
		});

		const ifB = getInterface(":?");
		ifB.set({
			lock: true,
			chain: [ifA.ifName],
			handlers: {
				opA: (d) => {
					order.push("ifB.opA");
					d.sm(d, "redis", { type: ifA.ifName });
				},
			},
		});

		const instB = getInstance(ifB.ifName);
		let run1, run2;

		order.length = 0;
		instB("opA");
		run1 = order.join(" ");

		order.length = 0;
		instB("opA");
		run2 = order.join(" ");

		assertEquals(run1, "ifB.opA ifA.opA");
		assertEquals(run2, "ifB.opA ifA.opA");
	});

	await t.step("should handle redispatching (@next)", () => {
		const order = [];
		const ifA = getInterface(":?");
		ifA.set({
			lock: true,
			handlers: {
				opA: (d) => {
					order.push("ifA.opA");
				},
			},
		});

		const ifB = getInterface(":?");
		ifB.set({
			lock: true,
			chain: [ifA.ifName],
			handlers: {
				opA: (d) => {
					order.push("ifB.opA");
					d.sm(d, "redis", { type: "@next" });
				},
			},
		});

		const instB = getInstance(ifB.ifName);
		let run1, run2;

		order.length = 0;
		instB("opA");
		run1 = order.join(" ");

		order.length = 0;
		instB("opA");
		run2 = order.join(" ");

		assertEquals(run1, "ifB.opA ifA.opA");
		assertEquals(run2, "ifB.opA ifA.opA");
	});

	await t.step("should handle complex redispatching", () => {
		const order = [];
		const ifA = getInterface(":?");
		ifA.set({
			lock: true,
			handlers: {
				opA: (d) => {
					order.push("ifA.opA");
				},
			},
		});

		const ifB = getInterface(":?");
		ifB.set({
			lock: true,
			chain: [ifA.ifName],
			handlers: {
				opA: (d) => {
					order.push("ifB.opA");
					d.sm(d, "redis", { op: "opB" });
				},
				opB: (d) => {
					order.push("ifB.opB");
					d.sm(d, "redis", { op: "opA", type: ifA.ifName });
				},
			},
		});

		const instB = getInstance(ifB.ifName);
		let run1, run2;

		order.length = 0;
		instB("opA");
		run1 = order.join(" ");

		order.length = 0;
		instB("opA");
		run2 = order.join(" ");

		assertEquals(run1, "ifB.opA ifB.opB ifA.opA");
		assertEquals(run2, "ifB.opA ifB.opB ifA.opA");
	});

	await t.step("should handle complex redispatching (@next)", () => {
		const order = [];
		const ifA = getInterface(":?");
		ifA.set({
			lock: true,
			handlers: {
				opA: (d) => {
					order.push("ifA.opA");
				},
			},
		});

		const ifB = getInterface(":?");
		ifB.set({
			lock: true,
			chain: [ifA.ifName],
			handlers: {
				opA: (d) => {
					order.push("ifB.opA");
					d.sm(d, "redis", { op: "opB" });
				},
				opB: (d) => {
					order.push("ifB.opB");
					d.sm(d, "redis", { op: "opA", type: "@next" });
				},
			},
		});

		const instB = getInstance(ifB.ifName);
		let run1, run2;

		order.length = 0;
		instB("opA");
		run1 = order.join(" ");

		order.length = 0;
		instB("opA");
		run2 = order.join(" ");

		assertEquals(run1, "ifB.opA ifB.opB ifA.opA");
		assertEquals(run2, "ifB.opA ifB.opB ifA.opA");
	});
});

Deno.test("Dispatch Stability (via JS method)", async (t) => {
	await t.step("should handle chained dispatches", () => {
		const order = [];
		const ifA = getInterface(":?");
		ifA.set({
			lock: true,
			handlers: {
				"@init": (d) => {
					d.rr.opA = function () {
						this("opA");
					};
				},
				opA: (d) => {
					order.push("ifA.opA");
				},
			},
		});

		const ifB = getInterface(":?");
		ifB.set({
			lock: true,
			chain: [ifA.ifName],
		});

		const instB = getInstance(ifB.ifName);
		let run1, run2;

		order.length = 0;
		instB.opA();
		run1 = order.join(" ");

		order.length = 0;
		instB.opA();
		run2 = order.join(" ");

		assertEquals(run1, "ifA.opA");
		assertEquals(run2, "ifA.opA");
	});

	await t.step("should handle redispatching (default)", () => {
		const order = [];
		const ifA = getInterface(":?");
		ifA.set({
			lock: true,
			handlers: {
				"@init": (d) => {
					d.rr.opA = function () {
						this("opA");
					};
				},
				opA: (d) => {
					order.push("ifA.opA");
				},
			},
		});

		const ifB = getInterface(":?");
		ifB.set({
			lock: true,
			chain: [ifA.ifName],
			handlers: {
				opA: (d) => {
					order.push("ifB.opA");
					d.sm(d, "redis");
				},
			},
		});

		const instB = getInstance(ifB.ifName);
		let run1, run2;

		order.length = 0;
		instB.opA();
		run1 = order.join(" ");

		order.length = 0;
		instB.opA();
		run2 = order.join(" ");

		assertEquals(run1, "ifB.opA ifA.opA");
		assertEquals(run2, "ifB.opA ifA.opA");
	});

	await t.step("should handle redispatching (super-type)", () => {
		const order = [];
		const ifA = getInterface(":?");
		ifA.set({
			lock: true,
			handlers: {
				"@init": (d) => {
					d.rr.opA = function () {
						this("opA");
					};
				},
				opA: (d) => {
					order.push("ifA.opA");
				},
			},
		});

		const ifB = getInterface(":?");
		ifB.set({
			lock: true,
			chain: [ifA.ifName],
			handlers: {
				opA: (d) => {
					order.push("ifB.opA");
					d.sm(d, "redis", { type: ifA.ifName });
				},
			},
		});

		const instB = getInstance(ifB.ifName);
		let run1, run2;

		order.length = 0;
		instB.opA();
		run1 = order.join(" ");

		order.length = 0;
		instB.opA();
		run2 = order.join(" ");

		assertEquals(run1, "ifB.opA ifA.opA");
		assertEquals(run2, "ifB.opA ifA.opA");
	});

	await t.step("should handle redispatching (@next)", () => {
		const order = [];
		const ifA = getInterface(":?");
		ifA.set({
			lock: true,
			handlers: {
				"@init": (d) => {
					d.rr.opA = function () {
						this("opA");
					};
				},
				opA: (d) => {
					order.push("ifA.opA");
				},
			},
		});

		const ifB = getInterface(":?");
		ifB.set({
			lock: true,
			chain: [ifA.ifName],
			handlers: {
				opA: (d) => {
					order.push("ifB.opA");
					d.sm(d, "redis", { type: "@next" });
				},
			},
		});

		const instB = getInstance(ifB.ifName);
		let run1, run2;

		order.length = 0;
		instB.opA();
		run1 = order.join(" ");

		order.length = 0;
		instB.opA();
		run2 = order.join(" ");

		assertEquals(run1, "ifB.opA ifA.opA");
		assertEquals(run2, "ifB.opA ifA.opA");
	});

	await t.step("should handle complex redispatching", () => {
		const order = [];
		const ifA = getInterface(":?");
		ifA.set({
			lock: true,
			handlers: {
				"@init": (d) => {
					d.rr.opA = function () {
						this("opA");
					};
				},
				opA: (d) => {
					order.push("ifA.opA");
				},
			},
		});

		const ifB = getInterface(":?");
		ifB.set({
			lock: true,
			chain: [ifA.ifName],
			handlers: {
				opA: (d) => {
					order.push("ifB.opA");
					d.sm(d, "redis", { op: "opB" });
				},
				opB: (d) => {
					order.push("ifB.opB");
					d.sm(d, "redis", { op: "opA", type: ifA.ifName });
				},
			},
		});

		const instB = getInstance(ifB.ifName);
		let run1, run2;

		order.length = 0;
		instB.opA();
		run1 = order.join(" ");

		order.length = 0;
		instB.opA();
		run2 = order.join(" ");

		assertEquals(run1, "ifB.opA ifB.opB ifA.opA");
		assertEquals(run2, "ifB.opA ifB.opB ifA.opA");
	});

	await t.step("should handle complex redispatching (@next)", () => {
		const order = [];
		const ifA = getInterface(":?");
		ifA.set({
			lock: true,
			handlers: {
				"@init": (d) => {
					d.rr.opA = function () {
						this("opA");
					};
				},
				opA: (d) => {
					order.push("ifA.opA");
				},
			},
		});

		const ifB = getInterface(":?");
		ifB.set({
			lock: true,
			chain: [ifA.ifName],
			handlers: {
				opA: (d) => {
					order.push("ifB.opA");
					d.sm(d, "redis", { op: "opB" });
				},
				opB: (d) => {
					order.push("ifB.opB");
					d.sm(d, "redis", { op: "opA", type: "@next" });
				},
			},
		});

		const instB = getInstance(ifB.ifName);
		let run1, run2;

		order.length = 0;
		instB.opA();
		run1 = order.join(" ");

		order.length = 0;
		instB.opA();
		run2 = order.join(" ");

		assertEquals(run1, "ifB.opA ifB.opB ifA.opA");
		assertEquals(run2, "ifB.opA ifB.opB ifA.opA");
	});
});
