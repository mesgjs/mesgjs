import { describe, it } from '@compat/test';
import { assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { setModMeta, fcheck, fready, fwait } from '../../src/runtime/runtime.esm.js';

const mockMeta = {
	testMode: true,
	features: ['feat1', 'feat2'],
};

setModMeta(mockMeta);

describe('Feature System (Test Mode)', () => {
	it('fcheck should return false for a pending feature', () => {
		assertStrictEquals(fcheck('feat1'), false);
	});

	it('fready should mark a feature as fulfilled', () => {
		fready(null, 'feat1'); // mid is not checked in testMode
		assertStrictEquals(fcheck('feat1'), true);
	});

	it('fwait should resolve when a feature is ready', async () => {
		let waited = false;
		const waitPromise = fwait('feat2').then(() => {
			waited = true;
		});

		// Feature is not ready yet
		assertStrictEquals(waited, false);

		fready(null, 'feat2');

		await waitPromise;
		assertStrictEquals(waited, true);
	});

	it('fcheck should return undefined for an unknown feature', () => {
		assertStrictEquals(fcheck('unheard-of-feature'), undefined);
	});
});
