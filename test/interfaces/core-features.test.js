import { describe, it } from '@compat/test';
import { assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { setModMeta } from '../../src/runtime/runtime.esm.js';

const mockMeta = {
	testMode: true,
	features: ['feat1', 'feat2'],
};

setModMeta(mockMeta);

describe('Feature System (@core Interface)', () => {
	const { $c } = globalThis;

	it('fcheck should return false for a pending feature', () => {
		assertStrictEquals($c.sm($c, 'fcheck', 'feat1'), false);
	});

	it('fready should mark a feature as fulfilled', () => {
		$c.sm($c, 'fready', 'feat1'); // mid is not checked in testMode
		assertStrictEquals($c.sm($c, 'fcheck', 'feat1'), true);
	});

	it('fwait should resolve when a feature is ready', async () => {
		let waited = false;
		const waitPromise = $c.sm($c, 'fwait', 'feat2').then(() => {
			waited = true;
		});

		// Feature is not ready yet
		assertStrictEquals(waited, false);

		$c.sm($c, 'fready', 'feat2');

		await waitPromise;
		assertStrictEquals(waited, true);
	});

	it('fcheck should return undefined for an unknown feature', () => {
		assertStrictEquals($c.sm($c, 'fcheck', 'unheard-of-feature'), undefined);
	});
});
