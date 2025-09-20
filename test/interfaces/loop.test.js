import {
	assertEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { listFromPairs as ls } from "../../src/runtime/runtime.esm.js";

const mockCode = (runLogic) => {
	const fn = (op) => {
		if (op === 'run') return runLogic();
	};
	fn.msjsType = '@code';
	return fn;
};

Deno.test("@loop Interface", async (t) => {
	const { $c } = globalThis;
	
	await t.step("(run) should execute a block a fixed number of times", () => {
		const loop = $c("get", "@loop");
		let executionCount = 0;
		const block = mockCode(() => executionCount++);

		loop("run", ls([,block, "times", 3]));

		assertEquals(executionCount, 3);
	});

	await t.step("(run) should expose correct state during iteration", () => {
		const loop = $c("get", "@loop");
		const results = [];
		const block = mockCode(() => {
			results.push({
				num: loop("num"),
				num1: loop("num1"),
				rem: loop("rem"),
				rem1: loop("rem1"),
				times: loop("times"),
			});
		});

		loop("run", ls([,block, "times", 2]));

		assertEquals(results, [
			{ num: 0, num1: 1, rem: 1, rem1: 2, times: 2 },
			{ num: 1, num1: 2, rem: 0, rem1: 1, times: 2 },
		]);
	});

	await t.step("(run collect=@t) should collect results", () => {
		const loop = $c("get", "@loop");
		let i = 0;
		const block = mockCode(() => ++i);
		const collected = loop("run", ls([,block, "times", 3, "collect", true]));

		assertEquals(collected.at(0), 1);
		assertEquals(collected.at(1), 2);
		assertEquals(collected.at(2), 3);
	});

	await t.step("(stop) should terminate a (run) loop early", () => {
		const loop = $c("get", "@loop");
		let i = 0;
		const block = mockCode(() => {
			i++;
			if (i === 2) loop("stop");
		});
		
		loop("run", ls([,block, "times", 5]));
		assertEquals(i, 2);
	});

	await t.step("(next result) should alter the (run) return value", () => {
		const loop = $c("get", "@loop");
		const block = mockCode(() => {
			if (loop("num") === 1) loop("next", ls(["result", "changed"]));
			return loop("num");
		});
		
		const collected = loop("run", ls([,block, "times", 3, "collect", true]));
		assertEquals(collected.size, 3);
		assertEquals(collected.at(0), 0);
		assertEquals(collected.at(1), "changed");
		assertEquals(collected.at(2), 2);
	});
	
	await t.step("(stop result) should set the final (run) return value", () => {
		const loop = $c("get", "@loop");
		const block = mockCode(() => {
			if (loop("num") === 1) loop("stop", ls(["result", "stopped here"]));
			return loop("num");
		});
		
		const result = loop("run", ls([,block, "times", 3]));
		assertEquals(result, "stopped here");
	});

	await t.step("(stop result) should add to collected (run) results", () => {
		const loop = $c("get", "@loop");
		const block = mockCode(() => {
			if (loop("num") === 1) loop("stop", ls(["result", "stopped here"]));
			return loop("num");
		});
		
		const collected = loop("run", ls([,block, "times", 3, "collect", true]));
		assertEquals(collected.size, 2);
		assertEquals(collected.at(0), 0);
		assertEquals(collected.at(1), "stopped here");
	});

	await t.step("(while) should loop based on a post-condition", () => {
		const loop = $c("get", "@loop");
		let i = 0;
		const mainBlock = mockCode(() => i++);
		const postTest = mockCode(() => i < 3);

		loop("while", ls([, mainBlock, "post", postTest]));
		assertEquals(i, 3);
	});

	await t.step("(while) should stop based on a pre-condition", () => {
		const loop = $c("get", "@loop");
		let i = 0;
		const mainBlock = mockCode(() => i++);
		const preTest = mockCode(() => i < 2);
		
		loop("while", ls([, mainBlock, "pre", preTest]));
		assertEquals(i, 2);
	});

	await t.step("(while) should stop based on a mid-condition", () => {
		const loop = $c("get", "@loop");
		let i = 0;
		let extraRan = 0;
		const mainBlock = mockCode(() => i++);
		const midTest = mockCode(() => i < 4);
		const extraBlock = mockCode(() => extraRan++);

		loop("while", ls([, mainBlock, "mid", midTest, , extraBlock]));
		assertEquals(i, 4);
		assertEquals(extraRan, 3);
	});

	await t.step("(stop) should terminate a (while) loop early", () => {
		const loop = $c("get", "@loop");
		let i = 0;
		const mainBlock = mockCode(() => {
			i++;
			if (i === 3) loop("stop");
		});
		const postTest = mockCode(() => i < 10);
		
		loop("while", ls([, mainBlock, "post", postTest]));
		assertEquals(i, 3);
	});

	await t.step("(stop result) should work in a (while) main block", () => {
		const loop = $c("get", "@loop");
		let i = 0;
		const mainBlock = mockCode(() => {
			i++;
			if (i === 2) loop("stop", ls(["result", "stopped in main"]));
			return i;
		});
		const postTest = mockCode(() => i < 5);
		
		const result = loop("while", ls([, mainBlock, "post", postTest]));
		assertEquals(result, "stopped in main");
	});
});