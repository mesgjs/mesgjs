import {
  assertEquals,
  assertStrictEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import '../../src/runtime/mesgjs.esm.js';

const { $toMsjs, $c } = globalThis;
const { getInstance } = $c;

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

Deno.test('@null - consistent instances', () => {
	assertStrictEquals($null, getInstance('@null'));
	assertStrictEquals($null, $toMsjs(null));
});

Deno.test('@null - equality', () => {
	const $true = $toMsjs(true);
	assertStrictEquals($null('eq', $null), true, '@n should be equal to itself');
	assertStrictEquals($null('ne', $null), false, '@n should not be unequal to itself');
	assertStrictEquals($null('eq', $true), false, '@n should not be equal to @t');
	assertStrictEquals($null('ne', $true), true, '@n should be unequal to @t');
});
