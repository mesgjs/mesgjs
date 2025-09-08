import {
    assert,
    assertEquals,
    assertStrictEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";

Deno.test("@core Interface Logic and Flow Control", async (t) => {
    const { $c, $t, $f, $n, $u, NANOS } = globalThis;
    const { getInstance } = $c;

    await t.step("consistant instances", () => {
	assertStrictEquals($c, getInstance('@core'));
    });

    await t.step("(and) should return first falsey or last truthy value", () => {
	assertEquals($c("and", [$t, $t, "last"]), "last");
	assertEquals($c("and", [$t, $f, "never"]), false);
	assertEquals($c("and", []), true); // Default
    });

    await t.step("(or) should return first truthy or last falsey value", () => {
	assertEquals($c("or", [$f, "first", $t]), "first");
	assertEquals($c("or", [$f, 0, $n]), null);
	assertEquals($c("or", []), false); // Default
    });

    await t.step("(not) should return the logical opposite", () => {
	assertEquals($c("not", $t), false);
	assertEquals($c("not", "hello"), false);
	assertEquals($c("not", ""), true);
    });

    await t.step("(xor) should return the value if exactly one is true", () => {
	assertEquals($c("xor", [$f, "one", $f]), "one");
	assertEquals($c("xor", ["one", "two", $f]), false);
	assertEquals($c("xor", [$f, $t, $f, $f]), true);
	assertEquals($c("xor", [$f, $f]), false);
    });

    await t.step("(if) should execute the correct branch", () => {
	assertEquals($c("if", [$t, "A", $f, "B"]), "A");
	assertEquals($c("if", [$f, "A", $t, "B"]), "B");
	const params = new NANOS($f, "A", $f, "B", { else: "C" });
	assertEquals($c("if", params), "C");
	assertEquals($c("if", [0, "A", 1, "B"]), "B");
    });
    
    await t.step("(case) should find and return the correct result", () => {
	assertEquals($c("case", ["b", "a", 1, "b", 2, "c", 3]), 2);
	const params = new NANOS("a", 1, "b", 2, { else: 99 });
	assertEquals($c("case", params), 99);
	const num = globalThis.$toMsjs(5);
	assertEquals($c("case", [num, 4, 'four', 5, 'five']), 'five');
    });

    await t.step("aliases should work like their primary operations", () => {
	// & -> and
	assertEquals($c("&", [$t, $t]), true);
	assertEquals($c("&", [$t, $f]), false);
	// | -> or
	assertEquals($c("|", [$f, $t]), true);
	assertEquals($c("|", [$f, $f]), false);
	// ~ -> not
	assertEquals($c("~", $t), false);
	assertEquals($c("~", $f), true);
	// ? -> if
	assertEquals($c("?", [$t, "A"]), "A");
	// : -> case
	assertEquals($c(":", ["b", "b", 2]), 2);
	// + -> get
	assertEquals($c("+", "@string").msjsType, "@string");
    });
});
