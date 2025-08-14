import {
  assert,
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";

import "../../src/runtime/mesgjs.esm.js";

Deno.test("@undefined Interface", async (t) => {
  const mUndefined = $c("get", "@undefined");

  await t.step("Singleton properties", () => {
    assertEquals(mUndefined, $toMsjs(globalThis.$u));
    assertEquals(mUndefined.msjsType, "@undefined");
    assertEquals(mUndefined("valueOf"), undefined);
    assertEquals(mUndefined("@jsv"), undefined);
  });

  await t.step("Operations", () => {
    assertEquals(mUndefined("toString"), "@u");
    assertEquals(mUndefined("has"), undefined);
  });
});