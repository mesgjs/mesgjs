/*
 * Mesgjs @null interface tests
 *
 * Copyright 2025 by Kappa Computer Solutions, LLC.
 *
 * KCS will be transitioning to the Mesgjs BSL license; read the file
 * "LICENSE" in the root of this repository for details.
 */
import {
  assertEquals,
  assertStrictEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import '../../src/runtime/mesgjs.esm.js';

const $null = $toMsjs(null);

Deno.test('@null - toString', () => {
  assertEquals($null('toString'), '@n');
});

Deno.test('@null - valueOf', () => {
  assertStrictEquals($null('valueOf'), null);
});

Deno.test('@null - has', () => {
  assertStrictEquals($null('has'), undefined);
});

Deno.test('@null - singleton', () => {
  assertStrictEquals($null, $toMsjs(globalThis.$n), 'Expected @null object to be the $n singleton.');
});

Deno.test('@null - equality', () => {
  const $true = $toMsjs(true);
  assertStrictEquals($null('eq', $null), true, '@n should be equal to itself');
  assertStrictEquals($null('ne', $null), false, '@n should not be unequal to itself');
  assertStrictEquals($null('eq', $true), false, '@n should not be equal to @t');
  assertStrictEquals($null('ne', $true), true, '@n should be unequal to @t');
});