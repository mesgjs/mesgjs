import {
	assert,
	assertEquals,
	assertStrictEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { codeBlock } from "../harness.esm.js";

Deno.test("@core Interface Logic and Flow Control", async (t) => {
	const { $c, $t, $f, $n, $u, NANOS } = globalThis;
	const { getInstance } = $c;

	await t.step("consistant instances", () => {
		assertStrictEquals($c, getInstance('@core'));
	});

	await t.step("(and) should return first falsey or last truthy value", () => {
		assertEquals($c.sm($c, "and", [$t, $t, "last"]), "last");
		assertEquals($c.sm($c, "and", [$t, $f, "never"]), false);
		assertEquals($c.sm($c, "and", []), true); // Default
	});

	await t.step("(or) should return first truthy or last falsey value", () => {
		assertEquals($c.sm($c, "or", [$f, "first", $t]), "first");
		assertEquals($c.sm($c, "or", [$f, 0, $n]), null);
		assertEquals($c.sm($c, "or", []), false); // Default
	});

	await t.step("(not) should return the logical opposite", () => {
		assertEquals($c.sm($c, "not", $t), false);
		assertEquals($c.sm($c, "not", "hello"), false);
		assertEquals($c.sm($c, "not", ""), true);
	});

	await t.step("(xor) should return the value if exactly one is true", () => {
		assertEquals($c.sm($c, "xor", [$f, "one", $f]), "one");
		assertEquals($c.sm($c, "xor", ["one", "two", $f]), false);
		assertEquals($c.sm($c, "xor", [$f, $t, $f, $f]), true);
		assertEquals($c.sm($c, "xor", [$f, $f]), false);
	});

	await t.step("(if) should execute the correct branch", () => {
		assertEquals($c.sm($c, "if", [$t, "A", $f, "B"]), "A");
		assertEquals($c.sm($c, "if", [$f, "A", $t, "B"]), "B");
		const params = new NANOS($f, "A", $f, "B", { else: "C" });
		assertEquals($c.sm($c, "if", params), "C");
		assertEquals($c.sm($c, "if", [0, "A", 1, "B"]), "B");
	});

	await t.step("aliases should work like their primary operations", () => {
		// & -> and
		assertEquals($c.sm($c, "&", [$t, $t]), true);
		assertEquals($c.sm($c, "&", [$t, $f]), false);
		// | -> or
		assertEquals($c.sm($c, "|", [$f, $t]), true);
		assertEquals($c.sm($c, "|", [$f, $f]), false);
		// ~ -> not
		assertEquals($c.sm($c, "~", $t), false);
		assertEquals($c.sm($c, "~", $f), true);
		// ? -> if
		assertEquals($c.sm($c, "?", [$t, "A"]), "A");
		// + -> get
		assertEquals($c.sm($c, "+", "@string").msjsType, "@string");
	});

	await t.step("(await) should evaluate blocks in order", async () => {
		const order = [];
		const slow = codeBlock(() => new Promise(resolve => setTimeout(() => {
			order.push('slow');
			resolve('slow');
		}, 20)));
		const fast = codeBlock(() => new Promise(resolve => setTimeout(() => {
			order.push('fast');
			resolve('fast');
		}, 10)));

		const p = $c.sm($c, "await", [slow, fast]);

		assertEquals(p.msjsType, "@promise");

		const result = await p;
		assertEquals(order, ["slow", "fast"]);
		assertEquals(result, "fast");
	});

	await t.step("(await collect=@t) should collect results", async () => {
		const slow = codeBlock(() => new Promise(resolve => setTimeout(() => resolve('slow'), 20)));
		const fast = codeBlock(() => new Promise(resolve => setTimeout(() => resolve('fast'), 10)));

		const p = $c.sm($c, "await", new NANOS(slow, fast, { collect: true }));
		const result = await p;

		assertEquals(result.next, 2);
		assertEquals(result.at(0), 'slow');
		assertEquals(result.at(1), 'fast');
	});
});
