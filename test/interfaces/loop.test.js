import {
	assertEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { listFromPairs as ls } from "../../src/runtime/runtime.esm.js";
import { codeBlock } from "../harness.esm.js";

Deno.test("@loop Interface", async (t) => {
	const { $c } = globalThis;
	const { getInstance } = $c;

	await t.step("(run) should execute a block a fixed number of times", () => {
		const loop = getInstance("@loop");
		let executionCount = 0;
		const block = codeBlock(() => executionCount++);

		$c.sm(loop, "run", ls([,block, "times", 3]));

		assertEquals(executionCount, 3);
	});

	await t.step("(run) should expose correct state during iteration", () => {
		const loop = getInstance("@loop");
		const results = [];
		const block = codeBlock(() => {
			results.push({
				num: $c.sm(loop, "num"),
				num1: $c.sm(loop, "num1"),
				rem: $c.sm(loop, "rem"),
				rem1: $c.sm(loop, "rem1"),
				times: $c.sm(loop, "times"),
			});
		});

		$c.sm(loop, "run", ls([,block, "times", 2]));

		assertEquals(results, [
			{ num: 0, num1: 1, rem: 1, rem1: 2, times: 2 },
			{ num: 1, num1: 2, rem: 0, rem1: 1, times: 2 },
		]);
	});

	await t.step("(run collect=@t) should collect results", () => {
		const loop = getInstance("@loop");
		let i = 0;
		const block = codeBlock(() => ++i);
		const collected = $c.sm(loop, "run", ls([,block, "times", 3, "collect", true]));

		assertEquals(collected.at(0), 1);
		assertEquals(collected.at(1), 2);
		assertEquals(collected.at(2), 3);
	});

	await t.step("(stop) should terminate a (run) loop early", () => {
		const loop = getInstance("@loop");
		let i = 0;
		const block = codeBlock(() => {
			i++;
			if (i === 2) $c.sm(loop, "stop");
		});

		$c.sm(loop, "run", ls([,block, "times", 5]));
		assertEquals(i, 2);
	});

	await t.step("(next result) should alter the (run) return value", () => {
		const loop = getInstance("@loop");
		const block = codeBlock(() => {
			if ($c.sm(loop, "num") === 1) $c.sm(loop, "next", ls(["result", "changed"]));
			return $c.sm(loop, "num");
		});

		const collected = $c.sm(loop, "run", ls([,block, "times", 3, "collect", true]));
		assertEquals(collected.size, 3);
		assertEquals(collected.at(0), 0);
		assertEquals(collected.at(1), "changed");
		assertEquals(collected.at(2), 2);
	});

	await t.step("(stop result) should set the final (run) return value", () => {
		const loop = getInstance("@loop");
		const block = codeBlock(() => {
			if ($c.sm(loop, "num") === 1) $c.sm(loop, "stop", ls(["result", "stopped here"]));
			return $c.sm(loop, "num");
		});

		const result = $c.sm(loop, "run", ls([,block, "times", 3]));
		assertEquals(result, "stopped here");
	});

	await t.step("(stop result) should add to collected (run) results", () => {
		const loop = getInstance("@loop");
		const block = codeBlock(() => {
			if ($c.sm(loop, "num") === 1) $c.sm(loop, "stop", ls(["result", "stopped here"]));
			return $c.sm(loop, "num");
		});

		const collected = $c.sm(loop, "run", ls([,block, "times", 3, "collect", true]));
		assertEquals(collected.size, 2);
		assertEquals(collected.at(0), 0);
		assertEquals(collected.at(1), "stopped here");
	});

	await t.step("(while) should loop based on a post-condition", () => {
		const loop = getInstance("@loop");
		let i = 0;
		const mainBlock = codeBlock(() => i++);
		const postTest = codeBlock(() => i < 3);

		$c.sm(loop, "while", ls([, mainBlock, "post", postTest]));
		assertEquals(i, 3);
	});

	await t.step("(while) should stop based on a pre-condition", () => {
		const loop = getInstance("@loop");
		let i = 0;
		const mainBlock = codeBlock(() => i++);
		const preTest = codeBlock(() => i < 2);

		$c.sm(loop, "while", ls([, mainBlock, "pre", preTest]));
		assertEquals(i, 2);
	});

	await t.step("(while) should stop based on a mid-condition", () => {
		const loop = getInstance("@loop");
		let i = 0;
		let extraRan = 0;
		const mainBlock = codeBlock(() => i++);
		const midTest = codeBlock(() => i < 4);
		const extraBlock = codeBlock(() => extraRan++);

		$c.sm(loop, "while", ls([, mainBlock, "mid", midTest, , extraBlock]));
		assertEquals(i, 4);
		assertEquals(extraRan, 3);
	});

	await t.step("(stop) should terminate a (while) loop early", () => {
		const loop = getInstance("@loop");
		let i = 0;
		const mainBlock = codeBlock(() => {
			i++;
			if (i === 3) $c.sm(loop, "stop");
		});
		const postTest = codeBlock(() => i < 10);

		$c.sm(loop, "while", ls([, mainBlock, "post", postTest]));
		assertEquals(i, 3);
	});

	await t.step("(stop result) should work in a (while) main block", () => {
		const loop = getInstance("@loop");
		let i = 0;
		const mainBlock = codeBlock(() => {
			i++;
			if (i === 2) $c.sm(loop, "stop", ls(["result", "stopped in main"]));
			return i;
		});
		const postTest = codeBlock(() => i < 5);

		const result = $c.sm(loop, "while", ls([, mainBlock, "post", postTest]));
		assertEquals(result, "stopped in main");
	});
});
