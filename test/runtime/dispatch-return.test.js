import {
	assertEquals,
	assert,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { getInstance, getInterface } from "../../src/runtime/runtime.esm.js";

Deno.test("@d(return) operation", async (t) => {
	await t.step("should return undefined when no value provided", () => {
		const aif = getInterface(":?");
		aif.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return');
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result = inst('test');
		assertEquals(result, undefined, "Expected undefined when no return value provided");
	});

	await t.step("should return the provided value", () => {
		const aif = getInterface(":?");
		aif.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return', new NANOS(['test-value']));
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result = inst('test');
		assertEquals(result, 'test-value', "Expected 'test-value' to be returned");
	});

	await t.step("should return numeric values", () => {
		const aif = getInterface(":?");
		aif.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return', new NANOS([42]));
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result = inst('test');
		assertEquals(result, 42, "Expected 42 to be returned");
	});

	await t.step("should return boolean values", () => {
		const aif = getInterface(":?");
		aif.set({
			handlers: {
				testTrue: (d) => {
					d.sm(d, 'return', new NANOS([true]));
					return 'should not reach here';
				},
				testFalse: (d) => {
					d.sm(d, 'return', new NANOS([false]));
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		assertEquals(inst('testTrue'), true, "Expected true to be returned");
		assertEquals(inst('testFalse'), false, "Expected false to be returned");
	});

	await t.step("should return null", () => {
		const aif = getInterface(":?");
		aif.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return', new NANOS([null]));
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result = inst('test');
		assertEquals(result, null, "Expected null to be returned");
	});

	await t.step("should return object values", () => {
		const testObj = { key: 'value' };
		const aif = getInterface(":?");
		aif.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return', new NANOS([testObj]));
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result = inst('test');
		assertEquals(result, testObj, "Expected object to be returned");
	});

	await t.step("should return Mesgjs objects", () => {
		const aif = getInterface(":?");
		aif.set({
			handlers: {
				test: (d) => {
					const list = new NANOS(['a', 'b', 'c']);
					d.sm(d, 'return', new NANOS([list]));
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result = inst('test');
		assert(result instanceof NANOS, "Expected NANOS instance to be returned");
		assertEquals(result.at(0), 'a');
		assertEquals(result.at(1), 'b');
		assertEquals(result.at(2), 'c');
	});

	await t.step("should work with zero as return value", () => {
		const aif = getInterface(":?");
		aif.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return', new NANOS([0]));
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result = inst('test');
		assertEquals(result, 0, "Expected 0 to be returned (not confused with undefined)");
	});

	await t.step("should work with empty string as return value", () => {
		const aif = getInterface(":?");
		aif.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return', new NANOS(['']));
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result = inst('test');
		assertEquals(result, '', "Expected empty string to be returned (not confused with undefined)");
	});

	await t.step("should work with list-op message format", () => {
		const aif = getInterface(":?");
		aif.set({
			handlers: {
				test: (d) => {
					d.sm(d, { op: 'return', params: new NANOS(['list-op-value']) });
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result = inst('test');
		assertEquals(result, 'list-op-value', "Expected list-op format to work");
	});

	await t.step("should work when called multiple times in same handler", () => {
		const aif = getInterface(":?");
		let callCount = 0;
		aif.set({
			handlers: {
				test: (d) => {
					callCount++;
					d.sm(d, 'return', new NANOS(['first-return']));
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result1 = inst('test');
		assertEquals(result1, 'first-return');
		assertEquals(callCount, 1, "Handler should only be called once");
		
		const result2 = inst('test');
		assertEquals(result2, 'first-return');
		assertEquals(callCount, 2, "Handler should be called again on second message");
	});

	await t.step("should return from current dispatch level only", () => {
		// When a handler calls another handler, return only affects the inner dispatch
		const aif = getInterface(":?");
		aif.set({
			handlers: {
				outer: (d) => {
					const innerResult = d.rr('inner');
					return 'outer-got-' + innerResult;
				},
				inner: (d) => {
					d.sm(d, 'return', new NANOS(['inner-value']));
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result = inst('outer');
		assertEquals(result, 'outer-got-inner-value', "Return should only affect inner dispatch, outer continues");
	});

	await t.step("should work in redispatch to super", () => {
		// When redispatching to super, return affects the redispatch level
		const superIf = getInterface(":?");
		superIf.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return', new NANOS(['from-super']));
					return 'should not reach here in super';
				},
			},
		});
		const subIf = getInterface(":?");
		subIf.set({
			chain: [superIf.ifName],
			handlers: {
				test: (d) => {
					const superResult = d.sm(d, 'redis');
					return 'sub-got-' + superResult;
				},
			},
		});
		const inst = getInstance(subIf.ifName);
		const result = inst('test');
		assertEquals(result, 'sub-got-from-super', "Return in super affects redis result, sub continues");
	});

	await t.step("should work when redispatch is last statement", () => {
		// Common pattern: redispatch and implicitly return its result
		const superIf = getInterface(":?");
		superIf.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return', new NANOS(['from-super']));
					return 'should not reach here in super';
				},
			},
		});
		const subIf = getInterface(":?");
		subIf.set({
			chain: [superIf.ifName],
			handlers: {
				test: (d) => {
					// Do some work, then redispatch
					return d.sm(d, 'redis');
				},
			},
		});
		const inst = getInstance(subIf.ifName);
		const result = inst('test');
		assertEquals(result, 'from-super', "Redispatch result is returned from sub");
	});

	await t.step("should work with nested redispatches", () => {
		const ifA = getInterface(":?");
		ifA.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return', new NANOS(['from-A']));
					return 'should not reach here in A';
				},
			},
		});
		const ifB = getInterface(":?");
		ifB.set({
			chain: [ifA.ifName],
			handlers: {
				test: (d) => {
					const resultA = d.sm(d, 'redis');
					return 'B-got-' + resultA;
				},
			},
		});
		const ifC = getInterface(":?");
		ifC.set({
			chain: [ifB.ifName],
			handlers: {
				test: (d) => {
					const resultB = d.sm(d, 'redis');
					return 'C-got-' + resultB;
				},
			},
		});
		const inst = getInstance(ifC.ifName);
		const result = inst('test');
		assertEquals(result, 'C-got-B-got-from-A', "Nested redispatches with return work correctly");
	});

	await t.step("should work with early return before other code", () => {
		const aif = getInterface(":?");
		let sideEffect = false;
		aif.set({
			handlers: {
				test: (d) => {
					if (d.mp.at(0) === 'early') {
						d.sm(d, 'return', new NANOS(['early-exit']));
					}
					sideEffect = true;
					return 'normal-return';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		
		sideEffect = false;
		const result1 = inst('test', new NANOS(['early']));
		assertEquals(result1, 'early-exit');
		assertEquals(sideEffect, false, "Side effect should not occur after early return");
		
		sideEffect = false;
		const result2 = inst('test', new NANOS(['normal']));
		assertEquals(result2, 'normal-return');
		assertEquals(sideEffect, true, "Side effect should occur in normal flow");
	});
});
