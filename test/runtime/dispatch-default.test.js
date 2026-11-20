import { describe, it } from '@compat/test';
import { assertStrictEquals, assertThrows } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { getInstance, getInterface } from '../../src/runtime/runtime.esm.js';
import { codeBlock } from '../harness.esm.js';

describe('Dispatch Default and Defacc Requirements', () => {
	it('No @default handler - Unhandled message throws error', () => {
		const aif = getInterface(':?');
		aif.set({
			handlers: {
				specific: () => 'specific-val',
			},
		});
		const inst = getInstance(aif.ifName);
		assertThrows(
			() => $c.sm(inst, 'unhandled'),
			TypeError,
			'No Mesgjs handler found'
		);
	});

	it('No @default handler - Unhandled with list-op else returns static else value', () => {
		const aif = getInterface(':?');
		aif.set({
			handlers: {
				specific: () => 'specific-val',
			},
		});
		const inst = getInstance(aif.ifName);
		const res = $c.sm(inst, { op: 'unhandled', else: 'static-else' });
		assertStrictEquals(res, 'static-else');
	});

	it('No @default handler - Unhandled with list-op else returns RIC else value', () => {
		const aif = getInterface(':?');
		aif.set({
			handlers: {
				specific: () => 'specific-val',
			},
		});
		const inst = getInstance(aif.ifName);
		let elseRan = false;
		const ric = codeBlock(() => {
			elseRan = true;
			return 'ric-else';
		});
		const res = $c.sm(inst, { op: 'unhandled', else: ric });
		assertStrictEquals(res, 'ric-else');
		assertStrictEquals(elseRan, true);
	});

	it('@default without @defacc - specific handlers handle specific messages', () => {
		const aif = getInterface(':?');
		aif.set({
			handlers: {
				specific: () => 'specific-val',
				'@default': () => 'default-val',
			},
		});
		const inst = getInstance(aif.ifName);
		assertStrictEquals($c.sm(inst, 'specific'), 'specific-val');
	});

	it('@default without @defacc - @default handler handles all other messages', () => {
		const aif = getInterface(':?');
		aif.set({
			handlers: {
				specific: () => 'specific-val',
				'@default': () => 'default-val',
			},
		});
		const inst = getInstance(aif.ifName);
		assertStrictEquals($c.sm(inst, 'unhandled'), 'default-val');
	});

	it('@default without @defacc - d.dop or @d(dop) / mop / hop match the requested op', () => {
		const aif = getInterface(':?');
		aif.set({
			handlers: {
				'@default': (d) => {
					return {
						dop: d.dop,
						mop: d.mop,
						hop: d.hop,
						dopMsg: d.sm(d, 'dop'),
						mopMsg: d.sm(d, 'mop'),
						hopMsg: d.sm(d, 'hop'),
					};
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const res = $c.sm(inst, 'unhandledOp');
		assertStrictEquals(res.dop, 'unhandledOp');
		assertStrictEquals(res.mop, 'unhandledOp');
		assertStrictEquals(res.hop, '@default');
		assertStrictEquals(res.dopMsg, 'unhandledOp');
		assertStrictEquals(res.mopMsg, 'unhandledOp');
		assertStrictEquals(res.hopMsg, '@default');
	});

	it('@default without @defacc - list-op with defaulted message and else does not run or return else', () => {
		const aif = getInterface(':?');
		aif.set({
			handlers: {
				'@default': () => 'default-val',
			},
		});
		const inst = getInstance(aif.ifName);
		let elseRan = false;
		const ric = codeBlock(() => {
			elseRan = true;
			return 'ric-else';
		});
		const res = $c.sm(inst, { op: 'unhandled', else: ric });
		assertStrictEquals(res, 'default-val');
		assertStrictEquals(elseRan, false);
	});

	it("@default with @defacc - @defacc's dispatch dop / mop / hop should be @defacc", () => {
		const aif = getInterface(':?');
		let defaccDop, defaccMop, defaccHop;
		let defaccDopMsg, defaccMopMsg, defaccHopMsg;
		aif.set({
			handlers: {
				'@defacc': (d) => {
					defaccDop = d.dop;
					defaccMop = d.mop;
					defaccHop = d.hop;
					defaccDopMsg = d.sm(d, 'dop');
					defaccMopMsg = d.sm(d, 'mop');
					defaccHopMsg = d.sm(d, 'hop');
					return true;
				},
				'@default': () => 'default-val',
			},
		});
		const inst = getInstance(aif.ifName);
		$c.sm(inst, 'unhandledOp');
		assertStrictEquals(defaccDop, '@defacc');
		assertStrictEquals(defaccMop, '@defacc');
		assertStrictEquals(defaccHop, '@defacc');
		assertStrictEquals(defaccDopMsg, '@defacc');
		assertStrictEquals(defaccMopMsg, '@defacc');
		assertStrictEquals(defaccHopMsg, '@defacc');
	});

	it('@default with @defacc - !op and !type should be requested op and interface type', () => {
		const aif = getInterface(':?');
		let defaccOpParam, defaccTypeParam;
		aif.set({
			handlers: {
				'@defacc': (d) => {
					defaccOpParam = d.mp.at('op');
					defaccTypeParam = d.mp.at('type');
					return true;
				},
				'@default': () => 'default-val',
			},
		});
		const inst = getInstance(aif.ifName);
		$c.sm(inst, 'unhandledOp');
		assertStrictEquals(defaccOpParam, 'unhandledOp');
		assertStrictEquals(defaccTypeParam, aif.ifName);
	});

	it('@default with @defacc - when returning true: @default executes', () => {
		const aif = getInterface(':?');
		let defaultExecuted = false;
		aif.set({
			handlers: {
				'@defacc': () => true,
				'@default': () => {
					defaultExecuted = true;
					return 'default-val';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		const res = $c.sm(inst, 'unhandledOp');
		assertStrictEquals(res, 'default-val');
		assertStrictEquals(defaultExecuted, true);
	});

	it('@default with @defacc - when returning false: @default does not execute and throws error in absence of list-op else', () => {
		const aif = getInterface(':?');
		let defaultExecuted = false;
		aif.set({
			handlers: {
				'@defacc': () => false,
				'@default': () => {
					defaultExecuted = true;
					return 'default-val';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		assertThrows(
			() => $c.sm(inst, 'unhandledOp'),
			TypeError,
			'No Mesgjs handler found'
		);
		assertStrictEquals(defaultExecuted, false);
	});

	it('@default with @defacc - when returning false: @default does not execute and returns list-op else value when present', () => {
		const aif = getInterface(':?');
		let defaultExecuted = false;
		aif.set({
			handlers: {
				'@defacc': () => false,
				'@default': () => {
					defaultExecuted = true;
					return 'default-val';
				},
			},
		});
		const inst = getInstance(aif.ifName);
		let elseRan = false;
		const ric = codeBlock(() => {
			elseRan = true;
			return 'ric-else';
		});
		const res = $c.sm(inst, { op: 'unhandledOp', else: ric });
		assertStrictEquals(res, 'ric-else');
		assertStrictEquals(defaultExecuted, false);
		assertStrictEquals(elseRan, true);
	});
});
