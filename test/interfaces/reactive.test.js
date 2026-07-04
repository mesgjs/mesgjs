import {
	assert,
	assertEquals,
	assertStrictEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { listFromPairs as ls } from "../../src/runtime/runtime.esm.js";
import { reactive } from "@reactive";
import { codeBlock } from "../harness.esm.js";

Deno.test("@reactive Interface", async (t) => {
	const { $c } = globalThis, { getInstance } = $c;
	const reactiveBox = getInstance('@reactive');
	const newReactive = (initParams = ls()) => $c.sm(reactiveBox, 'new', initParams);

	await t.step("should initialize and retrieve a value", () => {
		const r = newReactive(ls([, "initial"]));
		assertEquals($c.sm(r, "rv"), "initial");
	});

	await t.step("should set and retrieve a value", () => {
		const r = newReactive();
		$c.sm(r, "set", ls(["v", "new value"]));
		assertEquals($c.sm(r, "rv"), "new value");
	});

	await t.step("should react to changes", async () => {
		const r1 = newReactive(ls([, 1]));
		const cb1 = codeBlock(() => $c.sm(r1, "rv") + 1);
		const r2 = newReactive(ls([ "def", cb1 ]));

		assertEquals($c.sm(r2, "rv"), 2);
		$c.sm(r1, "set", ls(["v", 5]));
		assertEquals($c.sm(r2, "rv"), 6);
	});

	await t.step("(batch) should group updates", async () => {
		const r1 = newReactive(ls([, 1]));
		const r2 = newReactive(ls([, 10]));
		let runCount = 0;
		const cb1 = codeBlock(() => {
			runCount++;
			return $c.sm(r1, "rv") + $c.sm(r2, "rv");
		});
		const r3 = newReactive(ls([ "def", cb1 ]));

		assertEquals($c.sm(r3, "rv"), 11);
		assertEquals(runCount, 1);

		const cb2 = codeBlock(() => {
			$c.sm(r1, "set", ls(["v", 2]));
			$c.sm(r2, "set", ls(["v", 20]));
		});

		$c.sm(r3, "batch", ls([, cb2]));

		assertEquals($c.sm(r3, "rv"), 22);
		assertEquals(runCount, 2, "Reactive function should only run once for a batch");
	});

	await t.step("(untr) should prevent tracking", async () => {
		const r1 = newReactive(ls([, 1]));
		const cb1 = codeBlock(() => $c.sm(r1, 'rv') + 1);
		const cb2 = codeBlock(() => $c.sm(r1, 'untr', ls([, cb1])));
		const r2 = newReactive(ls(['def', cb2]));

		assertEquals($c.sm(r2, 'rv'), 2);

		$c.sm(r1, "set", ls(["v", 5]));
		assertEquals($c.sm(r2, 'rv'), 2, "Value should not have been updated");
	});

	await t.step("consistent JS value of @reactive", () => {
		const jsr = reactive();
		assertStrictEquals(jsr, $c.sm(jsr, '@jsv'));
	});
});
