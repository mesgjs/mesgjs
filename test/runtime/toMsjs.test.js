import { describe, it } from '@compat/test';
import { assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { NANOS } from '@nanos';

describe('$toMsjs Type Conversion', () => {
	//const $toMsjs = globalThis.$toMsjs;
	const $toMsjs = globalThis.$msjsReceiver;

	it('should convert JS primitives to Mesgjs types', () => {
		assertStrictEquals($toMsjs(true).msjsType, '@true');
		assertStrictEquals($toMsjs(false).msjsType, '@false');
		assertStrictEquals($toMsjs(null).msjsType, '@null');
		assertStrictEquals($toMsjs(undefined).msjsType, '@undefined');
		assertStrictEquals($toMsjs(10n).msjsType, '@number');
		assertStrictEquals($toMsjs(10).msjsType, '@number');
		assertStrictEquals($toMsjs('text').msjsType, '@string');
	});

	it('should convert JS objects to Mesgjs types', () => {
		const n1 = new NANOS();
		const n1o = $toMsjs(n1);
		assertStrictEquals(n1o.msjsType, '@list');
		assertStrictEquals($toMsjs(n1), n1o);
		const a1 = [];
		const a1o = $toMsjs(a1);
		assertStrictEquals(a1o.msjsType, '@jsArray');
		assertStrictEquals($toMsjs(a1), a1o);
	});
});
