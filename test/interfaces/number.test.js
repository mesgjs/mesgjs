import { describe, it } from '@compat/test';
import { assertStrictEquals } from '@std/assert';
import { listFromPairs as ls } from '../../src/runtime/runtime.esm.js';
import '../../src/runtime/mesgjs.esm.js';

const $n = (n) => globalThis.$toMsjs(n);

describe('@number Interface', () => {
	it('initialization', () => {
		assertStrictEquals(globalThis.$c.sm(42, 'valueOf'), 42);
	});

	it('arithmetic', () => {
		assertStrictEquals($n(5)('+', 5), 10, 'add(+)');
		assertStrictEquals($n(5)('add', 5), 10, 'add(add)');
		assertStrictEquals($n(10)('-', 5), 5, 'sub(-)');
		assertStrictEquals($n(10)('sub', 5), 5, 'sub(sub)');
		assertStrictEquals($n(5)('*', 2), 10, 'mul(*)');
		assertStrictEquals($n(5)('mul', 2), 10, 'mul(mul)');
		assertStrictEquals($n(10)('/', 2), 5, 'div(/)');
		assertStrictEquals($n(10)('div', 2), 5, 'div(div)');
		assertStrictEquals($n(10)('/+', 3), 1, 'mod(/+)');
		assertStrictEquals($n(10)('mod', 3), 1, 'mod(mod)');
		assertStrictEquals($n(5)('**', 2), 25, 'pow(**)');
		assertStrictEquals($n(5)('pow', 2), 25, 'pow(pow)');
		assertStrictEquals($n(5)('neg'), -5, 'neg(neg)');
		assertStrictEquals($n(5)('+-'), -5, 'neg(+-)');
	});

	it('relational', () => {
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

	it('bitwise', () => {
		assertStrictEquals($n(5)('&', 3), 1, 'and(&)');
		assertStrictEquals($n(5)('and', 3), 1, 'and(and)');
		assertStrictEquals($n(5)('|', 2), 7, 'or(|)');
		assertStrictEquals($n(5)('or', 2), 7, 'or(or)');
		assertStrictEquals($n(5)('^', 3), 6, 'xor(^)');
		assertStrictEquals($n(5)('xor', 3), 6, 'xor(xor)');
		assertStrictEquals($n(5)('<<', 1), 10, 'lshf(<<)');
		assertStrictEquals($n(5)('lshf', 1), 10, 'lshf(lshf)');
		assertStrictEquals($n(5)('>>', 1), 2, 'rshf(>>)');
		assertStrictEquals($n(5)('rshf', 1), 2, 'rshf(rshf)');
		assertStrictEquals($n(5)('>>>', 1), 2, 'zfrs(>>>)');
		assertStrictEquals($n(5)('zfrs', 1), 2, 'zfrs(zfrs)');
		assertStrictEquals($n(5)('cmpl'), -6, 'cmpl');
	});

	it('Math constants', () => {
		assertStrictEquals($n(1)('pi'), Math.PI);
		assertStrictEquals($n(2)('pi'), 2 * Math.PI);
		assertStrictEquals($n(1)('e'), Math.E);
		assertStrictEquals($n(1)('sqrt2'), Math.SQRT2);
		assertStrictEquals($n(1)('golden'), 1.618033988749895);
	});

	it('Math functions', () => {
		assertStrictEquals($n(-5)('abs'), 5);
		assertStrictEquals($n(0.5)('acos'), Math.acos(0.5));
		assertStrictEquals($n(0.5)('acosh'), Math.acosh(0.5));
		assertStrictEquals($n(0.5)('asin'), Math.asin(0.5));
		assertStrictEquals($n(0.5)('asinh'), Math.asinh(0.5));
		assertStrictEquals($n(0.5)('atan'), Math.atan(0.5));
		assertStrictEquals($n(0.5)('atanh'), Math.atanh(0.5));
		assertStrictEquals($n(0)('atanxy', ls(['x', 10, 'y', 10])), Math.atan2(10, 10));
		assertStrictEquals($n(27)('cbrt'), 3);
		assertStrictEquals($n(5.3)('ceil'), 6);
		assertStrictEquals($n(0.5)('cos'), Math.cos(0.5));
		assertStrictEquals($n(0.5)('cosh'), Math.cosh(0.5));
		assertStrictEquals($n(1)('exp'), Math.E);
		assertStrictEquals($n(1)('expm1'), Math.expm1(1));
		assertStrictEquals($n(5.3)('floor'), 5);
		assertStrictEquals($n(5.3)('int'), 5);
		// TO DO: (random) - a bit tricky to test reliably
		assertStrictEquals($n(5.7)('round'), 6);
		assertStrictEquals($n(1)('sign'), 1);
		assertStrictEquals($n(-1)('sign'), -1);
		assertStrictEquals($n(0)('sign'), 0);
		assertStrictEquals($n(0.5)('sin'), Math.sin(0.5));
		assertStrictEquals($n(0.5)('sinh'), Math.sinh(0.5));
		assertStrictEquals($n(36)('sqrt'), 6);
		assertStrictEquals($n(0.5)('tan'), Math.tan(0.5));
		assertStrictEquals($n(0.5)('tanh'), Math.tanh(0.5));
	});

	it('Logarithmic functions', () => {
		assertStrictEquals($n(100)('log'), 2);
		assertStrictEquals($n(100)('log', 10), 2);
		assertStrictEquals($n(8)('log', 2), 3);
		assertStrictEquals($n(Math.E)('ln'), 1);
	});

	it('is... functions', () => {
		assertStrictEquals($n(NaN)('isNan'), true, 'isNan on NaN');
		assertStrictEquals($n(5)('isNan'), false, 'isNan on 5');
		assertStrictEquals($n(Infinity)('isPosInf'), true, 'isPosInf on Infinity');
		assertStrictEquals($n(-Infinity)('isNegInf'), true, 'isNegInf on -Infinity');
		assertStrictEquals($n(0)('isPosZero'), true, 'isPosZero on 0');
		assertStrictEquals($n(-0)('isNegZero'), true, 'isNegZero on -0');
	});

	it('hypot', () => {
		assertStrictEquals($n(3)('hypot', 4), 5);
		assertStrictEquals($n(0)('hypot', ls(['of', ls([, 3, , 4, , 5])])), Math.hypot(3, 4, 5));
	});

	it('ival', () => {
		assertStrictEquals($n(5)('ival', ls(['ge', 5, 'lt', 10])), true, '[5,10)');
		assertStrictEquals($n(10)('ival', ls(['ge', 5, 'lt', 10])), false, '[5,10)');
		assertStrictEquals($n(4)('ival', ls(['ge', 5, 'lt', 10])), false, '[5,10)');
		assertStrictEquals($n(5)('ival', ls(['gt', 5, 'le', 10])), false, '(5,10]');
	});

	it('min/max', () => {
		assertStrictEquals($n(5)('max', ls([, 1, , 10])), 10);
		assertStrictEquals($n(5)('min', ls([, 1, , 10])), 1);
		assertStrictEquals($n(0)('max', ls(['of', ls([, 1, , 5, , 2])])), 5);
		assertStrictEquals($n(0)('min', ls(['of', ls([, 1, , 5, , 2])])), 1);
	});

	it('toString/valueOf/toNumber', () => {
		assertStrictEquals($n(10)('toString'), '10');
		assertStrictEquals($n(10)('toString', 16), 'a');
		assertStrictEquals($n(42)('valueOf'), 42);
		assertStrictEquals($n(42)('toNumber'), 42);
	});
});
