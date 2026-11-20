import { describe, it } from '@compat/test';
import { assertEquals, assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { codeBlock } from '../harness.esm.js';

describe('@core Interface Logic and Flow Control', () => {
	const { $c, $t, $f, $n, $u, NANOS } = globalThis;
	const { getInstance } = $c;

	it('consistant instances', () => {
		assertStrictEquals($c, getInstance('@core'));
	});

	it('(and) should return first falsey or last truthy value', () => {
		assertStrictEquals($c.sm($c, 'and', [$t, $t, 'last']), 'last');
		assertStrictEquals($c.sm($c, 'and', [$t, $f, 'never']), false);
		assertStrictEquals($c.sm($c, 'and', []), true); // Default
	});

	it('(or) should return first truthy or last falsey value', () => {
		assertStrictEquals($c.sm($c, 'or', [$f, 'first', $t]), 'first');
		assertStrictEquals($c.sm($c, 'or', [$f, 0, $n]), null);
		assertStrictEquals($c.sm($c, 'or', []), false); // Default
	});

	it('(not) should return the logical opposite', () => {
		assertStrictEquals($c.sm($c, 'not', $t), false);
		assertStrictEquals($c.sm($c, 'not', 'hello'), false);
		assertStrictEquals($c.sm($c, 'not', ''), true);
	});

	it('(xor) should return the value if exactly one is true', () => {
		assertStrictEquals($c.sm($c, 'xor', [$f, 'one', $f]), 'one');
		assertStrictEquals($c.sm($c, 'xor', ['one', 'two', $f]), false);
		assertStrictEquals($c.sm($c, 'xor', [$f, $t, $f, $f]), true);
		assertStrictEquals($c.sm($c, 'xor', [$f, $f]), false);
	});

	it('(if) should execute the correct branch', () => {
		assertStrictEquals($c.sm($c, 'if', [$t, 'A', $f, 'B']), 'A');
		assertStrictEquals($c.sm($c, 'if', [$f, 'A', $t, 'B']), 'B');
		const params = new NANOS($f, 'A', $f, 'B', { else: 'C' });
		assertStrictEquals($c.sm($c, 'if', params), 'C');
		assertStrictEquals($c.sm($c, 'if', [0, 'A', 1, 'B']), 'B');
	});

	it('aliases should work like their primary operations', () => {
		// & -> and
		assertStrictEquals($c.sm($c, '&', [$t, $t]), true);
		assertStrictEquals($c.sm($c, '&', [$t, $f]), false);
		// | -> or
		assertStrictEquals($c.sm($c, '|', [$f, $t]), true);
		assertStrictEquals($c.sm($c, '|', [$f, $f]), false);
		// ~ -> not
		assertStrictEquals($c.sm($c, '~', $t), false);
		assertStrictEquals($c.sm($c, '~', $f), true);
		// ? -> if
		assertStrictEquals($c.sm($c, '?', [$t, 'A']), 'A');
		// + -> get
		assertStrictEquals($c.sm($c, '+', '@string').msjsType, '@string');
	});

	it('(await) should evaluate blocks in order', async () => {
		const order = [];
		const slow = codeBlock(() => new Promise(resolve => setTimeout(() => {
			order.push('slow');
			resolve('slow');
		}, 20)));
		const fast = codeBlock(() => new Promise(resolve => setTimeout(() => {
			order.push('fast');
			resolve('fast');
		}, 10)));

		const p = $c.sm($c, 'await', [slow, fast]);

		assertStrictEquals(p.msjsType, '@promise');

		const result = await p;
		assertEquals(order, ['slow', 'fast']);
		assertStrictEquals(result, 'fast');
	});

	it('(await collect=@t) should collect results', async () => {
		const slow = codeBlock(() => new Promise(resolve => setTimeout(() => resolve('slow'), 20)));
		const fast = codeBlock(() => new Promise(resolve => setTimeout(() => resolve('fast'), 10)));

		const p = $c.sm($c, 'await', new NANOS(slow, fast, { collect: true }));
		const result = await p;

		assertStrictEquals(result.next, 2);
		assertStrictEquals(result.at(0), 'slow');
		assertStrictEquals(result.at(1), 'fast');
	});
});
