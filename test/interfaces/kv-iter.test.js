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

Deno.test("@kvIter Interface", async (t) => {
    const { $c } = globalThis;
    
    const source = ls([, 'a', , 'b', 'name', 'value']);
    const iter = $c("get", "@kvIter");

    await t.step("(for) should iterate and execute the correct blocks", () => {
	const results = [];
	const namedBlock = mockCode(() => results.push(`named: ${iter("key")}=${iter("value")}`));
	const indexBlock = mockCode(() => results.push(`index: ${iter("key")}=${iter("value")}`));

	iter('for', ls([, source, 'named', namedBlock, 'index', indexBlock]));

	assertEquals(results, [
	    "index: 0=a",
	    "index: 1=b",
	    "named: name=value",
	]);
    });

    await t.step("(rev) should iterate in reverse", () => {
	const results = [];
	const bothBlock = mockCode(() => results.push(iter("key")));

	iter('rev', ls([, source, , bothBlock]));
	
	assertEquals(results, ["name", "1", "0"]);
    });
    
    await t.step("should handle collection of results", () => {
	const indexBlock = mockCode(() => iter("value"));
	const namedBlock = mockCode(() => iter("key"));

	const collected = iter("for", ls([, source, 'named', namedBlock, 'index', indexBlock, 'collect', true]));

	assertEquals(collected.at('0'), 'a');
	assertEquals(collected.at('1'), 'b');
	assertEquals(collected.at('2'), 'name');
    });

});