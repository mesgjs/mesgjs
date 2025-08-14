import {
    assertEquals,
    assertObjectMatch,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import { lex } from "../../src/lexparse.esm.js";

function getTokens(input) {
    return lex(input).tokens;
}

Deno.test("Lexer", async (t) => {

    await t.step("should tokenize basic words and numbers", () => {
        const tokens = getTokens("word1 123 -45.6");
        assertEquals(tokens.length, 3);
        assertObjectMatch(tokens[0], { type: 'wrd', text: 'word1' });
        assertObjectMatch(tokens[1], { type: 'num', text: '123' });
        assertObjectMatch(tokens[2], { type: 'num', text: '-45.6' });
    });

    await t.step("should tokenize strings", () => {
        const tokens = getTokens(`'hello' "world\\n"`);
        assertEquals(tokens.length, 2);
        assertObjectMatch(tokens[0], { type: 'txt', text: 'hello' });
        assertObjectMatch(tokens[1], { type: 'txt', text: 'world\n' });
    });

    await t.step("should tokenize non-eager tokens and blocks", () => {
        const tokens = getTokens("{ ( [ ] ) } !}");
        const expected = ['{', '(', '[', ']', ')', '}', '}'];
        assertEquals(tokens.length, expected.length);
        tokens.forEach((token, i) => {
            assertObjectMatch(token, { type: expected[i] });
        });
    });

    await t.step("should tokenize operator-style words", () => {
        const tokens = getTokens("= != += / .");
        assertEquals(tokens.length, 5);
        assertObjectMatch(tokens[0], { type: 'wrd', text: '=' });
        assertObjectMatch(tokens[1], { type: 'wrd', text: '!=' });
        assertObjectMatch(tokens[2], { type: 'wrd', text: '+=' });
        assertObjectMatch(tokens[3], { type: 'wrd', text: '/' });
        assertObjectMatch(tokens[4], { type: 'wrd', text: '.' });
    });

    await t.step("should handle storage variables", () => {
        const tokens = getTokens("%foo #bar !baz %*gss %/mps");
         // The lexer sees these as two tokens each: the sigil and the word
        assertEquals(tokens.length, 10);
        assertObjectMatch(tokens[0], { type: 'wrd', text: '%' });
        assertObjectMatch(tokens[1], { type: 'wrd', text: 'foo' });
    });


    await t.step("should ignore comments and whitespace", () => {
        const input = `
            // this is a comment
            word1 /* multi-line
                   comment */ word2
        `;
        const tokens = getTokens(input);
        assertEquals(tokens.length, 2);
        assertObjectMatch(tokens[0], { type: 'wrd', text: 'word1' });
        assertObjectMatch(tokens[1], { type: 'wrd', text: 'word2' });
    });

});