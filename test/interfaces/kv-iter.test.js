import {
	assertEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { listFromPairs as ls } from "../../src/runtime/runtime.esm.js";
import { codeBlock } from "../harness.esm.js";

Deno.test("@kvIter Interface", async (t) => {
	const { $c } = globalThis;
	const { getInstance } = $c;

	const source = ls([, 'a', , 'b', 'name', 'value']);
	const iter = getInstance("@kvIter");

	await t.step("(for) should iterate and execute the correct blocks", () => {
		const results = [];
		const namedBlock = codeBlock(() => results.push(`named: ${$c.sm(iter, "key")}=${$c.sm(iter, "value")}`));
		const indexBlock = codeBlock(() => results.push(`index: ${$c.sm(iter, "key")}=${$c.sm(iter, "value")}`));

		$c.sm(iter, 'for', ls([, source, 'named', namedBlock, 'index', indexBlock]));

		assertEquals(results, [
			"index: 0=a",
			"index: 1=b",
			"named: name=value",
		]);
	});

	await t.step("(rev) should iterate in reverse", () => {
		const results = [];
		const bothBlock = codeBlock(() => results.push($c.sm(iter, "key")));

		$c.sm(iter, 'rev', ls([, source, , bothBlock]));

		assertEquals(results, ["name", 1, 0]);
	});

	await t.step("should handle collection of results", () => {
		const indexBlock = codeBlock(() => $c.sm(iter, "value"));
		const namedBlock = codeBlock(() => $c.sm(iter, "key"));

		const collected = $c.sm(iter, "for", ls([, source, 'named', namedBlock, 'index', indexBlock, 'collect', true]));

		assertEquals(collected.at('0'), 'a');
		assertEquals(collected.at('1'), 'b');
		assertEquals(collected.at('2'), 'name');
	});

});
