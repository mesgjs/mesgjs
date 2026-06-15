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

import { assertEquals, assertExists, assert } from 'jsr:@std/assert';
import '../src/runtime/mesgjs.esm.js';
// Being foundational to the language, NANOS is added to globalThis when the runtime is loaded
import { loadMesgjsModuleSource, transpileMesgjs } from "./harness.esm.js";

Deno.test('Mesgjs Syntax Coverage', async (t) => {
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

		assertEquals($gss.at('decimal'), 42, 'Decimal number literal');
		assertEquals($gss.at('negative'), -17, 'Negative number literal');
		assertEquals($gss.at('float'), 3.14, 'Float number literal');
		assertEquals($gss.at('scientific'), 1500, 'Scientific notation literal');
		assertEquals($gss.at('binary'), 10, 'Binary number literal');
		assertEquals($gss.at('octal'), 493, 'Octal number literal');
		assertEquals($gss.at('hex'), 255, 'Hex number literal');
		assertEquals($gss.at('bigint'), 123456789012345678901234567890n, 'BigInt literal');
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

		assertEquals($gss.at('single'), 'single quoted', 'Single-quoted text');
		assertEquals($gss.at('double'), 'double quoted', 'Double-quoted text');
		assertEquals($gss.at('backslash'), 'back\\slash', 'Backslash escape \\b');
		assertEquals($gss.at('newline'), 'line1\nline2', 'Newline escape \\n');
		assertEquals($gss.at('tab'), 'tab\there', 'Tab escape \\t');
		assertEquals($gss.at('hex'), 'hexA', 'Hex escape \\x');
		assertEquals($gss.at('unicode'), 'unicodeA', 'Unicode escape \\u');
		assertEquals($gss.at('singleQuote'), "it's", 'Escaped single quote');
		assertEquals($gss.at('doubleQuote'), 'say "hi"', 'Escaped double quote');
		assertEquals($gss.at('empty'), '', 'Empty string');
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

		assertEquals($gss.at('simple'), 'hello', 'Simple word');
		assertEquals($gss.at('hyphenated'), 'hello-world', 'Hyphenated word');
		assertEquals($gss.at('underscored'), 'hello_world', 'Underscored word');
		assertEquals($gss.at('withNumbers'), 'test123', 'Word with numbers');
		assertEquals($gss.at('withSlash'), 'and/or', 'Word with slash');
		assertEquals($gss.at('withPlus'), 'bread+butter', 'Word with plus');
		assertEquals($gss.at('colonPrefixed'), ':prefixed', 'Colon-prefixed word');
		assertEquals($gss.at('atPrefixed'), '@custom', 'At-prefixed word');
	});

	await t.step('should handle operator-style words (opWords)', async () => {
		await loadMesgjsModuleSource(`
			// Op-words as values in lists
			// Note: In key=value context, some combinations parse as two tokens
			// For example, "opWord1=<" parses as "opWord1" followed by op-word "=<"
			%*(nset opWords=[< <= > >= == !=])
		`);

		const opWords = $gss.at('opWords');
		assertEquals(opWords.at(0), '<', 'Op-word <');
		assertEquals(opWords.at(1), '<=', 'Op-word <=');
		assertEquals(opWords.at(2), '>', 'Op-word >');
		assertEquals(opWords.at(3), '>=', 'Op-word >=');
		assertEquals(opWords.at(4), '==', 'Op-word ==');
		assertEquals(opWords.at(5), '!=', 'Op-word !=');
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

		assertEquals($gss.at('trueVal'), true, '@t is true');
		assertEquals($gss.at('falseVal'), false, '@f is false');
		assertEquals($gss.at('nullVal'), null, '@n is null');
		assertEquals($gss.at('undefinedVal'), undefined, '@u is undefined');
		assertEquals($gss.at('posInf'), Infinity, '@posinf is positive infinity');
		assertEquals($gss.at('negInf'), -Infinity, '@neginf is negative infinity');
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
		assertEquals(empty.size, 0, 'Empty list');

		const simple = $gss.at('simple');
		assertEquals(simple.at(0), 'a', 'Simple list element 0');
		assertEquals(simple.at(1), 'b', 'Simple list element 1');
		assertEquals(simple.at(2), 'c', 'Simple list element 2');

		const mixed = $gss.at('mixed');
		assertEquals(mixed.at(0), 1, 'Mixed list number');
		assertEquals(mixed.at(1), 'two', 'Mixed list word');
		assertEquals(mixed.at(2), 3.0, 'Mixed list float');

		const nested = $gss.at('nested');
		assertEquals(nested.at(0), 'outer', 'Nested list outer element');
		const inner = nested.at(1);
		assertEquals(inner.at(0), 'inner1', 'Nested list inner element 0');
		assertEquals(inner.at(1), 'inner2', 'Nested list inner element 1');
		assertEquals(nested.at(2), 'last', 'Nested list last element');
	});

	await t.step('should handle named values in lists (key=value association)', async () => {
		await loadMesgjsModuleSource(`
			%*(nset
				named=[x=10 y=20 z=30]
				mixed=[first 2 third=3 4]
			)
		`);

		const named = $gss.at('named');
		assertEquals(named.at('x'), 10, 'Named value x');
		assertEquals(named.at('y'), 20, 'Named value y');
		assertEquals(named.at('z'), 30, 'Named value z');

		const mixed = $gss.at('mixed');
		assertEquals(mixed.at(0), 'first', 'Mixed list positional 0');
		assertEquals(mixed.at(1), 2, 'Mixed list positional 1');
		assertEquals(mixed.at('third'), 3, 'Mixed list named value');
		assertEquals(mixed.at(2), 4, 'Mixed list positional 2');
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

		assertEquals($gss.at('nonReturning'), undefined, 'Non-returning block returns undefined');
		assertEquals($gss.at('returning'), 42, 'Returning block returns value');
		assertEquals($gss.at('blockType'), '@code', 'Block literal has @code type');
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

		assertEquals($gss.at('simple'), 8, 'Simple message');
		assertEquals($gss.at('multi'), 'hello world', 'Message with multiple parameters');
		assertEquals($gss.at('named'), 1, 'Message with named parameter');
	});

	await t.step('should handle message chains', async () => {
		await loadMesgjsModuleSource(`
			// Chain multiple messages
			%*(nset chain=10(add 5)(mul 2))
			
			// Chain on storage
			#(nset value=5)
			%*(nset fromStorage=#value(add 10)(mul 2))
		`);

		assertEquals($gss.at('chain'), 30, 'Message chain: (10+5)*2');
		assertEquals($gss.at('fromStorage'), 30, 'Message chain from storage: (5+10)*2');
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

		assertEquals($gss.at('positional'), 'b', 'List-op with positional operation');
		assertEquals($gss.at('opEqOp'), 1, 'List-op with op=op');
		assertEquals($gss.at('withParams'), 1, 'List-op with params=[]');
		assertEquals($gss.at('withElse'), 'fallback', 'List-op with else=...');
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

		assertEquals($gss.at('scratchX'), 100, 'Scratch storage #x');
		assertEquals($gss.at('scratchY'), 200, 'Scratch storage #y');
		assertEquals($gss.at('scratchSum'), 300, 'Scratch storage arithmetic');
	});

	await t.step('should handle storage operators - optional scratch (#?)', async () => {
		await loadMesgjsModuleSource(`
			#(nset exists=42)
			
			%*(nset
				missing=#?nonexistent
				present=#?exists
			)
		`);

		assertEquals($gss.at('missing'), undefined, 'Optional scratch #? returns undefined for missing');
		assertEquals($gss.at('present'), 42, 'Optional scratch #? returns value when present');
	});

	await t.step('should handle storage operators - parameters (!)', async () => {
		await loadMesgjsModuleSource(`
			// Create function that uses parameter storage
			#(nset func={
				!0(add !1)
			!}(fn))
			
			%*(nset result=#func(call 10 20))
		`);

		assertEquals($gss.at('result'), 30, 'Parameter storage ! in function');
	});

	await t.step('should handle storage operators - optional parameters (!?)', async () => {
		await loadMesgjsModuleSource(`
			// Function with optional parameter
			#(nset func={
				!?missing
			!}(fn))
			
			%*(nset result=#func(call))
		`);

		assertEquals($gss.at('result'), undefined, 'Optional parameter !? returns undefined when not provided');
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

		assertEquals($gss.at('result'), 42, 'Protected storage % in interface');
	});

	await t.step('should handle storage operators - optional protected (%?)', async () => {
		await loadMesgjsModuleSource(`
			@c(interface test-protected-opt)(set handlers=[
				getOptional={ %?nonexistent !}
			])
			
			#(nset obj=@c(get test-protected-opt))
			%*(nset result=#obj(getOptional))
		`);

		assertEquals($gss.at('result'), undefined, 'Optional protected %? returns undefined for missing');
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

		assertEquals($gss.at('result'), 99, 'Exclusive storage %% in interface');
	});

	await t.step('should handle storage operators - optional exclusive (%%?)', async () => {
		await loadMesgjsModuleSource(`
			@c(interface test-exclusive-opt)(set handlers=[
				getOptional={ %%?nonexistent !}
			])
			
			#(nset obj=@c(get test-exclusive-opt))
			%*(nset result=#obj(getOptional))
		`);

		assertEquals($gss.at('result'), undefined, 'Optional exclusive %%? returns undefined for missing');
	});

	await t.step('should handle storage operators - global shared (%*)', async () => {
		await loadMesgjsModuleSource(`
			// Set global shared value
			%*(nset globalKey=global-value)
			
			// Read global shared value
			%*(nset result=%*globalKey)
		`);

		assertEquals($gss.at('result'), 'global-value', 'Global shared storage %*');
	});

	await t.step('should handle storage operators - optional global shared (%*?)', async () => {
		await loadMesgjsModuleSource(`
			%*(nset
				missing=%*?nonexistent
				present=%*?globalKey
			)
		`);

		assertEquals($gss.at('missing'), undefined, 'Optional global shared %*? returns undefined for missing');
		assertExists($gss.at('present'), 'Optional global shared %*? returns value when present');
	});

	await t.step('should handle storage operators - module private (%/)', async () => {
		await loadMesgjsModuleSource(`
			// Set module private value
			%/(nset moduleKey=module-value)
			
			// Read module private value
			%*(nset result=%/moduleKey)
		`);

		assertEquals($gss.at('result'), 'module-value', 'Module private storage %/');
	});

	await t.step('should handle storage operators - optional module private (%/?)', async () => {
		await loadMesgjsModuleSource(`
			%/(nset moduleKey=something)
			%*(nset
				missing=%/?nonexistent
				present=%/?moduleKey
			)
		`);

		assertEquals($gss.at('missing'), undefined, 'Optional module private %/? returns undefined for missing');
		assertExists($gss.at('present'), 'Optional module private %/? returns value when present');
	});

	await t.step('should handle dangling storage operators as literals', async () => {
		await loadMesgjsModuleSource(`
			// Dangling storage operators evaluate to their literal text
			%*(nset
				list=[[#] [%] [%*] %/]
			)
		`);

		const list = $gss.at('list');
		assertEquals(list.at([0, 0]), '#', 'Dangling # is literal');
		assertEquals(list.at([1, 0]), '%', 'Dangling % is literal');
		assertEquals(list.at([2, 0]), '%*', 'Dangling %* is literal');
		assertEquals(list.at(3), '%/', 'Dangling %/ is literal');
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

		assertEquals($gss.at('single'), 42, 'Single-line comments are ignored');
		assertEquals($gss.at('multi'), 100, 'Inline comments are ignored');
		assertEquals($gss.at('after'), true, 'Inline comments are ignored');
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
		
		assertEquals($gss.at('debugValue'), 'before', '@debug blocks can be stripped with debugBlocks: false');
		
		// Test with debugBlocks: true (default)
		await loadMesgjsModuleSource(`
			#(nset value2=before)
			@debug{
				#(nset value2=debug-mode)
			}
			%*(nset debugValue2=#value2)
		`);

		assertEquals($gss.at('debugValue2'), 'debug-mode', '@debug blocks execute with debugBlocks: true');
	});

	await t.step('should handle @js embedded JavaScript', async () => {
		await loadMesgjsModuleSource(`
			// Embedded JavaScript
			@js{
				globalThis.$gss.set('jsEmbedded', 'from-javascript');
			@}
		`);

		assertEquals($gss.at('jsEmbedded'), 'from-javascript', '@js embedded JavaScript executes');
	});

	await t.step('should handle whitespace and empty statements', async () => {
		await loadMesgjsModuleSource(`
			
			
			#(nset value=whitespace-test)
			
			
			%*(nset whitespaceTest=#value)
			
			
		`);

		assertEquals($gss.at('whitespaceTest'), 'whitespace-test', 'Whitespace is handled correctly');
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

		assertEquals($gss.at('x1'), 1, 'Nested named value access x1');
		assertEquals($gss.at('y1'), 2, 'Nested named value access y1');
		assertEquals($gss.at('x2'), 3, 'Nested named value access x2');
		assertEquals($gss.at('y2'), 4, 'Nested named value access y2');
	});

	await t.step('should handle varOptName (storage without name)', async () => {
		await loadMesgjsModuleSource(`
			// Storage operators can be messaged directly
			#(nset x=10 y=20)
			%*(nset scratchKeys=#(keys) scratch=#(self))
		`);

		const keys = $gss.at('scratchKeys');
		const scratch = $gss.at('scratch');
		assertExists(keys, 'Storage operator # can be messaged directly');
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

		assertEquals($gss.at('result'), 123, 'Storage with word name');
		assertEquals($gss.at('quotedResult'), 456, 'Storage with quoted name');
		assertEquals($gss.at('numericResult'), 789, 'Storage with numeric name');
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
		assertEquals(list.at('word'), 1, 'Named value with word name');
		assertEquals(list.at('quoted'), 2, 'Named value with quoted name');
		assertEquals(list.at('chain'), 'HELLO', 'Named value with chain as name');
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

		assertEquals($gss.at('result1'), 42, 'Nested list-key access %*[nested outer inner value]');
		assertEquals($gss.at('result2'), 10, 'List-key access %*[data x]');
		assertEquals($gss.at('result3'), 20, 'List-key access %*[data y]');
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

		assertEquals($gss.at('found'), 'value', 'Optional list-key with existing path %*?[existing level1 level2]');
		assertEquals($gss.at('missing'), undefined, 'Optional list-key with missing path %*?[nonexistent key]');
		assertEquals($gss.at('partialMissing'), undefined, 'Optional list-key with partial missing path %*?[existing nonexistent subkey]');
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

		assertEquals($gss.at('withElse1'), 100, 'List-key with existing path ignores else=');
		assertEquals($gss.at('withElse2'), 'default2', 'List-key with missing path uses else= default');
		assertEquals($gss.at('withElse3'), 'default3', 'List-key with partial missing path uses else= default');
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

		assertEquals($gss.at('globalResult'), 'global-value', 'List-key with global storage %*[...]');
		assertEquals($gss.at('moduleResult'), 'module-value', 'List-key with module storage %/[...]');
		assertEquals($gss.at('scratchResult'), 'scratch-value', 'List-key with scratch storage #[...]');
		assertEquals($gss.at('protectedResult'), 'protected-value', 'List-key with protected storage %[...]');
		assertEquals($gss.at('exclusiveResult'), 'exclusive-value', 'List-key with exclusive storage %%[...]');
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

		assertEquals($gss.at('paramResult'), 'param-value', 'List-key with parameter storage ![...]');
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

		assertEquals($gss.at('combo1'), 1, 'List-key with ?[] and else= when path exists');
		assertEquals($gss.at('combo2'), 'default2', 'List-key with ?[] and else= when path missing');
		assertEquals($gss.at('combo3'), 'default3', 'List-key with ?[] and else= when root missing');
	});

	await t.step('should handle storage namespace list-key syntax with numeric keys', async () => {
		await loadMesgjsModuleSource(`
			%*(nset list=[sub=[10 20 30]])
			%*(nset numericResult=%*[list sub 1])
		`);

		assertEquals($gss.at('numericResult'), 20, 'List-key with numeric index %*[list sub 1]');
	});
});
