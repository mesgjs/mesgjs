import {
  assert,
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";

import "../../src/runtime/mesgjs.esm.js";
import { listFromPairs as ls } from "../../src/runtime/runtime.esm.js";

Deno.test("@string Interface", async (t) => {
  const mString = $toMsjs("hello");

  await t.step("Initialization and Primitives", () => {
    assertEquals(mString.msjsType, "@string");
    assertEquals(mString("valueOf"), "hello");
    assertEquals(mString("toString"), "hello");
    assertEquals(mString("@jsv"), "hello");
    assertEquals(mString("length"), 5);
  });

  await t.step("Character Access", () => {
    assertEquals(mString("at", 1), "e");
    assertEquals(mString("at", -1), "o");
    assertEquals(mString("at", 10), undefined);
    assertEquals(mString("charAt", 1), "e");
    assertEquals(mString("charAt", 10), "");
    assertEquals(mString("charCodeAt", 1), 101);
    assertEquals(mString("codePointAt", 1), 101);
  });

  await t.step("Comparison and Equality", () => {
    assertEquals(mString("eq", "hello"), true);
    assertEquals(mString("=", "hello"), true);
    assertEquals(mString("ne", "world"), true);
    assertEquals(mString("!=", "world"), true);
    assertEquals(mString("gt", "helln"), true);
    assertEquals(mString(">", "helln"), true);
    assertEquals(mString("ge", "hello"), true);
    assertEquals(mString(">=", "hello"), true);
    assertEquals(mString("lt", "hellp"), true);
    assertEquals(mString("<", "hellp"), true);
    assertEquals(mString("le", "hello"), true);
    assertEquals(mString("<=", "hello"), true);
  });

  await t.step("Searching and Substrings", () => {
    assertEquals(mString("includes", "ell"), true);
    assertEquals(mString("startsWith", "he"), true);
    assertEquals(mString("endsWith", "lo"), true);
    assertEquals(mString("indexOf", "l"), 2);
    assertEquals(mString("lastIndexOf", "l"), 3);
    assertEquals(mString("slice", ls([, 1, , 4])), "ell");
    assertEquals(mString("substring", ls([, 1, , 4])), "ell");
  });

  await t.step("Modification and Manipulation", () => {
    assertEquals(mString("toUpper"), "HELLO");
    assertEquals(mString("toLower"), "hello");
    const padded = $toMsjs("  hi  ");
    assertEquals(padded("trim"), "hi");
    assertEquals(padded("trimStart"), "hi  ");
    assertEquals(padded("trimEnd"), "  hi");
    assertEquals(mString("repeat", 2), "hellohello");
    assertEquals(mString("padStart", ls([, 8, , "."])), "...hello");
    assertEquals(mString("padEnd", ls([, 8, , "."])), "hello...");
    assertEquals(mString("replace", ls([, "l", , "x"])), "hexlo");
    assertEquals(mString("replaceAll", ls([, "l", , "x"])), "hexxo");
  });

  await t.step("Joining and Splitting", () => {
    const arr = $toMsjs(["a", "b"]);
    assertEquals(mString("join", ls([, "a", , "b"])), "helloab");
    assertEquals(mString("join", ls([, "a", , "b", "with", "-"])), "hello-a-b");
    assertEquals($toMsjs("-")("joining", ls([, "a", , "b"])), "a-b");
    const split = mString("split", "");
    assertEquals(split.size, 5);
    assertEquals(split.at(0), "h");
  });

  await t.step("Conversion", () => {
    assertEquals($toMsjs("123")("toInt"), 123);
    assertEquals($toMsjs("123.45")("toFloat"), 123.45);
    assertEquals($toMsjs("123")("toBigInt"), 123n);
    const re = mString("re", "g");
    assertEquals(re.msjsType, "@regex");
    assertEquals(re("source"), "hello");
    assertEquals(re("flags"), "g");
  });
});