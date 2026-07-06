import {
  assertEquals,
  assertStrictEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import '../../src/runtime/mesgjs.esm.js';

const { $toMsjs, $c } = globalThis;
const { getInstance } = $c;

Deno.test('@null - toString', () => {
	assertEquals($c.sm(null, 'toString'), '@n');
});

Deno.test('@null - valueOf', () => {
	assertStrictEquals($c.sm(null, 'valueOf'), null);
});

Deno.test('@null - has', () => {
	assertStrictEquals($c.sm(null, 'has'), undefined);
});

Deno.test('@null - consistent receivers', () => {
	assertStrictEquals($msjsReceiver(null), $msjsReceiver(null));
});

Deno.test('@null - equality', () => {
	assertStrictEquals($c.sm(null, 'eq', [null]), true, '@n should be equal to itself');
	assertStrictEquals($c.sm(null, 'ne', [null]), false, '@n should not be unequal to itself');
	assertStrictEquals($c.sm(null, 'eq', true), false, '@n should not be equal to @t');
	assertStrictEquals($c.sm(null, 'ne', true), true, '@n should be unequal to @t');
});
