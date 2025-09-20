import {
	assert,
	assertEquals,
	assertStrictEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { listFromPairs as ls } from "../../src/runtime/runtime.esm.js";
import { reactive } from "../../src/runtime/vendor.esm.js";
import { codeBlock } from "../harness.esm.js";

Deno.test("@reactive Interface", async (t) => {
	const { $c } = globalThis, { getInstance } = $c;

	const newReactive = (initParams = ls()) => getInstance('@reactive', initParams);

	await t.step("should initialize and retrieve a value", () => {
		const r = newReactive(ls([, "initial"]));
		assertEquals(r("rv"), "initial");
	});

	await t.step("should set and retrieve a value", () => {
		const r = newReactive();
		r("set", ls(["v", "new value"]));
		assertEquals(r("rv"), "new value");
	});

	await t.step("should react to changes", async () => {
		const r1 = newReactive(ls([, 1]));
		const cb1 = await codeBlock(() => r1("rv") + 1);
		const r2 = newReactive(ls([ "def", cb1 ]));

		assertEquals(r2("rv"), 2);
		r1("set", ls(["v", 5]));
		assertEquals(r2("rv"), 6);
	});

	await t.step("(batch) should group updates", async () => {
		const r1 = newReactive(ls([, 1]));
		const r2 = newReactive(ls([, 10]));
		let runCount = 0;
		const cb1 = await codeBlock(() => {
			runCount++;
			return r1("rv") + r2("rv");
		});
		const r3 = newReactive(ls([ "def", cb1 ]));

		assertEquals(r3("rv"), 11);
		assertEquals(runCount, 1);

		const cb2 = await codeBlock(() => {
			r1("set", ls(["v", 2]));
			r2("set", ls(["v", 20]));
		});

		r3("batch", ls([, cb2]));

		assertEquals(r3("rv"), 22);
		assertEquals(runCount, 2, "Reactive function should only run once for a batch");
	});

	await t.step("(untr) should prevent tracking", async () => {
		const r1 = newReactive(ls([, 1]));
		const cb1 = await codeBlock(() => r1('rv') + 1);
		const cb2 = await codeBlock(() => r1('untr', ls([, cb1])));
		const r2 = newReactive(ls(['def', cb2]));

		assertEquals(r2('rv'), 2);

		r1("set", ls(["v", 5]));
		assertEquals(r2('rv'), 2, "Value should not have been updated");
	});

	await t.step("consistent JS value of @reactive", () => {
		const jsr = reactive();
		const r = getInstance('@reactive', [jsr]);
		assertStrictEquals(jsr, r('@jsv'), "(@jsv)");
		assertStrictEquals(jsr, r.jsv, ".jsv");
		assertStrictEquals(jsr, r.valueOf(), ".valueOf()");
	});
});