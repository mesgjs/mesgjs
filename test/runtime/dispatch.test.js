import {
	assertEquals,
	assert,
	assertNotEquals,
	assertThrows,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { getInstance, getInterface, typeAccepts } from "../../src/runtime/runtime.esm.js";

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

	await t.step("should throw when receiving an anonymous message", () => {
		const aif1 = getInterface(":?");
		aif1.set({
			handlers: {
				getD: (d) => d,
			},
		});
		const inst1 = getInstance(aif1.ifName);
		const d = inst1("getD");
		assertThrows(() => d("op"), TypeError, "@dispatch messages must be attributed");
	});
});

Deno.test("Message Dispatching (@init)", async (t) => {
	await t.step("should not error on missing @init", () => {
		const aif1 = getInterface(":?");
		const inst1 = getInstance(aif1.ifName);
		assertEquals(inst1('@init'), undefined);
		assertEquals(typeAccepts(aif1.ifName, '@init'), [aif1.ifName, 'specific']);
	});

	await t.step("should call @init on getInstance", () => {
		const aif1 = getInterface(":?");
		let called = false;
		aif1.set({
			handlers: {
				'@init': () => {
					called = true;
				},
			},
		});
		getInstance(aif1.ifName);
		assert(called, "The @init handler was not called on getInstance");
	});

	await t.step("should bypass @init after getInstance", () => {
		const aif1 = getInterface(":?");
		let callCount = 0;
		aif1.set({
			handlers: {
				'@init': () => {
					callCount++;
				},
			},
		});
		const inst1 = getInstance(aif1.ifName);
		assertEquals(callCount, 1);
		inst1('@init');
		assertEquals(callCount, 1, "The @init handler was called after getInstance");
	});

	await t.step("should allow direct @init redispatch during getInstance", () => {
		let subInit = false, superInit = false;
		const superIF = getInterface(':?');
		superIF.set({
			handlers: {
				'@init': (d) => {
					superInit = true;
					assertEquals(d.dop, '@init');
					assertEquals(d.mop, '@init');
				}
			}
		});
		const subIF = getInterface(':?');
		subIF.set({
			chain: [superIF.ifName],
			handlers: {
				'@init': (d) => {
					subInit = true;
					assertEquals(d.dop, '@init');
					assertEquals(d.mop, '@init');
					d.sm(d, 'redis');
				}
			}
		});
		getInstance(subIF.ifName);
		assert(subInit, "Sub-interface @init was not called");
		assert(superInit, "Super-interface @init was not called via redispatch");
	});

	await t.step("should allow indirect @init redispatch during getInstance", () => {
		let subInit = false, subOther = false, superInit = false;
		const superIF = getInterface(':?');
		superIF.set({
			handlers: {
				'@init': (d) => {
					superInit = true;
					assertEquals(d.dop, '@init');
					assertEquals(d.mop, '@init');
				}
			}
		});
		const subIF = getInterface(':?');
		subIF.set({
			chain: [superIF.ifName],
			handlers: {
				'@init': (d) => {
					subInit = true;
					assertEquals(d.dop, '@init');
					assertEquals(d.mop, '@init');
					d.sm(d, 'redis', { op: 'other' });
				},
				'other': (d) => {
					subOther = true;
					// NB: because the op is changing, we must explicitly request the next interface to prevent infinite looping
					d.sm(d, 'redis', { op: '@init', type: '@next' });
				}
			}
		});
		getInstance(subIF.ifName);
		assert(subInit, 'Sub-interface @init was not called');
		assert(subOther, 'Sub-interface other-op was not called');
		assert(superInit, 'Super-interface @init was not called via indirect redispatch');
	});

	await t.step("should bypass @init from another object during @init", () => {
		let initA = 0, initB = 0, resultB = null;
		const ifA = getInterface(':?'), ifB = getInterface(':?');
		ifA.set({
			handlers: {
				'@init': (d) => {
					++initA;
					if (d.mp.at(0)) {
						getInstance(ifB.ifName, [ d.rr ]);
					}
					return 'A(@init)';
				}
			}
		});
		ifB.set({
			handlers: {
				'@init': (d) => {
					++initB;
					resultB = d.mp.at(0)('@init');
				}
			}
		});
		getInstance(ifA.ifName, [ true ]);
		assertEquals(initA, 1, "Object A @init was not called exactly once");
		assertEquals(initB, 1, "Object B @init was not called exactly once");
		assertEquals(resultB, undefined, "B's call to A(@init) was not bypassed");
	});
});
