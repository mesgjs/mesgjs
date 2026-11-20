import { describe, it } from '@compat/test';
import { assertStrictEquals, assertThrows } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { listFromPairs as ls } from '../../src/runtime/runtime.esm.js';
import { codeBlock } from '../harness.esm.js';

describe('@try Interface', () => {
	const { $c } = globalThis;
	const mTry = $c.getInstance('@try');

	it('Successful execution', () => {
		const main = codeBlock(() => 'success');
		const result = $c.sm(mTry, 'try', ls([, main]));
		assertStrictEquals(result, 'success');
	});

	it('Catch block', () => {
		const main = codeBlock(() => {
			throw new Error('test error');
		});
		let caught = false;
		const catchBlock = codeBlock(() => {
			caught = true;
			assertStrictEquals($c.sm(mTry, 'error').message, 'test error');
			assertStrictEquals($c.sm(mTry, 'name'), 'Error');
			assertStrictEquals($c.sm(mTry, 'message'), 'test error');
		});
		$c.sm(mTry, 'try', ls([, main, 'catch', catchBlock]));
		assertStrictEquals(caught, true);
	});

	it('Catchers block', () => {
		const main = codeBlock(() => {
			throw new TypeError('type error');
		});
		let caught = false;
		const catchers = ls([
			'TypeError',
			codeBlock(() => {
				caught = true;
				assertStrictEquals($c.sm(mTry, 'name'), 'TypeError');
			}),
		]);
		$c.sm(mTry, 'try', ls([, main, 'catchers', catchers]));
		assertStrictEquals(caught, true);
	});

	it('Always block', () => {
		let always = false;
		const main = codeBlock(() => 'success');
		const alwaysBlock = codeBlock(() => {
			always = true;
		});
		$c.sm(mTry, 'try', ls([, main, 'always', alwaysBlock]));
		assertStrictEquals(always, true);

		always = false;
		const errorMain = codeBlock(() => {
			throw new Error('fail');
		});
		assertThrows(() => $c.sm(mTry, 'try', ls([, errorMain, 'always', alwaysBlock])), Error);
		assertStrictEquals(always, true);
	});

	it('Unhandled exception', () => {
		const main = codeBlock(() => {
			throw new Error('unhandled');
		});
		assertThrows(() => $c.sm(mTry, 'try', main), Error, 'unhandled');
	});

	it('Flow control', () => {
		let secondBlockRun = false;
		const first = codeBlock(() => {
			$c.sm(mTry, 'next');
		});
		const second = codeBlock(() => {
			secondBlockRun = true;
			return 'second';
		});
		const result = $c.sm(mTry, 'try', ls([, first, , second]));
		assertStrictEquals(secondBlockRun, true);
		assertStrictEquals(result, 'second');

		const stopBlock = codeBlock(() => {
			$c.sm(mTry, 'stop', ls(['result', 'stopped']));
			return 'not stopped';
		});
		const stopResult = $c.sm(mTry, 'try', [stopBlock]);
		assertStrictEquals(stopResult, 'stopped');
	});
});
