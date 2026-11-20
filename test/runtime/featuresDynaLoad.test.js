import { describe, it } from '@compat/test';
import { assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
const { setModMeta, fcheck, fwait } = globalThis.$c;

const mod1JS = `globalThis.$c.fready('mod1', 'feat1');`;
const mod2JS = `globalThis.$c.fready('mod2', 'feat2');`;

const mod1URL = `data:application/javascript;base64,${btoa(mod1JS)}`;
const mod2URL = `data:application/javascript;base64,${btoa(mod2JS)}`;

const mockMeta = {
	testMode: true,
	modules: {
		mod1: {
			url: mod1URL,
			integrity: 'DISABLED',
			featpro: 'feat1',
			featreq: 'feat2',
			deferLoad: true,
		},
		mod2: {
			url: mod2URL,
			integrity: 'DISABLED',
			featpro: 'feat2',
			deferLoad: true,
		},
	},
};

setModMeta(mockMeta);

describe('Feature System (Dynamic Loading)', () => {
	it('fcheck should return false for pending features', () => {
		assertStrictEquals(fcheck('feat1'), false);
		assertStrictEquals(fcheck('feat2'), false);
	});

	it('fwait should trigger chained loading of modules', async () => {
		await fwait('feat1');
		assertStrictEquals(fcheck('feat1'), true);
		assertStrictEquals(fcheck('feat2'), true);
	});
});
