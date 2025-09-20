import {
	assertEquals,
	assert,
	assertNotEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { getInstance, getInterface } from "../../src/runtime/runtime.esm.js";

Deno.test("Message Dispatching", async (t) => {
	const msgd = (d, op, mp) => d.sm(d, op, mp);

	await t.step("should create and configure two anonymous interfaces", () => {
		const aif1 = getInterface(":?");
		assert(aif1.ifName, "Interface name (.ifName) is missing");
		assert(aif1.ifName[0] === ":" && aif1.ifName[1] === "?" && aif1.ifName !== ":?", `Unexpected interface name ${aif1.ifName}`);
		aif1.set({
			handlers: {
				both: (d) => [d, "both", msgd(d, "redis")],
				getD: (d) => [d, "getD"],
				redis: (d) => msgd(d, { op: "redis", params: d.mp }),
				"@default": (d) => [d, "default"],
			},
		});
		const inst1 = getInstance(aif1.ifName);
		assertEquals(inst1.msjsType, aif1.ifName);
		const aif2 = getInterface(":?");
		assert(aif2.ifName[0] === ":" && aif2.ifName[1] === "?" && aif2.ifName !== ":?", `Unexpected interface name ${aif2.ifName}`);
		assertNotEquals(aif1.ifName, aif2.ifName, `Both interfaces are named ${aif1.ifName}`);
	});

	await t.step("should handle basic dispatching", () => {
		const aif1 = getInterface(":?");
		aif1.set({
			handlers: {
				getD: (d) => [d, "getD"],
			},
		});
		const inst1 = getInstance(aif1.ifName);
		const d = inst1("getD");
		assertEquals(d[1], "getD");
		assertEquals(d[0].rr, inst1);
		assertEquals(msgd(d[0], "rr"), inst1);
		assertEquals(d[0].rt, inst1.msjsType);
		assertEquals(msgd(d[0], "rt"), inst1.msjsType);
		assertEquals(d[0].ht, inst1.msjsType);
		assertEquals(msgd(d[0], "ht"), inst1.msjsType);
		assertEquals(d[0].dop, "getD");
		assertEquals(msgd(d[0], "dop"), "getD");
		assertEquals(d[0].mop, "getD");
		assertEquals(msgd(d[0], "mop"), "getD");
	});

	await t.step("should handle redispatching", () => {
		const aif1 = getInterface(":?");
		aif1.set({
			handlers: {
				getD: (d) => [d, "getD"],
				redis: (d) => d.sm(d, { op: "redis", params: d.mp }),
				"@default": (d) => [d, "default"],
			},
		});
		const inst1 = getInstance(aif1.ifName);
		assertEquals(inst1("redis", {}), undefined);
		const d = inst1("redis", { op: "getD" });
		assertEquals(d[1], "getD");
		assertEquals(d[0].dop, "getD");
		assertEquals(d[0].mop, "redis");
	});

	await t.step("should fall back to the default handler", () => {
		const aif1 = getInterface(":?");
		aif1.set({
			handlers: {
				"@default": (d) => [d, "default"],
			},
		});
		const inst1 = getInstance(aif1.ifName);
		const d = inst1({ op: "noSuchMessage", else: [0, "else"] });
		assertEquals(d[1], "default");
		assertEquals(d[0].dop, "noSuchMessage");
	});

	await t.step("should handle chained dispatches", () => {
		const aif1 = getInterface(":?");
		aif1.set({
			handlers: {
				both: (d) => [d, "both", d.sm(d, "redis")],
				 getD: (d) => [d, "getD"],
				"@default": (d) => [d, "default", d.sm(d, "redis")],
			},
		});
		const aif2 = getInterface(":?");
		aif2.set({
			chain: [aif1.ifName],
			handlers: {
				both: (d) => [d, "both", d.sm(d, "redis")],
				only2: (d) => [d, "only2", d.sm(d, "redis")],
				"@default": (d) => [d, "default", d.sm(d, "redis")],
			},
		});
		const inst2 = getInstance(aif2.ifName);
		let d = inst2("getD");
		assertEquals(d[0].ht, aif1.ifName);
		assertEquals(d[0].rr, inst2);
		assertEquals(d[0].rt, aif2.ifName);
		d = inst2("only2");
		assertEquals(d[1], "only2");
		assertEquals(d[2], undefined);
		d = inst2("both");
		assertEquals(d[1], "both");
		assertEquals(d[2][1], "both");
		assertEquals(d[2][2], undefined);
		d = inst2("noSuchMessage");
		assertEquals(d[1], "default");
		assertEquals(d[2][1], "default");
	});
});