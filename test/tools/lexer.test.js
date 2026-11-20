import { describe, it } from '@compat/test';
import { assertStrictEquals } from '@std/assert';
import { lex } from '../../src/lexparse.esm.js';

function getTokens(input) {
	return lex(input).tokens;
}

function assertObjectMatch(actual, expected) {
	for (const [key, value] of Object.entries(expected)) {
		assertStrictEquals(actual[key], value);
	}
}

describe('Lexer', () => {
	it('should tokenize basic words and numbers', () => {
		const tokens = getTokens('word1 123 -45.6 +789');
		assertStrictEquals(tokens.length, 4);
		assertObjectMatch(tokens[0], { type: 'wrd', text: 'word1' });
		assertObjectMatch(tokens[1], { type: 'num', text: '123' });
		assertObjectMatch(tokens[2], { type: 'num', text: '-45.6' });
		assertObjectMatch(tokens[3], { type: 'num', text: '+789' });
	});

	it('should tokenize various number formats', () => {
		const tokens = getTokens('0b101 0o777 0xFF 0xabc 1e5 1.23e-2 123n');
		assertStrictEquals(tokens.length, 7);
		assertObjectMatch(tokens[0], { type: 'num', text: '0b101' });
		assertObjectMatch(tokens[1], { type: 'num', text: '0o777' });
		assertObjectMatch(tokens[2], { type: 'num', text: '0xFF' });
		assertObjectMatch(tokens[3], { type: 'num', text: '0xabc' });
		assertObjectMatch(tokens[4], { type: 'num', text: '1e5' });
		assertObjectMatch(tokens[5], { type: 'num', text: '1.23e-2' });
		assertObjectMatch(tokens[6], { type: 'num', text: '123n' });
	});

	it('should tokenize strings', () => {
		const tokens = getTokens(`'hello' "world\\n"`);
		assertStrictEquals(tokens.length, 2);
		assertObjectMatch(tokens[0], { type: 'txt', text: 'hello' });
		assertObjectMatch(tokens[1], { type: 'txt', text: 'world\n' });
	});

	it('should tokenize non-eager tokens and blocks', () => {
		const tokens = getTokens('{ ( [ ] ) } !}');
		const expected = ['{', '(', '[', ']', ')', '}', '}'];
		assertStrictEquals(tokens.length, expected.length);
		tokens.forEach((token, i) => {
			assertObjectMatch(token, { type: expected[i] });
		});
		assertObjectMatch(tokens[6], { return: true });
	});

	it('should tokenize operator-style words', () => {
		const tokens = getTokens('= != += / .');
		assertStrictEquals(tokens.length, 5);
		assertObjectMatch(tokens[0], { type: 'wrd', text: '=' });
		assertObjectMatch(tokens[1], { type: 'wrd', text: '!=' });
		assertObjectMatch(tokens[2], { type: 'wrd', text: '+=' });
		assertObjectMatch(tokens[3], { type: 'wrd', text: '/' });
		assertObjectMatch(tokens[4], { type: 'wrd', text: '.' });
	});

	it('should handle storage variables', () => {
		const tokens = getTokens('%foo #bar !baz %*gss %/mps');
		// The lexer sees these as two tokens each: the sigil and the word
		assertStrictEquals(tokens.length, 10);
		assertObjectMatch(tokens[0], { type: 'wrd', text: '%' });
		assertObjectMatch(tokens[1], { type: 'wrd', text: 'foo' });
	});

	it('should ignore comments and whitespace', () => {
		const input = `
			// this is a comment
			word1 /* multi-line
				   comment */ word2
		`;
		const tokens = getTokens(input);
		assertStrictEquals(tokens.length, 2);
		assertObjectMatch(tokens[0], { type: 'wrd', text: 'word1' });
		assertObjectMatch(tokens[1], { type: 'wrd', text: 'word2' });
	});

	it('should handle complex non-space-separated tokens', () => {
		const tokens = getTokens('lmp=!-1');
		assertStrictEquals(tokens.length, 4);
		assertObjectMatch(tokens[0], { type: 'wrd', text: 'lmp' });
		assertObjectMatch(tokens[1], { type: 'wrd', text: '=' });
		assertObjectMatch(tokens[2], { type: 'wrd', text: '!' });
		assertObjectMatch(tokens[3], { type: 'num', text: '-1' });
	});

	it('should distinguish between op-words and numbers', () => {
		const tokens = getTokens('a(b)-1');
		assertStrictEquals(tokens.length, 5);
		assertObjectMatch(tokens[0], { type: 'wrd', text: 'a' });
		assertObjectMatch(tokens[1], { type: '(' });
		assertObjectMatch(tokens[2], { type: 'wrd', text: 'b' });
		assertObjectMatch(tokens[3], { type: ')' });
		assertObjectMatch(tokens[4], { type: 'num', text: '-1' });

		const tokens2 = getTokens('a(b)- 1');
		assertStrictEquals(tokens2.length, 6);
		assertObjectMatch(tokens2[4], { type: 'wrd', text: '-' });
		assertObjectMatch(tokens2[5], { type: 'num', text: '1' });
	});

	it('should correctly tokenize various word/op-word/number combinations', () => {
		const tokens1 = getTokens('x#y');
		assertStrictEquals(tokens1.length, 3);
		assertObjectMatch(tokens1[0], { type: 'wrd', text: 'x' });
		assertObjectMatch(tokens1[1], { type: 'wrd', text: '#' });
		assertObjectMatch(tokens1[2], { type: 'wrd', text: 'y' });

		const tokens2 = getTokens('x=#y');
		assertStrictEquals(tokens2.length, 4);
		assertObjectMatch(tokens2[0], { type: 'wrd', text: 'x' });
		assertObjectMatch(tokens2[1], { type: 'wrd', text: '=' });
		assertObjectMatch(tokens2[2], { type: 'wrd', text: '#' });
		assertObjectMatch(tokens2[3], { type: 'wrd', text: 'y' });

		const tokens3 = getTokens('404NOTFOUND');
		assertStrictEquals(tokens3.length, 1);
		assertObjectMatch(tokens3[0], { type: 'wrd', text: '404NOTFOUND' });

		const tokens4 = getTokens('404-NOTFOUND');
		assertStrictEquals(tokens4.length, 3);
		assertObjectMatch(tokens4[0], { type: 'num', text: '404' });
		assertObjectMatch(tokens4[1], { type: 'wrd', text: '-' });
		assertObjectMatch(tokens4[2], { type: 'wrd', text: 'NOTFOUND' });
	});

	describe('@debug blocks', () => {
		it('should tokenize Mesgjs code inside @debug blocks', () => {
			const tokens = getTokens('@debug{ word1 123 }');
			assertStrictEquals(tokens.length, 4);
			assertObjectMatch(tokens[0], { type: 'dbg' });
			assertObjectMatch(tokens[1], { type: 'wrd', text: 'word1' });
			assertObjectMatch(tokens[2], { type: 'num', text: '123' });
			assertObjectMatch(tokens[3], { type: '}' });
		});
	});

	describe('@js blocks', () => {
		it('should treat content inside @js blocks as a single text token', () => {
			const tokens = getTokens('@js{ const x = { y: [1] }; @}');
			assertStrictEquals(tokens.length, 1);
			assertObjectMatch(tokens[0], { type: 'js', text: ' const x = { y: [1] }; ' });
		});
	});
});
