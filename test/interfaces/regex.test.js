import { describe, it } from '@compat/test';
import { assert, assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { listFromPairs as ls } from '../../src/runtime/runtime.esm.js';
import { codeBlock } from '../harness.esm.js';

describe('@regex Interface', () => {
	const { $c, $toMsjs, $msjsReceiver } = globalThis;
	const mString = $toMsjs('hello world');

	it('consistent receivers', () => {
		const re = /hello/;
		assertStrictEquals($msjsReceiver(re), $msjsReceiver(re));
	});

	it('Initialization', () => {
		const mRegex = mString('re', 'g');
		assertStrictEquals(mRegex instanceof RegExp, true);
		assertStrictEquals($c.sm(mRegex, 'source'), 'hello world');
		assertStrictEquals($c.sm(mRegex, 'flags'), 'g');
	});

	it('(test)', () => {
		const mRegex = mString('re', 'g');
		assertStrictEquals($c.sm(mRegex, 'test', 'hello'), false);
		assertStrictEquals($c.sm(mRegex, 'test', 'hello world hello'), true);
	});

	it('(exec)', () => {
		const mRegex = mString('re', 'g');
		const res = $c.sm(mRegex, 'exec', 'Well, hello world!');
		assertStrictEquals(res?.at(0), 'hello world');
	});

	it('(match1)', () => {
		const mRegex = mString('re', 'g');
		const res = $c.sm(mRegex, 'match1', 'Well, hello world!');
		assertStrictEquals(res?.at(0), 'hello world');
		const noMatch = $toMsjs(/a/)('match1', 'b');
		assertStrictEquals(noMatch, null);
	});

	it('(search)', () => {
		const mRegex = mString('re', 'g');
		const res = $c.sm(mRegex, 'search', 'Well, hello world!');
		assertStrictEquals(res, 6);
		const noMatch = $toMsjs(/a/)('search', 'b');
		assertStrictEquals(noMatch, -1);
	});

	it('(matchAll)', () => {
		const re = /t(e)(st(\d?))/g;
		const rem = $c.getInstance('@rematch');
		const str = 'test1test2';
		const expected = [
			['test1', 'e', 'st1', '1'],
			['test2', 'e', 'st2', '2'],
		];
		let i = 0;
		const each = codeBlock(() => {
			const match = $c.sm(rem, 'match');
			assert(match?.size >= 4);
			assertStrictEquals(match?.at(0), expected[i][0]);
			assertStrictEquals(match?.at(1), expected[i][1]);
			assertStrictEquals(match?.at(2), expected[i][2]);
			assertStrictEquals(match?.at(3), expected[i][3]);
			i++;
		});
		$c.sm(rem, 'matchAll', ls([, re, , str, 'each', each]));
		assertStrictEquals(i, 2);

		const elseBlock = codeBlock(() => assert(true));
		$c.sm(rem, 'matchAll', ls([, /a/g, , 'b', 'else', elseBlock]));
	});
});
