import { describe, it } from '@compat/test';
import { assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';

describe('@true and @false Interfaces', () => {
	const { $msjsReceiver, $c } = globalThis;
	const { getInstance } = $c;
	const mt = $msjsReceiver(true);
	const mf = $msjsReceiver(false);

	it('consistent instances', () => {
		assertStrictEquals(mt, getInstance('@true'));
		assertStrictEquals(mf, getInstance('@false'));
		assertStrictEquals(mt, $msjsReceiver(true));
		assertStrictEquals(mf, $msjsReceiver(false));
	});

	it('should support (valueOf) message', () => {
		assertStrictEquals($c.sm(mt, 'valueOf'), true);
		assertStrictEquals($c.sm(mf, 'valueOf'), false);
	});

	it('should support (toString) message', () => {
		assertStrictEquals($c.sm(mt, 'toString'), '@t');
		assertStrictEquals($c.sm(mf, 'toString'), '@f');
	});
});
