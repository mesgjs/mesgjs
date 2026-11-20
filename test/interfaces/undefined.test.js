import { describe, it } from '@compat/test';
import { assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';

describe('@undefined Interface', () => {
	const { $msjsReceiver, $c } = globalThis;

	it('Consistent receiver', () => {
		assertStrictEquals($msjsReceiver(undefined), $msjsReceiver(undefined));
	});

	it('Singleton properties', () => {
		assertStrictEquals($msjsReceiver(undefined).msjsType, '@undefined');
		assertStrictEquals($c.sm(undefined, 'valueOf'), undefined);
		assertStrictEquals($c.sm(undefined, '@jsv'), undefined);
	});

	it('Operations', () => {
		assertStrictEquals($c.sm(undefined, 'toString'), '@u');
		assertStrictEquals($c.sm(undefined, 'has'), undefined);
	});
});
