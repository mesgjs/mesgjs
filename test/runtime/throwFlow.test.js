import { describe, it } from '@compat/test';
import { assertStrictEquals, assertThrows } from '@std/assert';
import { MsjsFlow, MsjsFlowError, throwFlow } from '../../src/runtime/runtime.esm.js';
import { NANOS } from '@nanos';

describe('throwFlow', () => {
	it('should throw MsjsFlow in an active context', () => {
		const d = {
			rr: { active: true },
			mp: new NANOS(),
		};
		assertThrows(() => throwFlow(d, 'return', '@test'), MsjsFlow);
		assertStrictEquals(d.rr.capture, true);
	});

	it('should capture the result in the dispatch object', () => {
		const d = {
			rr: { active: true },
			mp: new NANOS({ result: 'the-result' }),
		};
		assertThrows(() => throwFlow(d, 'return', '@test'), MsjsFlow);
		assertStrictEquals(d.rr.hasFlowRes, true);
		assertStrictEquals(d.rr.flowRes, 'the-result');
	});

	it('should throw MsjsFlowError in an inactive context', () => {
		const d = {
			rr: { active: false },
			mp: new NANOS(),
		};
		assertThrows(
			() => throwFlow(d, 'return', '@test'),
			MsjsFlowError
		);
	});
});
