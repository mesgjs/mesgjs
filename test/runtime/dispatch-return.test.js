import { describe, it } from '@compat/test';
import { assert, assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { getInstance, getInterface } from '../../src/runtime/runtime.esm.js';

describe('@d(return) operation', () => {
	it('should return undefined when no value provided', () => {
		const aif = getInterface(':?');
		aif.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return');
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result = $c.sm(inst, 'test');
		assertStrictEquals(result, undefined, 'Expected undefined when no return value provided');
	});

	it('should return the provided value', () => {
		const aif = getInterface(':?');
		aif.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return', new NANOS(['test-value']));
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result = $c.sm(inst, 'test');
		assertStrictEquals(result, 'test-value', "Expected 'test-value' to be returned");
	});

	it('should return numeric values', () => {
		const aif = getInterface(':?');
		aif.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return', new NANOS([42]));
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result = $c.sm(inst, 'test');
		assertStrictEquals(result, 42, 'Expected 42 to be returned');
	});

	it('should return boolean values', () => {
		const aif = getInterface(':?');
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
		assertStrictEquals($c.sm(inst, 'testTrue'), true, 'Expected true to be returned');
		assertStrictEquals($c.sm(inst, 'testFalse'), false, 'Expected false to be returned');
	});

	it('should return null', () => {
		const aif = getInterface(':?');
		aif.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return', new NANOS([null]));
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result = $c.sm(inst, 'test');
		assertStrictEquals(result, null, 'Expected null to be returned');
	});

	it('should return object values', () => {
		const testObj = { key: 'value' };
		const aif = getInterface(':?');
		aif.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return', new NANOS([testObj]));
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result = $c.sm(inst, 'test');
		assertStrictEquals(result, testObj, 'Expected object to be returned');
	});

	it('should return Mesgjs objects', () => {
		const aif = getInterface(':?');
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
		const result = $c.sm(inst, 'test');
		assert(result instanceof NANOS, 'Expected NANOS instance to be returned');
		assertStrictEquals(result.at(0), 'a');
		assertStrictEquals(result.at(1), 'b');
		assertStrictEquals(result.at(2), 'c');
	});

	it('should work with zero as return value', () => {
		const aif = getInterface(':?');
		aif.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return', new NANOS([0]));
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result = $c.sm(inst, 'test');
		assertStrictEquals(result, 0, 'Expected 0 to be returned (not confused with undefined)');
	});

	it('should work with empty string as return value', () => {
		const aif = getInterface(':?');
		aif.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return', new NANOS(['']));
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result = $c.sm(inst, 'test');
		assertStrictEquals(result, '', 'Expected empty string to be returned (not confused with undefined)');
	});

	it('should work with list-op message format', () => {
		const aif = getInterface(':?');
		aif.set({
			handlers: {
				test: (d) => {
					d.sm(d, { op: 'return', params: new NANOS(['list-op-value']) });
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result = $c.sm(inst, 'test');
		assertStrictEquals(result, 'list-op-value', 'Expected list-op format to work');
	});

	it('should work when called multiple times in same handler', () => {
		const aif = getInterface(':?');
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
		const result1 = $c.sm(inst, 'test');
		assertStrictEquals(result1, 'first-return');
		assertStrictEquals(callCount, 1, 'Handler should only be called once');

		const result2 = $c.sm(inst, 'test');
		assertStrictEquals(result2, 'first-return');
		assertStrictEquals(callCount, 2, 'Handler should be called again on second message');
	});

	it('should return from current dispatch level only', () => {
		// When a handler calls another handler, return only affects the inner dispatch
		const aif = getInterface(':?');
		aif.set({
			handlers: {
				outer: (d) => {
					const innerResult = d.sm(d.rr, 'inner');
					return 'outer-got-' + innerResult;
				},
				inner: (d) => {
					d.sm(d, 'return', new NANOS(['inner-value']));
					return 'should not reach here';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const result = $c.sm(inst, 'outer');
		assertStrictEquals(result, 'outer-got-inner-value', 'Return should only affect inner dispatch, outer continues');
	});

	it('should work in redispatch to super', () => {
		// When redispatching to super, return affects the redispatch level
		const superIf = getInterface(':?');
		superIf.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return', new NANOS(['from-super']));
					return 'should not reach here in super';
				},
			},
		});
		const subIf = getInterface(':?');
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
		const result = $c.sm(inst, 'test');
		assertStrictEquals(result, 'sub-got-from-super', 'Return in super affects redis result, sub continues');
	});

	it('should work when redispatch is last statement', () => {
		// Common pattern: redispatch and implicitly return its result
		const superIf = getInterface(':?');
		superIf.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return', new NANOS(['from-super']));
					return 'should not reach here in super';
				},
			},
		});
		const subIf = getInterface(':?');
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
		const result = $c.sm(inst, 'test');
		assertStrictEquals(result, 'from-super', 'Redispatch result is returned from sub');
	});

	it('should work with nested redispatches', () => {
		const ifA = getInterface(':?');
		ifA.set({
			handlers: {
				test: (d) => {
					d.sm(d, 'return', new NANOS(['from-A']));
					return 'should not reach here in A';
				},
			},
		});
		const ifB = getInterface(':?');
		ifB.set({
			chain: [ifA.ifName],
			handlers: {
				test: (d) => {
					const resultA = d.sm(d, 'redis');
					return 'B-got-' + resultA;
				},
			},
		});
		const ifC = getInterface(':?');
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
		const result = $c.sm(inst, 'test');
		assertStrictEquals(result, 'C-got-B-got-from-A', 'Nested redispatches with return work correctly');
	});

	it('should work with early return before other code', () => {
		const aif = getInterface(':?');
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
		const result1 = $c.sm(inst, 'test', new NANOS(['early']));
		assertStrictEquals(result1, 'early-exit');
		assertStrictEquals(sideEffect, false, 'Side effect should not occur after early return');

		sideEffect = false;
		const result2 = $c.sm(inst, 'test', new NANOS(['normal']));
		assertStrictEquals(result2, 'normal-return');
		assertStrictEquals(sideEffect, true, 'Side effect should occur in normal flow');
	});
});
