/**
 * Test exclusive storage (%% and %%?) implementation
 * Tests that exclusive storage is private per-interface in chained interfaces
 */

import { assertEquals, assertExists } from 'jsr:@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { loadMesgjsModuleSource } from "../harness.esm.js";
const { getInterface, getInstance } = globalThis.$c;

Deno.test('Exclusive storage - basic access', async () => {
	// Create a simple interface with exclusive storage
	const iface = getInterface('test-exclusive-basic');
	iface.set({
		handlers: {
			setVal: (d) => {
				d.x.set('value', d.mp.at(0));
			},
			getVal: (d) => {
				return d.x.at('value');
			},
		},
	});

	const obj = getInstance('test-exclusive-basic');
	obj('setVal', [42]);
	const result = obj('getVal');
	assertEquals(result, 42, 'Should retrieve value from exclusive storage');
});

Deno.test('Exclusive storage - optional access with %%?', async () => {
	// Test that %%? returns undefined for missing keys
	const iface = getInterface('test-exclusive-optional');
	iface.set({
		handlers: {
			getOptional: (d) => {
				return d.x.at('nonexistent');
			},
		},
	});

	const obj = getInstance('test-exclusive-optional');
	const result = obj('getOptional');
	assertEquals(result, undefined, 'Should return undefined for missing key');
});

Deno.test('Exclusive storage - isolation between interfaces', async () => {
	// Create base interface
	const baseIface = getInterface('test-exclusive-base');
	baseIface.set({
		handlers: {
			setBase: (d) => {
				d.x.set('shared-key', 'base-value');
			},
			getBase: (d) => {
				return d.x.at('shared-key');
			},
		},
	});

	// Create derived interface that chains base
	const derivedIface = getInterface('test-exclusive-derived');
	derivedIface.set({
		chain: ['test-exclusive-base'],
		handlers: {
			setDerived: (d) => {
				d.x.set('shared-key', 'derived-value');
			},
			getDerived: (d) => {
				return d.x.at('shared-key');
			},
		},
	});

	const obj = getInstance('test-exclusive-derived');
	
	// Set value in base handler
	obj('setBase');
	const baseValue = obj('getBase');
	assertEquals(baseValue, 'base-value', 'Base handler should see base value');

	// Set value in derived handler
	obj('setDerived');
	const derivedValue = obj('getDerived');
	assertEquals(derivedValue, 'derived-value', 'Derived handler should see derived value');

	// Verify base handler still sees its own value
	const baseValueAfter = obj('getBase');
	assertEquals(baseValueAfter, 'base-value', 'Base handler should still see its own value');
});

Deno.test('Exclusive storage - vs protected storage', async () => {
	// Test that % (protected) is shared while %% (exclusive) is not
	const baseIface = getInterface('test-storage-compare-base');
	baseIface.set({
		handlers: {
			setProtected: (d) => {
				d.p.set('key', 'protected-base');
			},
			setExclusive: (d) => {
				d.x.set('key', 'exclusive-base');
			},
			getProtected: (d) => {
				return d.p.at('key');
			},
			getExclusive: (d) => {
				return d.x.at('key');
			},
		},
	});

	const derivedIface = getInterface('test-storage-compare-derived');
	derivedIface.set({
		chain: ['test-storage-compare-base'],
		handlers: {
			setProtectedDerived: (d) => {
				d.p.set('key', 'protected-derived');
			},
			setExclusiveDerived: (d) => {
				d.x.set('key', 'exclusive-derived');
			},
			getProtectedDerived: (d) => {
				return d.p.at('key');
			},
			getExclusiveDerived: (d) => {
				return d.x.at('key');
			},
		},
	});

	const obj = getInstance('test-storage-compare-derived');

	// Set protected storage from base
	obj('setProtected');
	assertEquals(obj('getProtected'), 'protected-base', 'Base sees protected value');
	assertEquals(obj('getProtectedDerived'), 'protected-base', 'Derived sees same protected value');

	// Override protected storage from derived
	obj('setProtectedDerived');
	assertEquals(obj('getProtected'), 'protected-derived', 'Base sees updated protected value');
	assertEquals(obj('getProtectedDerived'), 'protected-derived', 'Derived sees updated protected value');

	// Set exclusive storage from both
	obj('setExclusive');
	obj('setExclusiveDerived');
	assertEquals(obj('getExclusive'), 'exclusive-base', 'Base sees its own exclusive value');
	assertEquals(obj('getExclusiveDerived'), 'exclusive-derived', 'Derived sees its own exclusive value');
});

Deno.test('Exclusive storage - multiple instances', async () => {
	// Verify that exclusive storage is per-instance
	const iface = getInterface('test-exclusive-instances');
	iface.set({
		handlers: {
			setVal: (d) => {
				d.x.set('value', d.mp.at(0));
			},
			getVal: (d) => {
				return d.x.at('value');
			},
		},
	});

	const obj1 = getInstance('test-exclusive-instances');
	const obj2 = getInstance('test-exclusive-instances');

	obj1('setVal', [100]);
	obj2('setVal', [200]);

	assertEquals(obj1('getVal'), 100, 'First instance should have its own value');
	assertEquals(obj2('getVal'), 200, 'Second instance should have its own value');
});

Deno.test('Exclusive storage - WeakMap cleanup', async () => {
	// Test that exclusive storage uses WeakMap (objects can be GC'd)
	const iface = getInterface('test-exclusive-weakmap');
	iface.set({
		handlers: {
			setVal: (d) => {
				d.x.set('value', d.mp.at(0));
			},
		},
	});

	// Create and discard an instance
	let obj = getInstance('test-exclusive-weakmap');
	obj('setVal', [42]);
	
	// Clear reference
	obj = null;
	
	// Force GC if available (Deno specific)
	if (globalThis.gc) {
		globalThis.gc();
	}
	
	// Create new instance - should not have old data
	const newObj = getInstance('test-exclusive-weakmap');
	// This test just verifies no errors occur; actual GC verification is difficult
	assertExists(newObj, 'New instance should be created successfully');
});

// Mesgjs-based tests
Deno.test('Exclusive storage - Mesgjs syntax tests', async (t) => {
	const $gss = globalThis.$gss;

	await t.step('should handle %% (exclusive) storage in interface handlers', async () => {
		await loadMesgjsModuleSource(`
			// Create base interface with exclusive storage
			@c(interface test-exclusive-mesgjs-base)(set handlers=[
				setBase={ %%(nset value=base-value) }
				getBase={ %%value !}
			])
			
			// Create derived interface that chains base
			@c(interface test-exclusive-mesgjs-derived)(set
				chain=[test-exclusive-mesgjs-base]
				handlers=[
					setDerived={ %%(nset value=derived-value) }
					getDerived={ %%value !}
				]
			)
			
			// Create instance and test
			#(nset obj=@c(get test-exclusive-mesgjs-derived))
			#obj(setBase)
			#obj(setDerived)
			
			// Store results in global storage for verification
			@gss(nset
				baseValue=#obj(getBase)
				derivedValue=#obj(getDerived)
			)
		`);
		
		assertEquals($gss.at('baseValue'), 'base-value', 'Base handler should see its own exclusive value');
		assertEquals($gss.at('derivedValue'), 'derived-value', 'Derived handler should see its own exclusive value');
	});

	await t.step('should handle %%? (optional exclusive) storage', async () => {
		await loadMesgjsModuleSource(`
			@c(interface test-exclusive-optional-mesgjs)(set handlers=[
				getOptional={ %%?nonexistent !}
				setAndGet={
					%%(nset value=42)
					%%?value
				!}
			])
			
			#(nset obj=@c(get test-exclusive-optional-mesgjs))
			@gss(nset
				optionalMissing=#obj(getOptional)
				optionalPresent=#obj(setAndGet)
			)
		`);
		
		assertEquals($gss.at('optionalMissing'), undefined, '%%? should return undefined for missing key');
		assertEquals($gss.at('optionalPresent'), 42, '%%? should return value when present');
	});

	await t.step('should compare % (protected) vs %% (exclusive) storage', async () => {
		await loadMesgjsModuleSource(`
			@c(interface test-storage-compare-mesgjs-base)(set handlers=[
				setProtected={ %(nset key=protected-base) }
				setExclusive={ %%(nset key=exclusive-base) }
				getProtected={ %key !}
				getExclusive={ %%key !}
			])
			
			@c(interface test-storage-compare-mesgjs-derived)(set
				chain=[test-storage-compare-mesgjs-base]
				handlers=[
					setProtectedDerived={ %(nset key=protected-derived) }
					setExclusiveDerived={ %%(nset key=exclusive-derived) }
					getProtectedDerived={ %key !}
					getExclusiveDerived={ %%key !}
				]
			)
			
			#(nset obj=@c(get test-storage-compare-mesgjs-derived))
			
			// Set protected storage from base
			#obj(setProtected)
			@gss(nset
				protectedFromBase=#obj(getProtected)
				protectedFromDerived=#obj(getProtectedDerived)
			)
			
			// Override protected storage from derived
			#obj(setProtectedDerived)
			@gss(nset
				protectedFromBaseAfter=#obj(getProtected)
				protectedFromDerivedAfter=#obj(getProtectedDerived)
			)
			
			// Set exclusive storage from both
			#obj(setExclusive)
			#obj(setExclusiveDerived)
			@gss(nset
				exclusiveFromBase=#obj(getExclusive)
				exclusiveFromDerived=#obj(getExclusiveDerived)
			)
		`);
		
		// Protected storage is shared
		assertEquals($gss.at('protectedFromBase'), 'protected-base', 'Base sees protected value');
		assertEquals($gss.at('protectedFromDerived'), 'protected-base', 'Derived sees same protected value');
		assertEquals($gss.at('protectedFromBaseAfter'), 'protected-derived', 'Base sees updated protected value');
		assertEquals($gss.at('protectedFromDerivedAfter'), 'protected-derived', 'Derived sees updated protected value');
		
		// Exclusive storage is isolated
		assertEquals($gss.at('exclusiveFromBase'), 'exclusive-base', 'Base sees its own exclusive value');
		assertEquals($gss.at('exclusiveFromDerived'), 'exclusive-derived', 'Derived sees its own exclusive value');
	});

	await t.step('should handle %% with shortcut syntax', async () => {
		await loadMesgjsModuleSource(`
			@c(interface test-exclusive-shortcuts)(set handlers=[
				testShortcuts={
					// Set using full message
					%%(nset x=10 y=20)
					
					// Read using shortcuts
					#(nset sum=%%x(add %%y))
					
					// Optional read
					#(nset missing=%%?z)
					
					@gss(nset
						xValue=%%x
						yValue=%%y
						sumValue=#sum
						missingValue=#missing
					)
				}
			])
			
			#(nset obj=@c(get test-exclusive-shortcuts))
			#obj(testShortcuts)
		`);
		
		assertEquals($gss.at('xValue'), 10, '%%x shortcut should work');
		assertEquals($gss.at('yValue'), 20, '%%y shortcut should work');
		assertEquals($gss.at('sumValue'), 30, 'Arithmetic with %% shortcuts should work');
		assertEquals($gss.at('missingValue'), undefined, '%%? shortcut should return undefined for missing key');
	});

	await t.step('should handle %% in function-mode code blocks', async () => {
		await loadMesgjsModuleSource(`
			@c(interface test-exclusive-function)(set handlers=[
				makeCounter={
					// Create a function with exclusive storage
					#(nset counter={
						%%(nset count=%%(at count else=0)(add 1))
						%%count
					!}(fn))
					
					// Call it multiple times
					@gss(nset
						count1=#counter(call)
						count2=#counter(call)
						count3=#counter(call)
					)
				}
			])
			
			#(nset obj=@c(get test-exclusive-function))
			#obj(makeCounter)
		`);
		
		assertEquals($gss.at('count1'), 1, 'First call should return 1');
		assertEquals($gss.at('count2'), 2, 'Second call should return 2');
		assertEquals($gss.at('count3'), 3, 'Third call should return 3');
	});
});
