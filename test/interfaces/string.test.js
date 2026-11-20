import { describe, it } from '@compat/test';
import { assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { listFromPairs as ls } from '../../src/runtime/runtime.esm.js';
import { codeBlock } from '../harness.esm.js';

describe('@string Interface', () => {
	const { $toMsjs, $msjsReceiver, $c } = globalThis;
	const mString = $toMsjs('hello');

	it('Initialization and Primitives', () => {
		assertStrictEquals($msjsReceiver('').msjsType, '@string');
		assertStrictEquals(mString('valueOf'), 'hello');
		assertStrictEquals(mString('toString'), 'hello');
		assertStrictEquals(mString('@jsv'), 'hello');
		assertStrictEquals(mString('length'), 5);
	});

	it('Character Access', () => {
		assertStrictEquals(mString('at', 1), 'e');
		assertStrictEquals(mString('at', -1), 'o');
		assertStrictEquals(mString('at', 10), undefined);
		assertStrictEquals(mString('charAt', 1), 'e');
		assertStrictEquals(mString('charAt', 10), '');
		assertStrictEquals(mString('charCodeAt', 1), 101);
		assertStrictEquals(mString('codePointAt', 1), 101);
	});

	it('Comparison and Equality', () => {
		assertStrictEquals(mString('eq', 'hello'), true);
		assertStrictEquals(mString('=', 'hello'), true);
		assertStrictEquals(mString('ne', 'world'), true);
		assertStrictEquals(mString('!=', 'world'), true);
		assertStrictEquals(mString('gt', 'helln'), true);
		assertStrictEquals(mString('>', 'helln'), true);
		assertStrictEquals(mString('ge', 'hello'), true);
		assertStrictEquals(mString('>=', 'hello'), true);
		assertStrictEquals(mString('lt', 'hellp'), true);
		assertStrictEquals(mString('<', 'hellp'), true);
		assertStrictEquals(mString('le', 'hello'), true);
		assertStrictEquals(mString('<=', 'hello'), true);
	});

	it('Multi-parameter Equality (eq/=)', () => {
		// Test with multiple parameters - should match if any parameter matches
		assertStrictEquals(mString('eq', ls([, 'hi', , 'hello', , 'hey'])), true, "Should match 'hello' in list");
		assertStrictEquals(mString('=', ls([, 'hi', , 'hello', , 'hey'])), true, "Should match 'hello' in list using = operator");
		assertStrictEquals(mString('eq', ls([, 'hi', , 'hey', , 'howdy'])), false, 'Should not match any in list');
		assertStrictEquals(mString('=', ls([, 'hi', , 'hey', , 'howdy'])), false, 'Should not match any in list using = operator');

		// Test with single parameter (backward compatibility)
		assertStrictEquals(mString('eq', 'hello'), true, 'Single parameter should still work');
		assertStrictEquals(mString('=', 'hello'), true, 'Single parameter with = should still work');

		// Test case-insensitive matching pattern (like the example in docs)
		const answer = $toMsjs('yes');
		assertStrictEquals($toMsjs(answer('toLower'))('=', ls([, 'y', , 'yes', , 'yup', , 'yeah'])), true, "Should match 'yes' after toLower");

		const answer2 = $toMsjs('YUP');
		assertStrictEquals($toMsjs(answer2('toLower'))('=', ls([, 'y', , 'yes', , 'yup', , 'yeah'])), true, "Should match 'yup' after toLower");

		const answer3 = $toMsjs('nope');
		assertStrictEquals($toMsjs(answer3('toLower'))('=', ls([, 'y', , 'yes', , 'yup', , 'yeah'])), false, "Should not match 'nope'");

		// Test with RIC (run-if-code) values - mocked code blocks
		const ricHello = codeBlock(() => 'hello');
		const ricWorld = codeBlock(() => 'world');
		const ricHey = codeBlock(() => 'hey');

		assertStrictEquals(mString('eq', ls([, 'hi', , ricHello, , ricHey])), true, "Should match RIC value that returns 'hello'");
		assertStrictEquals(mString('=', ls([, ricWorld, , ricHello])), true, 'Should match RIC value using = operator');
		assertStrictEquals(mString('eq', ls([, ricWorld, , ricHey])), false, 'Should not match any RIC values');
	});

	it('Multi-parameter Inequality (ne/!=)', () => {
		// Test with multiple parameters - should be false if any parameter matches
		assertStrictEquals(mString('ne', ls([, 'hi', , 'hello', , 'hey'])), false, "Should be false when 'hello' matches");
		assertStrictEquals(mString('!=', ls([, 'hi', , 'hello', , 'hey'])), false, "Should be false when 'hello' matches using != operator");
		assertStrictEquals(mString('ne', ls([, 'hi', , 'hey', , 'howdy'])), true, 'Should be true when none match');
		assertStrictEquals(mString('!=', ls([, 'hi', , 'hey', , 'howdy'])), true, 'Should be true when none match using != operator');

		// Test with single parameter (backward compatibility)
		assertStrictEquals(mString('ne', 'hello'), false, 'Single parameter should still work');
		assertStrictEquals(mString('!=', 'hello'), false, 'Single parameter with != should still work');
		assertStrictEquals(mString('ne', 'world'), true, 'Single non-matching parameter should return true');

		// Test case-insensitive matching pattern (like the example in docs)
		const answer = $toMsjs('no');
		assertStrictEquals($toMsjs(answer('toLower'))('!=', ls([, 'n', , 'no', , 'nope', , 'nah'])), false, "Should be false when 'no' matches");

		const answer2 = $toMsjs('maybe');
		assertStrictEquals($toMsjs(answer2('toLower'))('!=', ls([, 'n', , 'no', , 'nope', , 'nah'])), true, "Should be true when 'maybe' doesn't match");

		// Test with RIC (run-if-code) values - mocked code blocks
		const ricHello = codeBlock(() => 'hello');
		const ricWorld = codeBlock(() => 'world');
		const ricHey = codeBlock(() => 'hey');

		assertStrictEquals(mString('ne', ls([, 'hi', , ricHello, , ricHey])), false, "Should be false when RIC value returns 'hello'");
		assertStrictEquals(mString('!=', ls([, ricWorld, , ricHello])), false, 'Should be false when RIC value matches using != operator');
		assertStrictEquals(mString('ne', ls([, ricWorld, , ricHey])), true, 'Should be true when no RIC values match');
	});

	it('Searching and Substrings', () => {
		assertStrictEquals(mString('includes', 'ell'), true);
		assertStrictEquals(mString('startsWith', 'he'), true);
		assertStrictEquals(mString('endsWith', 'lo'), true);
		assertStrictEquals(mString('indexOf', 'l'), 2);
		assertStrictEquals(mString('lastIndexOf', 'l'), 3);
		assertStrictEquals(mString('slice', ls([, 1, , 4])), 'ell');
		assertStrictEquals(mString('substring', ls([, 1, , 4])), 'ell');
	});

	it('Modification and Manipulation', () => {
		assertStrictEquals(mString('toUpper'), 'HELLO');
		assertStrictEquals(mString('toLower'), 'hello');
		const padded = $toMsjs('  hi  ');
		assertStrictEquals(padded('trim'), 'hi');
		assertStrictEquals(padded('trimStart'), 'hi  ');
		assertStrictEquals(padded('trimEnd'), '  hi');
		assertStrictEquals(mString('repeat', 2), 'hellohello');
		assertStrictEquals(mString('*', 2), 'hellohello'); // repeat alias
		assertStrictEquals(mString('padStart', ls([, 8, , '.'])), '...hello');
		assertStrictEquals(mString('padEnd', ls([, 8, , '.'])), 'hello...');
		assertStrictEquals(mString('replace', ls([, 'l', , 'x'])), 'hexlo');
		assertStrictEquals(mString('replaceAll', ls([, 'l', , 'x'])), 'hexxo');
	});

	it('Joining and Splitting', () => {
		assertStrictEquals(mString('join', ls([, 'a', , 'b'])), 'helloab');
		assertStrictEquals(mString('join', ls([, 'a', , 'b', 'with', '-'])), 'hello-a-b');
		assertStrictEquals($toMsjs('-')('joining', ls([, 'a', , 'b'])), 'a-b');
		const split = mString('split', '');
		assertStrictEquals(split.size, 5);
		assertStrictEquals(split.at(0), 'h');
	});

	it('Conversion', () => {
		assertStrictEquals($toMsjs('123')('toInt'), 123);
		assertStrictEquals($toMsjs('123.45')('toFloat'), 123.45);
		assertStrictEquals($toMsjs('123')('toBigInt'), 123n);
		const re = mString('re', 'g');
		assertStrictEquals(re instanceof RegExp, true);
		assertStrictEquals($c.sm(re, 'source'), 'hello');
		assertStrictEquals($c.sm(re, 'flags'), 'g');
	});
});
