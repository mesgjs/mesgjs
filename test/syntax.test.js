/**
 * Test Mesgjs syntax coverage
 * Tests language syntax elements based on the grammar in Mesgjs-Syntax.md
 *
 * This test focuses on SYNTAX, not runtime behavior or interface operations.
 * The only operators in Mesgjs are:
 * - Storage operators: !, !?, #, #?, %, %?, %%, %%?, %*, %*?, %/, %/?
 * - Key/value association operator: =
 *
 * Reserved special objects: @c, @d, @e, @f, @n, @t, @u, @posinf, @neginf
 */

import { test } from '@cross/test';
import { assert, assertStrictEquals } from '@std/assert';
import '../src/runtime/mesgjs.esm.js';
// Being foundational to the language, NANOS is added to globalThis when the runtime is loaded
import { loadMesgjsModuleSource, transpileMesgjs } from "./harness.esm.js";
import { lex, parse } from "../src/lexparse.esm.js";

test('Mesgjs Syntax Coverage', async (t) => {
	const $gss = globalThis.$gss;
	const $c = globalThis.$c;

	await t.step('should handle number literals', async () => {
		await loadMesgjsModuleSource(`
			%*(nset
				decimal=42
				negative=-17
				float=3.14
				scientific=1.5e3
				binary=0b1010
				octal=0o755
				hex=0xFF
				bigint=123456789012345678901234567890n
			)
		`);

		assertStrictEquals($gss.at('decimal'), 42, 'Decimal number literal');
		assertStrictEquals($gss.at('negative'), -17, 'Negative number literal');
		assertStrictEquals($gss.at('float'), 3.14, 'Float number literal');
		assertStrictEquals($gss.at('scientific'), 1500, 'Scientific notation literal');
		assertStrictEquals($gss.at('binary'), 10, 'Binary number literal');
		assertStrictEquals($gss.at('octal'), 493, 'Octal number literal');
		assertStrictEquals($gss.at('hex'), 255, 'Hex number literal');
		assertStrictEquals($gss.at('bigint'), 123456789012345678901234567890n, 'BigInt literal');
	});

	await t.step('should handle text literals (qtext) with escape sequences', async () => {
		await loadMesgjsModuleSource(`
			%*(nset
				single='single quoted'
				double="double quoted"
				backslash='back\\\\slash'
				newline='line1\\nline2'
				tab='tab\\there'
				hex='hex\\x41'
				unicode='unicode\\u0041'
				singleQuote='it\\'s'
				doubleQuote="say \\"hi\\""
				empty=''
			)
		`);

		assertStrictEquals($gss.at('single'), 'single quoted', 'Single-quoted text');
		assertStrictEquals($gss.at('double'), 'double quoted', 'Double-quoted text');
		assertStrictEquals($gss.at('backslash'), 'back\\slash', 'Backslash escape \\b');
		assertStrictEquals($gss.at('newline'), 'line1\nline2', 'Newline escape \\n');
		assertStrictEquals($gss.at('tab'), 'tab\there', 'Tab escape \\t');
		assertStrictEquals($gss.at('hex'), 'hexA', 'Hex escape \\x');
		assertStrictEquals($gss.at('unicode'), 'unicodeA', 'Unicode escape \\u');
		assertStrictEquals($gss.at('singleQuote'), "it's", 'Escaped single quote');
		assertStrictEquals($gss.at('doubleQuote'), 'say "hi"', 'Escaped double quote');
		assertStrictEquals($gss.at('empty'), '', 'Empty string');
	});

	await t.step('should handle code point escapes and transpile to proper surrogate pairs', async () => {
		const source = `
			%*(nset
				hex_cp='\\u{1F600}'
				dec_cp='\\u{0d128512}'
				dec_cp_upper='\\u{0D128512}'
				bmp_cp='\\u{41}'
			)
		`;

		// 1. Verify transpilation output contains proper surrogate pairs
		const transpiled = transpileMesgjs(source);
		assert(transpiled.includes("'\\ud83d\\ude00'"), "Transpiled JS should contain surrogate pair for hex code point escape");
		assert(transpiled.includes("'A'"), "Transpiled JS should contain 'A' for BMP code point escape");

		// 2. Load and verify runtime values
		await loadMesgjsModuleSource(source);
		assertStrictEquals($gss.at('hex_cp'), '\uD83D\uDE00', 'Hexadecimal Unicode code point escape');
		assertStrictEquals($gss.at('dec_cp'), '\uD83D\uDE00', 'Decimal Unicode code point escape (lowercase d)');
		assertStrictEquals($gss.at('dec_cp_upper'), '\uD83D\uDE00', 'Decimal Unicode code point escape (uppercase D)');
		assertStrictEquals($gss.at('bmp_cp'), 'A', 'BMP Unicode code point escape');
	});

	await t.step('should handle word literals (regularWord and opWord)', async () => {
		await loadMesgjsModuleSource(`
			%*(nset
				simple=hello
				hyphenated=hello-world
				underscored=hello_world
				withNumbers=test123
				withSlash=and/or
				withPlus=bread+butter
				colonPrefixed=:prefixed
				atPrefixed=@custom
			)
		`);

		assertStrictEquals($gss.at('simple'), 'hello', 'Simple word');
		assertStrictEquals($gss.at('hyphenated'), 'hello-world', 'Hyphenated word');
		assertStrictEquals($gss.at('underscored'), 'hello_world', 'Underscored word');
		assertStrictEquals($gss.at('withNumbers'), 'test123', 'Word with numbers');
		assertStrictEquals($gss.at('withSlash'), 'and/or', 'Word with slash');
		assertStrictEquals($gss.at('withPlus'), 'bread+butter', 'Word with plus');
		assertStrictEquals($gss.at('colonPrefixed'), ':prefixed', 'Colon-prefixed word');
		assertStrictEquals($gss.at('atPrefixed'), '@custom', 'At-prefixed word');
	});

	await t.step('should handle operator-style words (opWords)', async () => {
		await loadMesgjsModuleSource(`
			// Op-words as values in lists
			// Note: In key=value context, some combinations parse as two tokens
			// For example, "opWord1=<" parses as "opWord1" followed by op-word "=<"
			%*(nset opWords=[< <= > >= == !=])
		`);

		const opWords = $gss.at('opWords');
		assertStrictEquals(opWords.at(0), '<', 'Op-word <');
		assertStrictEquals(opWords.at(1), '<=', 'Op-word <=');
		assertStrictEquals(opWords.at(2), '>', 'Op-word >');
		assertStrictEquals(opWords.at(3), '>=', 'Op-word >=');
		assertStrictEquals(opWords.at(4), '==', 'Op-word ==');
		assertStrictEquals(opWords.at(5), '!=', 'Op-word !=');
	});

	await t.step('should handle special object literals', async () => {
		await loadMesgjsModuleSource(`
			%*(nset
				trueVal=@t
				falseVal=@f
				nullVal=@n
				undefinedVal=@u
				posInf=@posinf
				negInf=@neginf
			)
		`);

		assertStrictEquals($gss.at('trueVal'), true, '@t is true');
		assertStrictEquals($gss.at('falseVal'), false, '@f is false');
		assertStrictEquals($gss.at('nullVal'), null, '@n is null');
		assertStrictEquals($gss.at('undefinedVal'), undefined, '@u is undefined');
		assertStrictEquals($gss.at('posInf'), Infinity, '@posinf is positive infinity');
		assertStrictEquals($gss.at('negInf'), -Infinity, '@neginf is negative infinity');
	});

	await t.step('should handle list literals', async () => {
		await loadMesgjsModuleSource(`
			%*(nset
				empty=[]
				simple=[a b c]
				mixed=[1 two 3.0]
				nested=[outer [inner1 inner2] last]
			)
		`);

		const empty = $gss.at('empty');
		assertStrictEquals(empty.size, 0, 'Empty list');

		const simple = $gss.at('simple');
		assertStrictEquals(simple.at(0), 'a', 'Simple list element 0');
		assertStrictEquals(simple.at(1), 'b', 'Simple list element 1');
		assertStrictEquals(simple.at(2), 'c', 'Simple list element 2');

		const mixed = $gss.at('mixed');
		assertStrictEquals(mixed.at(0), 1, 'Mixed list number');
		assertStrictEquals(mixed.at(1), 'two', 'Mixed list word');
		assertStrictEquals(mixed.at(2), 3.0, 'Mixed list float');

		const nested = $gss.at('nested');
		assertStrictEquals(nested.at(0), 'outer', 'Nested list outer element');
		const inner = nested.at(1);
		assertStrictEquals(inner.at(0), 'inner1', 'Nested list inner element 0');
		assertStrictEquals(inner.at(1), 'inner2', 'Nested list inner element 1');
		assertStrictEquals(nested.at(2), 'last', 'Nested list last element');
	});

	await t.step('should handle named values in lists (key=value association)', async () => {
		await loadMesgjsModuleSource(`
			%*(nset
				named=[x=10 y=20 z=30]
				mixed=[first 2 third=3 4]
			)
		`);

		const named = $gss.at('named');
		assertStrictEquals(named.at('x'), 10, 'Named value x');
		assertStrictEquals(named.at('y'), 20, 'Named value y');
		assertStrictEquals(named.at('z'), 30, 'Named value z');

		const mixed = $gss.at('mixed');
		assertStrictEquals(mixed.at(0), 'first', 'Mixed list positional 0');
		assertStrictEquals(mixed.at(1), 2, 'Mixed list positional 1');
		assertStrictEquals(mixed.at('third'), 3, 'Mixed list named value');
		assertStrictEquals(mixed.at(2), 4, 'Mixed list positional 2');
	});

	await t.step('should handle block literals', async () => {
		await loadMesgjsModuleSource(`
			// Non-returning block
			%*(nset nonReturning={ 17 }(run))

			// Returning block
			%*(nset returning={ 42 !}(run))

			// Block as value (not executed)
			#(nset block={ code })
			%*(nset blockType=@c(type #block))
		`);

		assertStrictEquals($gss.at('nonReturning'), undefined, 'Non-returning block returns undefined');
		assertStrictEquals($gss.at('returning'), 42, 'Returning block returns value');
		assertStrictEquals($gss.at('blockType'), '@code', 'Block literal has @code type');
	});

	await t.step('should handle message syntax', async () => {
		await loadMesgjsModuleSource(`
			// Simple message
			%*(nset simple=5(add 3))

			// Message with multiple parameters
			%*(nset multi=hello(join ' ' world))

			// Message with named parameters
			%*(nset named=[a=1 b=2](at a))
		`);

		assertStrictEquals($gss.at('simple'), 8, 'Simple message');
		assertStrictEquals($gss.at('multi'), 'hello world', 'Message with multiple parameters');
		assertStrictEquals($gss.at('named'), 1, 'Message with named parameter');
	});

	await t.step('should handle message chains', async () => {
		await loadMesgjsModuleSource(`
			// Chain multiple messages
			%*(nset chain=10(add 5)(mul 2))

			// Chain on storage
			#(nset value=5)
			%*(nset fromStorage=#value(add 10)(mul 2))
		`);

		assertStrictEquals($gss.at('chain'), 30, 'Message chain: (10+5)*2');
		assertStrictEquals($gss.at('fromStorage'), 30, 'Message chain from storage: (5+10)*2');
	});

	await t.step('should handle list-op messages', async () => {
		await loadMesgjsModuleSource(`
			// List-op with positional operation
			%*(nset positional=[a b c]([at] 1))

			// List-op with op=op (operation as named parameter)
			%*(nset opEqOp=[x=1 y=2]([op=at] x))

			// List-op with params=[replacement params]
			#(nset myList=[1 2 3])
			%*(nset withParams=#myList([at params=[0]]))

			// List-op with else={missing-method fallback}
			%*(nset withElse=[a b c]([nonexistent else={ fallback !}]))
		`);

		assertStrictEquals($gss.at('positional'), 'b', 'List-op with positional operation');
		assertStrictEquals($gss.at('opEqOp'), 1, 'List-op with op=op');
		assertStrictEquals($gss.at('withParams'), 1, 'List-op with params=[]');
		assertStrictEquals($gss.at('withElse'), 'fallback', 'List-op with else=...');
	});

	await t.step('should handle storage operators - scratch (#)', async () => {
		await loadMesgjsModuleSource(`
			// Set scratch values
			#(nset x=100 y=200)

			// Read scratch values
			%*(nset scratchX=#x)
			%*(nset scratchY=#y)

			// Use in expressions
			%*(nset scratchSum=#x(add #y))
		`);

		assertStrictEquals($gss.at('scratchX'), 100, 'Scratch storage #x');
		assertStrictEquals($gss.at('scratchY'), 200, 'Scratch storage #y');
		assertStrictEquals($gss.at('scratchSum'), 300, 'Scratch storage arithmetic');
	});

	await t.step('should handle storage operators - optional scratch (#?)', async () => {
		await loadMesgjsModuleSource(`
			#(nset exists=42)

			%*(nset
				missing=#?nonexistent
				present=#?exists
			)
		`);

		assertStrictEquals($gss.at('missing'), undefined, 'Optional scratch #? returns undefined for missing');
		assertStrictEquals($gss.at('present'), 42, 'Optional scratch #? returns value when present');
	});

	await t.step('should handle storage operators - parameters (!)', async () => {
		await loadMesgjsModuleSource(`
			// Create function that uses parameter storage
			#(nset func={
				!0(add !1)
			!}(fn))

			%*(nset result=#func(call 10 20))
		`);

		assertStrictEquals($gss.at('result'), 30, 'Parameter storage ! in function');
	});

	await t.step('should handle storage operators - optional parameters (!?)', async () => {
		await loadMesgjsModuleSource(`
			// Function with optional parameter
			#(nset func={
				!?missing
			!}(fn))

			%*(nset result=#func(call))
		`);

		assertStrictEquals($gss.at('result'), undefined, 'Optional parameter !? returns undefined when not provided');
	});

	await t.step('should handle storage operators - protected (%)', async () => {
		await loadMesgjsModuleSource(`
			// Create interface with protected storage
			@c(interface test-protected)(set handlers=[
				setVal={ %(nset value=!0) }
				getVal={ %value !}
			])

			#(nset obj=@c(get test-protected))
			#obj(setVal 42)
			%*(nset result=#obj(getVal))
		`);

		assertStrictEquals($gss.at('result'), 42, 'Protected storage % in interface');
	});

	await t.step('should handle storage operators - optional protected (%?)', async () => {
		await loadMesgjsModuleSource(`
			@c(interface test-protected-opt)(set handlers=[
				getOptional={ %?nonexistent !}
			])

			#(nset obj=@c(get test-protected-opt))
			%*(nset result=#obj(getOptional))
		`);

		assertStrictEquals($gss.at('result'), undefined, 'Optional protected %? returns undefined for missing');
	});

	await t.step('should handle storage operators - exclusive (%%)', async () => {
		await loadMesgjsModuleSource(`
			// Create interface with exclusive storage
			@c(interface test-exclusive)(set handlers=[
				setVal={ %%(nset value=!0) }
				getVal={ %%value !}
			])

			#(nset obj=@c(get test-exclusive))
			#obj(setVal 99)
			%*(nset result=#obj(getVal))
		`);

		assertStrictEquals($gss.at('result'), 99, 'Exclusive storage %% in interface');
	});

	await t.step('should handle storage operators - optional exclusive (%%?)', async () => {
		await loadMesgjsModuleSource(`
			@c(interface test-exclusive-opt)(set handlers=[
				getOptional={ %%?nonexistent !}
			])

			#(nset obj=@c(get test-exclusive-opt))
			%*(nset result=#obj(getOptional))
		`);

		assertStrictEquals($gss.at('result'), undefined, 'Optional exclusive %%? returns undefined for missing');
	});

	await t.step('should handle storage operators - global shared (%*)', async () => {
		await loadMesgjsModuleSource(`
			// Set global shared value
			%*(nset globalKey=global-value)

			// Read global shared value
			%*(nset result=%*globalKey)
		`);

		assertStrictEquals($gss.at('result'), 'global-value', 'Global shared storage %*');
	});

	await t.step('should handle storage operators - optional global shared (%*?)', async () => {
		await loadMesgjsModuleSource(`
			%*(nset
				missing=%*?nonexistent
				present=%*?globalKey
			)
		`);

		assertStrictEquals($gss.at('missing'), undefined, 'Optional global shared %*? returns undefined for missing');
		assert($gss.at('present') !== undefined && $gss.at('present') !== null, 'Optional global shared %*? returns value when present');
	});

	await t.step('should handle storage operators - module private (%/)', async () => {
		await loadMesgjsModuleSource(`
			// Set module private value
			%/(nset moduleKey=module-value)

			// Read module private value
			%*(nset result=%/moduleKey)
		`);

		assertStrictEquals($gss.at('result'), 'module-value', 'Module private storage %/');
	});

	await t.step('should handle storage operators - optional module private (%/?)', async () => {
		await loadMesgjsModuleSource(`
			%/(nset moduleKey=something)
			%*(nset
				missing=%/?nonexistent
				present=%/?moduleKey
			)
		`);

		assertStrictEquals($gss.at('missing'), undefined, 'Optional module private %/? returns undefined for missing');
		assert($gss.at('present') !== undefined && $gss.at('present') !== null, 'Optional module private %/? returns value when present');
	});

	await t.step('should handle dangling storage operators as literals', async () => {
		await loadMesgjsModuleSource(`
			// Dangling storage operators evaluate to their literal text
			%*(nset
				list=[[#] [%] [%*] %/]
			)
		`);

		const list = $gss.at('list');
		assertStrictEquals(list.at([0, 0]), '#', 'Dangling # is literal');
		assertStrictEquals(list.at([1, 0]), '%', 'Dangling % is literal');
		assertStrictEquals(list.at([2, 0]), '%*', 'Dangling %* is literal');
		assertStrictEquals(list.at(3), '%/', 'Dangling %/ is literal');
	});

	await t.step('should handle comments', async () => {
		await loadMesgjsModuleSource(`
			// Single-line comment
			%*(nset single=42)
			// %*(nset single=24)

			/* Multi-line
			   comment */
			%*(nset multi=100)
			/*
			%*(nset multi=200)
			*/
			%*(nset after=@t)
		`);

		assertStrictEquals($gss.at('single'), 42, 'Single-line comments are ignored');
		assertStrictEquals($gss.at('multi'), 100, 'Inline comments are ignored');
		assertStrictEquals($gss.at('after'), true, 'Inline comments are ignored');
	});

	// Note: harness default is { debugBlocks: true, enableJS: true }

	await t.step('should handle @debug blocks', async () => {
		// Test with debugBlocks: false
		await loadMesgjsModuleSource(`
			// Debug blocks are stripped in non-debug mode
			#(nset value=before)
			@debug{
				#(nset value=debug-mode)
			}
			%*(nset debugValue=#value)
		`, 'test-no-debug', { debugBlocks: false });

		assertStrictEquals($gss.at('debugValue'), 'before', '@debug blocks can be stripped with debugBlocks: false');

		// Test with debugBlocks: true (default)
		await loadMesgjsModuleSource(`
			#(nset value2=before)
			@debug{
				#(nset value2=debug-mode)
			}
			%*(nset debugValue2=#value2)
		`);

		assertStrictEquals($gss.at('debugValue2'), 'debug-mode', '@debug blocks execute with debugBlocks: true');
	});

	await t.step('should handle @js embedded JavaScript', async () => {
		await loadMesgjsModuleSource(`
			// Embedded JavaScript
			@js{
				globalThis.$gss.set('jsEmbedded', 'from-javascript');
			@}
		`);

		assertStrictEquals($gss.at('jsEmbedded'), 'from-javascript', '@js embedded JavaScript executes');
	});

	await t.step('should handle whitespace and empty statements', async () => {
		await loadMesgjsModuleSource(`


			#(nset value=whitespace-test)


			%*(nset whitespaceTest=#value)


		`);

		assertStrictEquals($gss.at('whitespaceTest'), 'whitespace-test', 'Whitespace is handled correctly');
	});

	await t.step('should handle complex syntax combinations', async () => {
		await loadMesgjsModuleSource(`
			// Combine multiple syntax elements
			#(nset data=[
				item1=[x=1 y=2]
				item2=[x=3 y=4]
			])

			// Access nested named values
			%*(nset
				x1=#data(at item1)(at x)
				y1=#data(at item1)(at y)
				x2=#data(at item2)(at x)
				y2=#data(at item2)(at y)
			)
		`);

		assertStrictEquals($gss.at('x1'), 1, 'Nested named value access x1');
		assertStrictEquals($gss.at('y1'), 2, 'Nested named value access y1');
		assertStrictEquals($gss.at('x2'), 3, 'Nested named value access x2');
		assertStrictEquals($gss.at('y2'), 4, 'Nested named value access y2');
	});

	await t.step('should handle varOptName (storage without name)', async () => {
		await loadMesgjsModuleSource(`
			// Storage operators can be messaged directly
			#(nset x=10 y=20)
			%*(nset scratchKeys=#(keys) scratch=#(self))
		`);

		const keys = $gss.at('scratchKeys');
		const scratch = $gss.at('scratch');
		assert(keys !== undefined && keys !== null, 'Storage operator # can be messaged directly');
		assert(scratch instanceof NANOS, 'Storage operator # is a NANOS instance');
	});

	await t.step('should handle varReqName (storage with name)', async () => {
		await loadMesgjsModuleSource(`
			// Storage with explicit names
			#(nset myVar=123)
			%*(nset result=#myVar)

			// Storage with quoted names
			#(nset 'quoted-name'=456)
			%*(nset quotedResult=#'quoted-name')

			// Storage with positional values
			#(set 0 to=789)
			%*(nset numericResult=#0)
		`);

		assertStrictEquals($gss.at('result'), 123, 'Storage with word name');
		assertStrictEquals($gss.at('quotedResult'), 456, 'Storage with quoted name');
		assertStrictEquals($gss.at('numericResult'), 789, 'Storage with numeric name');
	});

	await t.step('should handle namedValue with various name types', async () => {
		await loadMesgjsModuleSource(`
			// Named values with different name types
			%*(nset list=[
				word=1
				'quoted'=2
				chain=hello(toUpper)
			])
		`);

		const list = $gss.at('list');
		assertStrictEquals(list.at('word'), 1, 'Named value with word name');
		assertStrictEquals(list.at('quoted'), 2, 'Named value with quoted name');
		assertStrictEquals(list.at('chain'), 'HELLO', 'Named value with chain as name');
	});

	await t.step('should handle storage namespace list-key syntax', async () => {
		await loadMesgjsModuleSource(`
			// Setup nested storage structures
			%*(nset
				nested=[outer=[inner=[value=42]]]
				data=[x=10 y=20]
			)

			// Test basic list-key access with %*[key subkey]
			%*(nset
				result1=%*[nested outer inner value]
				result2=%*[data x]
				result3=%*[data y]
			)
		`);

		assertStrictEquals($gss.at('result1'), 42, 'Nested list-key access %*[nested outer inner value]');
		assertStrictEquals($gss.at('result2'), 10, 'List-key access %*[data x]');
		assertStrictEquals($gss.at('result3'), 20, 'List-key access %*[data y]');
	});

	await t.step('should handle storage namespace list-key syntax with optional ?', async () => {
		await loadMesgjsModuleSource(`
			%*(nset existing=[level1=[level2=value]])

			// Test optional ? after namespace token
			%*(nset
				found=%*?[existing level1 level2]
				missing=%*?[nonexistent key]
				partialMissing=%*?[existing nonexistent subkey]
			)
		`);

		assertStrictEquals($gss.at('found'), 'value', 'Optional list-key with existing path %*?[existing level1 level2]');
		assertStrictEquals($gss.at('missing'), undefined, 'Optional list-key with missing path %*?[nonexistent key]');
		assertStrictEquals($gss.at('partialMissing'), undefined, 'Optional list-key with partial missing path %*?[existing nonexistent subkey]');
	});

	await t.step('should handle storage namespace list-key syntax with else=', async () => {
		await loadMesgjsModuleSource(`
			%*(nset data=[a=[b=100]])

			// Test else= in key list
			%*(nset
				withElse1=%*[data a b else=default1]
				withElse2=%*[data missing else=default2]
				withElse3=%*[data a missing else=default3]
			)
		`);

		assertStrictEquals($gss.at('withElse1'), 100, 'List-key with existing path ignores else=');
		assertStrictEquals($gss.at('withElse2'), 'default2', 'List-key with missing path uses else= default');
		assertStrictEquals($gss.at('withElse3'), 'default3', 'List-key with partial missing path uses else= default');
	});

	await t.step('should handle storage namespace list-key syntax with all storage types', async () => {
		await loadMesgjsModuleSource(`
			// Test with different storage namespaces

			// Global shared storage (%*)
			%*(nset global=[nested=[value=global-value]])
			%*(nset globalResult=%*[global nested value])

			// Module private storage (%/)
			%/(nset module=[nested=[value=module-value]])
			%*(nset moduleResult=%/[module nested value])

			// Scratch storage (#)
			#(nset scratch=[nested=[value=scratch-value]])
			%*(nset scratchResult=#[scratch nested value])

			// Create interface with protected storage (%)
			@c(interface test-list-key)(set handlers=[
				setup={ %(nset obj=[nested=[value=protected-value]]) }
				getVal={ %[obj nested value] !}
			])
			#(nset testObj=@c(get test-list-key))
			#testObj(setup)
			%*(nset protectedResult=#testObj(getVal))

			// Test with exclusive storage (%%)
			@c(interface test-list-key-ex)(set handlers=[
				setup={ %%(nset obj=[nested=[value=exclusive-value]]) }
				getVal={ %%[obj nested value] !}
			])
			#(nset testObjEx=@c(get test-list-key-ex))
			#testObjEx(setup)
			%*(nset exclusiveResult=#testObjEx(getVal))
		`);

		assertStrictEquals($gss.at('globalResult'), 'global-value', 'List-key with global storage %*[...]');
		assertStrictEquals($gss.at('moduleResult'), 'module-value', 'List-key with module storage %/[...]');
		assertStrictEquals($gss.at('scratchResult'), 'scratch-value', 'List-key with scratch storage #[...]');
		assertStrictEquals($gss.at('protectedResult'), 'protected-value', 'List-key with protected storage %[...]');
		assertStrictEquals($gss.at('exclusiveResult'), 'exclusive-value', 'List-key with exclusive storage %%[...]');
	});

	await t.step('should handle storage namespace list-key syntax with parameters (!)', async () => {
		await loadMesgjsModuleSource(`
			// Test with parameter storage (!)
			// Pass a nested list as parameter, then access it via list-key syntax
			#(nset funcWithListKey={
				![0 nested deep value]
			!}(fn))

			%*(nset paramResult=#funcWithListKey(call [nested=[deep=[value=param-value]]]))
		`);

		assertStrictEquals($gss.at('paramResult'), 'param-value', 'List-key with parameter storage ![...]');
	});

	await t.step('should handle storage namespace list-key syntax combining ? and else=', async () => {
		await loadMesgjsModuleSource(`
			%*(nset data=[a=1])

			// Combine optional ? with else= in key list
			%*(nset
				combo1=%*?[data a else=default1]
				combo2=%*?[data missing else=default2]
				combo3=%*?[nonexistent key else=default3]
			)
		`);

		assertStrictEquals($gss.at('combo1'), 1, 'List-key with ?[] and else= when path exists');
		assertStrictEquals($gss.at('combo2'), 'default2', 'List-key with ?[] and else= when path missing');
		assertStrictEquals($gss.at('combo3'), 'default3', 'List-key with ?[] and else= when root missing');
	});

	await t.step('should handle storage namespace list-key syntax with numeric keys', async () => {
		await loadMesgjsModuleSource(`
			%*(nset list=[sub=[10 20 30]])
			%*(nset numericResult=%*[list sub 1])
		`);

		assertStrictEquals($gss.at('numericResult'), 20, 'List-key with numeric index %*[list sub 1]');
	});

	await t.step('should handle list-keys with else (both RIC and static values)', async () => {
		await loadMesgjsModuleSource(`
			%*(nset
				staticResult=#[absent else=static-value]
				ricResult=#[absent else={ RIC-value !}]
			)
		`);

		assertStrictEquals($gss.at('staticResult'), 'static-value', 'List-key with static else value');
		assertStrictEquals($gss.at('ricResult'), 'RIC-value', 'List-key with RIC else value');
	});

	await t.step('should handle dynamic name syntax and error handling', async () => {
		// 1. Valid dynamic name #[name]=#value
		await loadMesgjsModuleSource(`
			#(nset name=dynamicKey value=dynamicValue)
			%*(nset #[name]=#value)
			#(nset dynSet={ %*(nset ![0]=!1) }(fn))
			#dynSet(call dynKey2 dynVal2)
		`);
		assertStrictEquals($gss.at('dynamicKey'), 'dynamicValue', 'Dynamic name #[name]=#value');
		assertStrictEquals($gss.at('dynKey2'), 'dynVal2', 'Dynamic set fn ![0]=!1');

		// 2. Invalid dynamic name #name=#value should generate an error
		const { errors } = parse(lex("%*(nset #name=#value)").tokens);
		assert(errors.length > 0, 'Should have parsing errors');
		assert(errors[0].includes('Use list-key syntax (#[...]=)'), `Expected error message, got: ${errors[0]}`);
	});
});
