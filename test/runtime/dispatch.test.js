import { describe, it } from '@compat/test';
import { assert, assertEquals, assertNotStrictEquals, assertStrictEquals, assertThrows } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { getInstance, getInterface, typeAccepts } from '../../src/runtime/runtime.esm.js';

describe('Message Dispatching', () => {
	const msgd = (d, op, mp) => d.sm(d, op, mp);
	const envRpt = (d) => new NANOS({ dop: d.dop, mop: d.mop, mp: d.mp });

	it('should create and configure two anonymous interfaces', () => {
		const aif1 = getInterface(':?');
		assert(aif1.ifName, 'Interface name (.ifName) is missing');
		assert(aif1.ifName[0] === ':' && aif1.ifName[1] === '?' && aif1.ifName !== ':?', `Unexpected interface name ${aif1.ifName}`);
		aif1.set({
			handlers: {
				both: (d) => [d, 'both', msgd(d, 'redis')],
				getD: (d) => [d, 'getD'],
				redis: (d) => msgd(d, { op: 'redis', params: d.mp }),
				'@default': (d) => [d, 'default'],
			},
		});
		const inst1 = getInstance(aif1.ifName);
		assertStrictEquals(inst1.msjsType, aif1.ifName);
		const aif2 = getInterface(':?');
		assert(aif2.ifName[0] === ':' && aif2.ifName[1] === '?' && aif2.ifName !== ':?', `Unexpected interface name ${aif2.ifName}`);
		assertNotStrictEquals(aif1.ifName, aif2.ifName, `Both interfaces are named ${aif1.ifName}`);
	});

	it('should handle basic dispatching', () => {
		const aif1 = getInterface(':?');
		aif1.set({
			handlers: {
				getD: (d) => [d, 'getD'],
			},
		});
		const inst1 = getInstance(aif1.ifName);
		const d = $c.sm(inst1, 'getD');
		assertStrictEquals(d[1], 'getD');
		assertStrictEquals(d[0].rr, inst1);
		assertStrictEquals(msgd(d[0], 'rr'), inst1);
		assertStrictEquals(d[0].rt, inst1.msjsType);
		assertStrictEquals(msgd(d[0], 'rt'), inst1.msjsType);
		assertStrictEquals(d[0].ht, inst1.msjsType);
		assertStrictEquals(msgd(d[0], 'ht'), inst1.msjsType);
		assertStrictEquals(d[0].dop, 'getD');
		assertStrictEquals(msgd(d[0], 'dop'), 'getD');
		assertStrictEquals(d[0].mop, 'getD');
		assertStrictEquals(msgd(d[0], 'mop'), 'getD');
	});

	it('should handle redispatch (no super)', () => {
		const aif1 = getInterface(':?');
		aif1.set({
			handlers: {
				mesg: (d) => d.sm(d, 'redis'),
			},
		});
		const inst1 = getInstance(aif1.ifName);
		const r = $c.sm(inst1, 'mesg');
		assertStrictEquals(r, undefined, 'redis without super returns undefined');
	});

	it('should handle redispatch (original op, original params)', () => {
		const superIf = getInterface(':?').set({
			handlers: {
				mesg: (d) => envRpt(d),
			},
		});
		const subIf = getInterface(':?').set({
			chain: [superIf.ifName],
			handlers: {
				mesg: (d) => d.sm(d, 'redis'),
				subOnly: (d) => d.sm(d, 'redis'),
			},
		});

		const inst = getInstance(subIf.ifName);
		const r1 = $c.sm(inst, 'mesg', new NANOS('pos1', { key1: 'val1' }));
		assertStrictEquals(r1.at('mop'), 'mesg', 'message op is correct');
		assertStrictEquals(r1.at('dop'), 'mesg', 'dispatch op is correct');
		assertStrictEquals(r1.at(['mp', 0]), 'pos1', 'message params are correct');
		assertStrictEquals(r1.at(['mp', 'key1']), 'val1', 'message params are correct');

		const r2 = $c.sm(inst, 'subOnly');
		assertStrictEquals(r2, undefined, 'redis with sub-only message returns undefined');
	});

	it('should handle redispatch (original op, new params)', () => {
		const superIf = getInterface(':?').set({
			handlers: {
				mesg: (d) => envRpt(d),
			},
		});
		const subIf = getInterface(':?').set({
			chain: [superIf.ifName],
			handlers: {
				mesg: (d) => d.sm(d, 'redis', { params: new NANOS('pos2', { key2: 'val2' }) }),
			},
		});
		const inst = getInstance(subIf.ifName);
		const r1 = $c.sm(inst, 'mesg', new NANOS('pos1', { key1: 'val1' }));
		assertStrictEquals(r1.at('mop'), 'mesg', 'message op is correct');
		assertStrictEquals(r1.at('dop'), 'mesg', 'dispatch op is correct');
		assertStrictEquals(r1.at(['mp', 0]), 'pos2', 'message params are correct');
		assertStrictEquals(r1.at(['mp', 1]), undefined, 'message params are correct');
		assertStrictEquals(r1.at(['mp', 'key1']), undefined, 'message params are correct');
		assertStrictEquals(r1.at(['mp', 'key2']), 'val2', 'message params are correct');
	});

	it('should handle redispatch (new op, original params)', () => {
		const superIf = getInterface(':?').set({
			handlers: {
				mesg: (d) => envRpt(d),
				mesg2: (d) => envRpt(d),
			},
		});
		const subIf = getInterface(':?').set({
			chain: [superIf.ifName],
			handlers: {
				mesg: (d) => d.sm(d, 'redis', { op: 'mesg2' }),
			},
		});
		const inst = getInstance(subIf.ifName);
		const r1 = $c.sm(inst, 'mesg', new NANOS('pos1', { key1: 'val1' }));
		assertStrictEquals(r1.at('mop'), 'mesg', 'message op is correct');
		assertStrictEquals(r1.at('dop'), 'mesg2', 'dispatch op is correct');
		assertStrictEquals(r1.at(['mp', 0]), 'pos1', 'message params are correct');
		assertStrictEquals(r1.at(['mp', 'key1']), 'val1', 'message params are correct');
	});

	it('should handle redispatch (new op, new params)', () => {
		const superIf = getInterface(':?').set({
			handlers: {
				mesg: (d) => envRpt(d),
				mesg2: (d) => envRpt(d),
			},
		});
		const subIf = getInterface(':?').set({
			chain: [superIf.ifName],
			handlers: {
				mesg: (d) => d.sm(d, 'redis', { op: 'mesg2', params: new NANOS('pos2', { key2: 'val2' }) }),
			},
		});
		const inst = getInstance(subIf.ifName);
		const r1 = $c.sm(inst, 'mesg', new NANOS('pos1', { key1: 'val1' }));
		assertStrictEquals(r1.at('mop'), 'mesg', 'message op is correct');
		assertStrictEquals(r1.at('dop'), 'mesg2', 'dispatch op is correct');
		assertStrictEquals(r1.at(['mp', 0]), 'pos2', 'message params are correct');
		assertStrictEquals(r1.at(['mp', 1]), undefined, 'message params are correct');
		assertStrictEquals(r1.at(['mp', 'key1']), undefined, 'message params are correct');
		assertStrictEquals(r1.at(['mp', 'key2']), 'val2', 'message params are correct');
	});

	it('should fall back to the default handler', () => {
		const aif1 = getInterface(':?');
		aif1.set({
			handlers: {
				'@default': (d) => [d, 'default'],
			},
		});
		const inst1 = getInstance(aif1.ifName);
		const d = $c.sm(inst1, { op: 'noSuchMessage', else: [0, 'else'] });
		assertStrictEquals(d[1], 'default');
		assertStrictEquals(d[0].dop, 'noSuchMessage');
	});

	it('should handle chained dispatches', () => {
		const aif1 = getInterface(':?');
		aif1.set({
			handlers: {
				both: (d) => [d, 'both', d.sm(d, 'redis')],
				getD: (d) => [d, 'getD'],
				'@default': (d) => [d, 'default', d.sm(d, 'redis')],
			},
		});
		const aif2 = getInterface(':?');
		aif2.set({
			chain: [aif1.ifName],
			handlers: {
				both: (d) => [d, 'both', d.sm(d, 'redis')],
				only2: (d) => [d, 'only2', d.sm(d, 'redis')],
				'@default': (d) => [d, 'default', d.sm(d, 'redis')],
			},
		});
		const inst2 = getInstance(aif2.ifName);
		let d = $c.sm(inst2, 'getD');
		assertStrictEquals(d[0].ht, aif1.ifName);
		assertStrictEquals(d[0].rr, inst2);
		assertStrictEquals(d[0].rt, aif2.ifName);
		d = $c.sm(inst2, 'only2');
		assertStrictEquals(d[1], 'only2');
		assertStrictEquals(d[2], undefined);
		d = $c.sm(inst2, 'both');
		assertStrictEquals(d[1], 'both');
		assertStrictEquals(d[2][1], 'both');
		assertStrictEquals(d[2][2], undefined);
		d = $c.sm(inst2, 'noSuchMessage');
		assertStrictEquals(d[1], 'default');
		assertStrictEquals(d[2][1], 'default');
	});

	it('should throw when receiving an anonymous message', () => {
		const aif1 = getInterface(':?');
		aif1.set({
			handlers: {
				getD: (d) => d,
			},
		});
		const inst1 = getInstance(aif1.ifName);
		const d = $c.sm(inst1, 'getD');
		assertThrows(() => $c.sm(d, 'op'), TypeError, '@d(op) on mismatched dispatch');
	});
});

describe('Message Dispatching (@init)', () => {
	it('should not error on missing @init', () => {
		const aif1 = getInterface(':?');
		const inst1 = getInstance(aif1.ifName);
		assertStrictEquals($c.sm(inst1, '@init'), undefined);
		assertEquals(typeAccepts(aif1.ifName, '@init'), [aif1.ifName, 'specific']);
	});

	it('should call @init on getInstance', () => {
		const aif1 = getInterface(':?');
		let called = false;
		aif1.set({
			handlers: {
				'@init': () => {
					called = true;
				},
			},
		});
		getInstance(aif1.ifName);
		assert(called, 'The @init handler was not called on getInstance');
	});

	it('should bypass @init after getInstance', () => {
		const aif1 = getInterface(':?');
		let callCount = 0;
		aif1.set({
			handlers: {
				'@init': () => {
					callCount++;
				},
			},
		});
		const inst1 = getInstance(aif1.ifName);
		assertStrictEquals(callCount, 1);
		$c.sm(inst1, '@init');
		assertStrictEquals(callCount, 1, 'The @init handler was called after getInstance');
	});

	it('should allow direct @init redispatch during getInstance', () => {
		let subInit = false, superInit = false;
		const superIF = getInterface(':?');
		superIF.set({
			handlers: {
				'@init': (d) => {
					superInit = true;
					assertStrictEquals(d.dop, '@init');
					assertStrictEquals(d.mop, '@init');
				}
			}
		});
		const subIF = getInterface(':?');
		subIF.set({
			chain: [superIF.ifName],
			handlers: {
				'@init': (d) => {
					subInit = true;
					assertStrictEquals(d.dop, '@init');
					assertStrictEquals(d.mop, '@init');
					d.sm(d, 'redis');
				}
			}
		});
		getInstance(subIF.ifName);
		assert(subInit, 'Sub-interface @init was not called');
		assert(superInit, 'Super-interface @init was not called via redispatch');
	});

	it('should allow indirect @init redispatch during getInstance', () => {
		let subInit = false, subOther = false, superInit = false;
		const superIF = getInterface(':?');
		superIF.set({
			handlers: {
				'@init': (d) => {
					superInit = true;
					assertStrictEquals(d.dop, '@init');
					assertStrictEquals(d.mop, '@init');
				}
			}
		});
		const subIF = getInterface(':?');
		subIF.set({
			chain: [superIF.ifName],
			handlers: {
				'@init': (d) => {
					subInit = true;
					assertStrictEquals(d.dop, '@init');
					assertStrictEquals(d.mop, '@init');
					d.sm(d, 'redis', { op: 'other' });
				},
				'other': (d) => {
					subOther = true;
					// NB: because the op is changing, we must explicitly request the next interface to prevent infinite looping
					d.sm(d, 'redis', { op: '@init', type: '@next' });
				}
			}
		});
		getInstance(subIF.ifName);
		assert(subInit, 'Sub-interface @init was not called');
		assert(subOther, 'Sub-interface other-op was not called');
		assert(superInit, 'Super-interface @init was not called via indirect redispatch');
	});

	it('should bypass @init from another object during @init', () => {
		let initA = 0, initB = 0, resultB = null;
		const ifA = getInterface(':?'), ifB = getInterface(':?');
		ifA.set({
			handlers: {
				'@init': (d) => {
					++initA;
					if (d.mp.at(0)) {
						getInstance(ifB.ifName, [ d.rr ]);
					}
					return 'A(@init)';
				}
			}
		});
		ifB.set({
			handlers: {
				'@init': (d) => {
					++initB;
					resultB = $c.sm(d.mp.at(0), '@init');
				}
			}
		});
		getInstance(ifA.ifName, [ true ]);
		assertStrictEquals(initA, 1, 'Object A @init was not called exactly once');
		assertStrictEquals(initB, 1, 'Object B @init was not called exactly once');
		assertStrictEquals(resultB, undefined, "B's call to A(@init) was not bypassed");
	});
});
