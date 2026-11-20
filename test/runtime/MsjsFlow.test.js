import { describe, it } from '@compat/test';
import { assert, assertStrictEquals } from '@std/assert';
import { MsjsFlow, MsjsFlowError } from '../../src/runtime/runtime.esm.js';

describe('MsjsFlow class', () => {
	it('should be instantiable with a message', () => {
		const flow = new MsjsFlow('test-message');
		assert(flow instanceof MsjsFlow);
		assertStrictEquals(flow.message, 'test-message');
		assertStrictEquals(flow.name, 'MsjsFlow');
	});
});

describe('MsjsFlowError class', () => {
	it('should be instantiable', () => {
		const flowError = new MsjsFlowError('test-error');
		assert(flowError instanceof RangeError);
		assertStrictEquals(flowError.message, 'test-error');
		assertStrictEquals(flowError.name, 'MsjsFlowError');
	});
});
