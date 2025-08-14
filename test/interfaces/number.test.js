/*
 * Mesgjs @number interface tests
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
import { listFromPairs as ls } from '../../src/runtime/runtime.esm.js';
import '../../src/runtime/mesgjs.esm.js';

const $n = (n) => $toMsjs(n);

Deno.test('@number - initialization', () => {
  const num = $c('get', ls([, '@number', 'init', ls([, 42])]));
  assertEquals(num('valueOf'), 42);
});

Deno.test('@number - arithmetic', () => {
  assertEquals($n(5)('+', 5), 10, 'add(+)');
  assertEquals($n(5)('add', 5), 10, 'add(add)');
  assertEquals($n(10)('-', 5), 5, 'sub(-)');
  assertEquals($n(10)('sub', 5), 5, 'sub(sub)');
  assertEquals($n(5)('*', 2), 10, 'mul(*)');
  assertEquals($n(5)('mul', 2), 10, 'mul(mul)');
  assertEquals($n(10)('/', 2), 5, 'div(/)');
  assertEquals($n(10)('div', 2), 5, 'div(div)');
  assertEquals($n(10)('/+', 3), 1, 'mod(/+)');
  assertEquals($n(10)('mod', 3), 1, 'mod(mod)');
  assertEquals($n(5)('**', 2), 25, 'pow(**)');
  assertEquals($n(5)('pow', 2), 25, 'pow(pow)');
  assertEquals($n(5)('neg'), -5, 'neg(neg)');
  assertEquals($n(5)('+-'), -5, 'neg(+-)');
});

Deno.test('@number - relational', () => {
  assertStrictEquals($n(5)('=', 5), true, 'eq(=)');
  assertStrictEquals($n(5)('eq', 5), true, 'eq(eq)');
  assertStrictEquals($n(5)('!=', 10), true, 'ne(!=)');
  assertStrictEquals($n(5)('ne', 10), true, 'ne(ne)');
  assertStrictEquals($n(5)('>', 4), true, 'gt(>)');
  assertStrictEquals($n(5)('gt', 4), true, 'gt(gt)');
  assertStrictEquals($n(5)('>=', 5), true, 'ge(>=)');
  assertStrictEquals($n(5)('ge', 5), true, 'ge(ge)');
  assertStrictEquals($n(5)('<', 6), true, 'lt(<)');
  assertStrictEquals($n(5)('lt', 6), true, 'lt(lt)');
  assertStrictEquals($n(5)('<=', 5), true, 'le(<=)');
  assertStrictEquals($n(5)('le', 5), true, 'le(le)');
});

Deno.test('@number - bitwise', () => {
  assertEquals($n(5)('&', 3), 1, 'and(&)');
  assertEquals($n(5)('and', 3), 1, 'and(and)');
  assertEquals($n(5)('|', 2), 7, 'or(|)');
  assertEquals($n(5)('or', 2), 7, 'or(or)');
  assertEquals($n(5)('^', 3), 6, 'xor(^)');
  assertEquals($n(5)('xor', 3), 6, 'xor(xor)');
  assertEquals($n(5)('<<', 1), 10, 'lshf(<<)');
  assertEquals($n(5)('lshf', 1), 10, 'lshf(lshf)');
  assertEquals($n(5)('>>', 1), 2, 'rshf(>>)');
  assertEquals($n(5)('rshf', 1), 2, 'rshf(rshf)');
  assertEquals($n(5)('>>>', 1), 2, 'zfrs(>>>)');
  assertEquals($n(5)('zfrs', 1), 2, 'zfrs(zfrs)');
  assertEquals($n(5)('cmpl'), -6, 'cmpl');
});

Deno.test('@number - Math constants', () => {
  assertEquals($n(1)('pi'), Math.PI);
  assertEquals($n(2)('pi'), 2 * Math.PI);
  assertEquals($n(1)('e'), Math.E);
  assertEquals($n(1)('sqrt2'), Math.SQRT2);
  assertEquals($n(1)('golden'), 1.618033988749895);
});

Deno.test('@number - Math functions', () => {
  assertEquals($n(-5)('abs'), 5);
  assertEquals($n(0.5)('acos'), Math.acos(0.5));
  assertEquals($n(0.5)('acosh'), Math.acosh(0.5));
  assertEquals($n(0.5)('asin'), Math.asin(0.5));
  assertEquals($n(0.5)('asinh'), Math.asinh(0.5));
  assertEquals($n(0.5)('atan'), Math.atan(0.5));
  assertEquals($n(0.5)('atanh'), Math.atanh(0.5));
  assertEquals($n(0)('atanxy', ls(['x', 10, 'y', 10])), Math.atan2(10, 10));
  assertEquals($n(27)('cbrt'), 3);
  assertEquals($n(5.3)('ceil'), 6);
  assertEquals($n(0.5)('cos'), Math.cos(0.5));
  assertEquals($n(0.5)('cosh'), Math.cosh(0.5));
  assertEquals($n(1)('exp'), Math.E);
  assertEquals($n(1)('expm1'), Math.expm1(1));
  assertEquals($n(5.3)('floor'), 5);
  assertEquals($n(5.3)('int'), 5);
  // TO DO: (random) - a bit tricky to test reliably
  assertEquals($n(5.7)('round'), 6);
  assertEquals($n(1)('sign'), 1);
  assertEquals($n(-1)('sign'), -1);
  assertEquals($n(0)('sign'), 0);
  assertEquals($n(0.5)('sin'), Math.sin(0.5));
  assertEquals($n(0.5)('sinh'), Math.sinh(0.5));
  assertEquals($n(36)('sqrt'), 6);
  assertEquals($n(0.5)('tan'), Math.tan(0.5));
  assertEquals($n(0.5)('tanh'), Math.tanh(0.5));
});

Deno.test('@number - Logarithmic functions', () => {
    assertEquals($n(100)('log'), 2);
    assertEquals($n(100)('log', 10), 2);
    assertEquals($n(8)('log', 2), 3);
    assertEquals($n(Math.E)('ln'), 1);
});

Deno.test('@number - is... functions', () => {
  assertStrictEquals($n(NaN)('isNan'), true, 'isNan on NaN');
  assertStrictEquals($n(5)('isNan'), false, 'isNan on 5');
  assertStrictEquals($n(Infinity)('isPosInf'), true, 'isPosInf on Infinity');
  assertStrictEquals($n(-Infinity)('isNegInf'), true, 'isNegInf on -Infinity');
  assertStrictEquals($n(0)('isPosZero'), true, 'isPosZero on 0');
  assertStrictEquals($n(-0)('isNegZero'), true, 'isNegZero on -0');
});

Deno.test('@number - hypot', () => {
    assertEquals($n(3)('hypot', 4), 5);
    assertEquals($n(0)('hypot', ls(['of', ls([, 3, , 4, , 5])])), Math.hypot(3,4,5));
});

Deno.test('@number - ival', () => {
    assertStrictEquals($n(5)('ival', ls(['ge', 5, 'lt', 10])), true, '[5,10)');
    assertStrictEquals($n(10)('ival', ls(['ge', 5, 'lt', 10])), false, '[5,10)');
    assertStrictEquals($n(4)('ival', ls(['ge', 5, 'lt', 10])), false, '[5,10)');
    assertStrictEquals($n(5)('ival', ls(['gt', 5, 'le', 10])), false, '(5,10]');
});

Deno.test('@number - min/max', () => {
    assertEquals($n(5)('max', ls([, 1, , 10])), 10);
    assertEquals($n(5)('min', ls([, 1, , 10])), 1);
    assertEquals($n(0)('max', ls(['of', ls([, 1, , 5, , 2])])), 5);
    assertEquals($n(0)('min', ls(['of', ls([, 1, , 5, , 2])])), 1);
});

Deno.test('@number - toString/valueOf/toNumber', () => {
  assertEquals($n(10)('toString'), '10');
  assertEquals($n(10)('toString', 16), 'a');
  assertEquals($n(42)('valueOf'), 42);
  assertEquals($n(42)('toNumber'), 42);
});