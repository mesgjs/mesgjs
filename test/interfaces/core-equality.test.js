/**
 * Equality test coverage:
 * - @c(same) / @c(==): object identity (JS ===)
 * - @c(diff) / @c(!==): object non-identity (JS !==)
 * - @n(nou): null-or-undefined check
 * - @n(def): defined (not null or undefined) check
 * - @c(case) permutations: JS values vs Mesgjs-wrapped values
 * - Custom @eq interface: equality defined by type matching
 */

import {
	assertEquals,
	assertStrictEquals,
} from 'jsr:@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { loadMesgjsModuleSource } from '../harness.esm.js';

const { $toMsjs, $c, $t, $f, $n, $u, NANOS } = globalThis;
const { getInstance } = $c;

// ─── @c(same) / @c(==) ───────────────────────────────────────────────────────

Deno.test('@c(same) - object identity', async (t) => {
	await t.step('same: Mesgjs singleton objects are identical to themselves', () => {
		assertStrictEquals($c.sm($c, 'same', [$t, $t]), true, '@t same @t');
		assertStrictEquals($c.sm($c, 'same', [$f, $f]), true, '@f same @f');
		assertStrictEquals($c.sm($c, 'same', [$n, $n]), true, '@n same @n');
		assertStrictEquals($c.sm($c, 'same', [$u, $u]), true, '@u same @u');
		assertStrictEquals($c.sm($c, 'same', [$c, $c]), true, '@c same @c');
	});

	await t.step('same: JS primitives use JS === semantics', () => {
		// JS primitives: same value => same
		assertStrictEquals($c.sm($c, 'same', [5, 5]), true, '5 same 5');
		assertStrictEquals($c.sm($c, 'same', ['hello', 'hello']), true, "'hello' same 'hello'");
		assertStrictEquals($c.sm($c, 'same', [null, null]), true, 'null same null');
		assertStrictEquals($c.sm($c, 'same', [undefined, undefined]), true, 'undefined same undefined');
		assertStrictEquals($c.sm($c, 'same', [true, true]), true, 'true same true');
		assertStrictEquals($c.sm($c, 'same', [false, false]), true, 'false same false');
	});

	await t.step('same: different values are not identical', () => {
		assertStrictEquals($c.sm($c, 'same', [5, 6]), false, '5 not same 6');
		assertStrictEquals($c.sm($c, 'same', ['hello', 'world']), false, "'hello' not same 'world'");
		assertStrictEquals($c.sm($c, 'same', [$t, $f]), false, '@t not same @f');
		assertStrictEquals($c.sm($c, 'same', [null, undefined]), false, 'null not same undefined');
	});

	await t.step('same: different JS objects have distinct identity', () => {
		// JS objects and arrays have distinct identity
		const arr1 = [];
		const arr2 = [];
		assertStrictEquals($c.sm($c, 'same', [arr1, arr1]), true, 'arr1 same arr1');
		assertStrictEquals($c.sm($c, 'same', [arr2, arr2]), true, 'arr2 same arr2');
		assertStrictEquals($c.sm($c, 'same', [arr1, arr2]), false, 'arr1 not same arr2 (different objects)');

		const obj1 = {};
		const obj2 = {};
		assertStrictEquals($c.sm($c, 'same', [obj1, obj1]), true, 'obj1 same obj1');
		assertStrictEquals($c.sm($c, 'same', [obj2, obj2]), true, 'obj2 same obj2');
		assertStrictEquals($c.sm($c, 'same', [obj1, obj2]), false, 'obj1 not same obj2 (different objects)');
	});

	await t.step('== alias works like same', () => {
		assertStrictEquals($c.sm($c, '==', [$t, $t]), true, '== alias: @t == @t');
		assertStrictEquals($c.sm($c, '==', [$t, $f]), false, '== alias: @t != @f');
		assertStrictEquals($c.sm($c, '==', [5, 5]), true, '== alias: 5 == 5');
		assertStrictEquals($c.sm($c, '==', [5, 6]), false, '== alias: 5 != 6');
	});
});

// ─── @c(diff) / @c(!==) ──────────────────────────────────────────────────────

Deno.test('@c(diff) - object non-identity', async (t) => {
	await t.step('diff: same object is not different from itself', () => {
		assertStrictEquals($c.sm($c, 'diff', [$t, $t]), false, '@t diff @t => false');
		assertStrictEquals($c.sm($c, 'diff', [$f, $f]), false, '@f diff @f => false');
		assertStrictEquals($c.sm($c, 'diff', [$n, $n]), false, '@n diff @n => false');
		assertStrictEquals($c.sm($c, 'diff', [5, 5]), false, '5 diff 5 => false');
	});

	await t.step('diff: different objects are different', () => {
		assertStrictEquals($c.sm($c, 'diff', [$t, $f]), true, '@t diff @f => true');
		assertStrictEquals($c.sm($c, 'diff', [5, 6]), true, '5 diff 6 => true');
		assertStrictEquals($c.sm($c, 'diff', ['hello', 'world']), true, "'hello' diff 'world' => true");
		assertStrictEquals($c.sm($c, 'diff', [null, undefined]), true, 'null diff undefined => true');
	});

	await t.step('diff: different JS objects are different', () => {
		const arr1 = [];
		const arr2 = [];
		assertStrictEquals($c.sm($c, 'diff', [arr1, arr2]), true, 'arr1 diff arr2 => true');
		assertStrictEquals($c.sm($c, 'diff', [arr1, arr1]), false, 'arr1 diff arr1 => false');
	});

	await t.step('!== alias works like diff', () => {
		assertStrictEquals($c.sm($c, '!==', [$t, $f]), true, '!== alias: @t !== @f');
		assertStrictEquals($c.sm($c, '!==', [$t, $t]), false, '!== alias: @t === @t');
		assertStrictEquals($c.sm($c, '!==', [5, 5]), false, '!== alias: 5 === 5');
		assertStrictEquals($c.sm($c, '!==', [5, 6]), true, '!== alias: 5 !== 6');
	});
});

// ─── @n(nou) ─────────────────────────────────────────────────────────────────

Deno.test('@n(nou) - null or undefined check', async (t) => {
	const $null = $toMsjs(null);

	await t.step('nou: JS null is null-or-undefined', () => {
		assertStrictEquals($null('nou', null), true, 'JS null is nou');
		assertStrictEquals($null('nou', undefined), true, 'JS undefined is nou');
	});

	await t.step('nou: Mesgjs @n and @u are null-or-undefined', () => {
		assertStrictEquals($null('nou', $n), true, '@n is nou');
		assertStrictEquals($null('nou', $u), true, '@u is nou');
	});

	await t.step('nou: non-null/undefined values are not nou', () => {
		assertStrictEquals($null('nou', 0), false, '0 is not nou');
		assertStrictEquals($null('nou', ''), false, "'' is not nou");
		assertStrictEquals($null('nou', false), false, 'false is not nou');
		assertStrictEquals($null('nou', $f), false, '@f is not nou');
		assertStrictEquals($null('nou', $t), false, '@t is not nou');
		assertStrictEquals($null('nou', 42), false, '42 is not nou');
		assertStrictEquals($null('nou', 'hello'), false, "'hello' is not nou");
		assertStrictEquals($null('nou', $toMsjs(5)), false, '$toMsjs(5) is not nou');
	});
});

// ─── @n(def) ─────────────────────────────────────────────────────────────────

Deno.test('@n(def) - defined (not null or undefined) check', async (t) => {
	const $null = $toMsjs(null);

	await t.step('def: JS null and undefined are not defined', () => {
		assertStrictEquals($null('def', null), false, 'JS null is not def');
		assertStrictEquals($null('def', undefined), false, 'JS undefined is not def');
	});

	await t.step('def: Mesgjs @n and @u are not defined', () => {
		assertStrictEquals($null('def', $n), false, '@n is not def');
		assertStrictEquals($null('def', $u), false, '@u is not def');
	});

	await t.step('def: non-null/undefined values are defined', () => {
		assertStrictEquals($null('def', 0), true, '0 is def');
		assertStrictEquals($null('def', ''), true, "'' is def");
		assertStrictEquals($null('def', false), true, 'false is def');
		assertStrictEquals($null('def', $f), true, '@f is def');
		assertStrictEquals($null('def', $t), true, '@t is def');
		assertStrictEquals($null('def', 42), true, '42 is def');
		assertStrictEquals($null('def', 'hello'), true, "'hello' is def");
		assertStrictEquals($null('def', $toMsjs(5)), true, '$toMsjs(5) is def');
	});
});

// ─── @c(case) permutations ───────────────────────────────────────────────────

Deno.test('@c(case) - value permutations', async (t) => {
	// ── JS value as subject ──────────────────────────────────────────────────

	await t.step('case: JS number subject vs JS number comparands', () => {
		// JS 5 vs JS 4, JS 5 => matches 5
		assertEquals($c.sm($c, 'case', [5, 4, 'four', 5, 'five']), 'five', 'JS 5 matches JS 5');
		assertEquals($c.sm($c, 'case', [5, 4, 'four', 6, 'six']), undefined, 'JS 5 matches nothing => @u');
		const params = new NANOS(5, 4, 'four', 6, 'six', { else: 'other' });
		assertEquals($c.sm($c, 'case', params), 'other', 'JS 5 matches nothing => else');
	});

	// ── JS string subject ────────────────────────────────────────────────────

	await t.step('case: JS string subject vs JS string comparands', () => {
		assertEquals($c.sm($c, 'case', ['hello', 'world', 1, 'hello', 2]), 2, "JS 'hello' matches JS 'hello'");
		assertEquals($c.sm($c, 'case', ['hello', 'world', 1, 'foo', 2]), undefined, "JS 'hello' matches nothing");
	});

	// ── Boolean subjects ─────────────────────────────────────────────────────

	await t.step('case: JS boolean subject vs JS boolean comparands', () => {
		assertEquals($c.sm($c, 'case', [true, false, 'no', true, 'yes']), 'yes', 'JS true matches JS true');
		assertEquals($c.sm($c, 'case', [false, true, 'yes', false, 'no']), 'no', 'JS false matches JS false');
	});

	await t.step('case: JS boolean subject vs Mesgjs boolean comparands', () => {
		assertEquals($c.sm($c, 'case', [true, $f, 'no', $t, 'yes']), 'yes', 'JS true matches $t');
		assertEquals($c.sm($c, 'case', [false, $t, 'yes', $f, 'no']), 'no', 'JS false matches $f');
	});

	await t.step('case: Mesgjs boolean subject vs JS boolean comparands', () => {
		assertEquals($c.sm($c, 'case', [$t, false, 'no', true, 'yes']), 'yes', '$t matches JS true');
		assertEquals($c.sm($c, 'case', [$f, true, 'yes', false, 'no']), 'no', '$f matches JS false');
	});

	await t.step('case: Mesgjs boolean subject vs Mesgjs boolean comparands', () => {
		assertEquals($c.sm($c, 'case', [$t, $f, 'no', $t, 'yes']), 'yes', '$t matches $t');
		assertEquals($c.sm($c, 'case', [$f, $t, 'yes', $f, 'no']), 'no', '$f matches $f');
	});

	// ── Null/undefined subjects ──────────────────────────────────────────────

	await t.step('case: JS null subject vs JS null comparand', () => {
		assertEquals($c.sm($c, 'case', [null, undefined, 'undef', null, 'null']), 'null', 'JS null matches JS null');
	});

	await t.step('case: Mesgjs @n subject vs JS null comparand', () => {
		assertEquals($c.sm($c, 'case', [$n, undefined, 'undef', null, 'null']), 'null', '@n matches JS null');
	});

	await t.step('case: Mesgjs @n subject vs Mesgjs @n comparand', () => {
		assertEquals($c.sm($c, 'case', [$n, $u, 'undef', $n, 'null']), 'null', '@n matches @n');
		assertEquals($c.sm($c, 'case', [$u, $n, 'null', $u, 'undef']), 'undef', '@u matches @u');
	});

	await t.step('case: else= fallback when no match', () => {
		const params = new NANOS(42, 1, 'one', 2, 'two', { else: 'other' });
		assertEquals($c.sm($c, 'case', params), 'other', 'else= returned when no match');
	});

	await t.step('case: returns @u when no match and no else=', () => {
		assertEquals($c.sm($c, 'case', [99, 1, 'one', 2, 'two']), undefined, '@u returned when no match');
	});

	await t.step('case: basic string matching', () => {
		assertEquals($c.sm($c, 'case', ['b', 'a', 1, 'b', 2, 'c', 3]), 2, "case finds 'b' and returns 2");
	});

	await t.step('case: else= with NANOS params', () => {
		const params = new NANOS('a', 1, 'b', 2, { else: 99 });
		assertEquals($c.sm($c, 'case', params), 99, 'case returns else= value when no match');
	});

	await t.step(': alias works like case', () => {
		assertEquals($c.sm($c, ':', ['b', 'b', 2]), 2, ': alias: case finds match');
	});
});

// ─── Custom @eq interface ─────────────────────────────────────────────────────

Deno.test('@eq custom interface - type-based equality', async (t) => {
	/*
	 * Define a "type-eq" interface that implements @eq.
	 * Equality is defined as: the value type (d.mp.at(0)?.msjsType)
	 * matches the reference type (d.rt, the receiver's type).
	 *
	 * This means two objects of the same interface type are "equal",
	 * regardless of their internal state.
	 */
	await loadMesgjsModuleSource(`
		@c(interface type-eq)(set handlers=[
			@eq={ @c(same @c(type !0) @d(rt)) !}
		])
		@c(interface type-eq-a)(set chain=[type-eq] handlers=[])
		@c(interface type-eq-b)(set chain=[type-eq] handlers=[])
	`);

	await t.step('@eq handler is invoked by @c(case)', () => {
		const objA1 = getInstance('type-eq-a');
		const objA2 = getInstance('type-eq-a');
		const objB1 = getInstance('type-eq-b');

		// Two instances of type-eq-a should be "equal" (same type)
		// case: subject=objA1, comparand=objA2 => match (both type-eq-a)
		assertEquals(
			$c.sm($c, 'case', [objA1, objA2, 'matched-a', objB1, 'matched-b']),
			'matched-a',
			'Two type-eq-a instances match each other via @eq'
		);
	});

	await t.step('@eq handler: different types do not match', () => {
		const objA1 = getInstance('type-eq-a');
		const objB1 = getInstance('type-eq-b');

		// objA1 as subject, objB1 as comparand => no match (different types)
		assertEquals(
			$c.sm($c, 'case', [objA1, objB1, 'matched-b']),
			undefined,
			'type-eq-a does not match type-eq-b via @eq'
		);
	});

	await t.step('@eq handler: subject matches itself', () => {
		const objA1 = getInstance('type-eq-a');

		assertEquals(
			$c.sm($c, 'case', [objA1, objA1, 'self-match']),
			'self-match',
			'Object matches itself via @eq'
		);
	});

	await t.step('@c(case) with @eq: else= fallback when no type match', () => {
		const objA1 = getInstance('type-eq-a');
		const objB1 = getInstance('type-eq-b');

		const params = new NANOS(objA1, objB1, 'b-match', { else: 'no-match' });
		assertEquals(
			$c.sm($c, 'case', params),
			'no-match',
			'else= returned when @eq finds no match'
		);
	});

	await t.step('@c(case) with @eq: JS value comparand does not match typed object', () => {
		const objA1 = getInstance('type-eq-a');

		// JS string 'type-eq-a' is not a Mesgjs object, so msjsType is undefined
		assertEquals(
			$c.sm($c, 'case', [objA1, 'type-eq-a', 'string-match']),
			undefined,
			'@eq: JS string comparand does not match typed object'
		);
	});
});
