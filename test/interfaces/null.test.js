import { describe, it } from '@compat/test';
import { assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';

describe('@null Interface', () => {
	const { $msjsReceiver, $c } = globalThis;

	it('toString', () => {
		assertStrictEquals($c.sm(null, 'toString'), '@n');
	});

	it('valueOf', () => {
		assertStrictEquals($c.sm(null, 'valueOf'), null);
	});

	it('has', () => {
		assertStrictEquals($c.sm(null, 'has'), undefined);
	});

	it('consistent receivers', () => {
		assertStrictEquals($msjsReceiver(null), $msjsReceiver(null));
	});

	it('equality', () => {
		assertStrictEquals($c.sm(null, 'eq', [null]), true, '@n should be equal to itself');
		assertStrictEquals($c.sm(null, 'ne', [null]), false, '@n should not be unequal to itself');
		assertStrictEquals($c.sm(null, 'eq', true), false, '@n should not be equal to @t');
		assertStrictEquals($c.sm(null, 'ne', true), true, '@n should be unequal to @t');
	});
});
