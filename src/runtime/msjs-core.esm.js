/*
 * Mesgjs @core Interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import {
	debugConfig, fcheck, fready, fwait, getInstance, getInterface, getModMeta, logInterfaces, modHasCap,
	MsjsObject, runIfCode, runWhileCode, sendAnonMessage, setModMeta, setRO, typeAccepts, typeChains
} from './runtime.esm.js';
import { NANOS, parseQJSON, parseSLID } from '@nanos';

// (and value...)
// And: false result if any not true, else last true result (default true)
function opAnd (d) {
	const { mp } = d;
	let result = true;

	for (const v of mp.values()) {
		result = runIfCode(v);
		if (!result) return result;
	}
	return result;
}

// (await {block!}... collect=@f)
function opAwait (d) {
	const { mp } = d, collect = mp.at('collect');
	let result = collect ? new NANOS() : undefined;
	const save = v => { if (collect) result.push(v); else result = v; };
	const runBlocks = async () => {
		for (const v of mp.values()) save(await runIfCode(v));
	};
	const whenDone = getInstance('@promise');

	runBlocks().then(() => whenDone.resolve(result));
	return whenDone;
}

// (case cmp?=@eq refVal cmp1 res1 ... cmpN resN else=default)
// Compare reference value refVal to comparison values cmp1 ... cmpN.
// Execute the corresponding result block res1 ... resN on the first successful match,
// or the else block if nothing matches.
// Comparison and result blocks are RIC values.
function opCase (d) {
	const mp = d.mp, cmp = mp.at('cmp', '@eq'), stop = mp.next - 1;
	const ref = mp.at(0), type = MsjsObject.typeOf(ref);
	let eq;

	// Determine comparison strategy
	if (MsjsObject.typeOf(cmp) === '@function') {
		eq = (value) => $c.sm(cmp, 'call', [value, ref]); // Compare using `fn(call value ref)`
	} else if (cmp === '@eq') { // Use "@eq" protocol if available, otherwise use "same" protocol
		if (type && typeAccepts(type, '@eq')) eq = (value) => $c.sm(ref, '@eq', [value]);
		else eq = (value) => ref === value;
	} else if (cmp === '@same') { // Use "@same" protocol (value1 === value2)
		eq = (value) => ref === value;
	} else {
		eq = (value) => $c.sm(ref, cmp, [value]); // Standard or list-op message (likely with else)
	}

	for (let i = 1; i < stop; i += 2) if (eq(runIfCode(mp.at(i)))) return runIfCode(mp.at(i + 1));
	return runIfCode(mp.at('else'));
}

// (eq value1 value2)
// Returns @t if value1 is equal to value2
// Uses value1(@eq value2) if available or JS value1 === value2 otherwise
function opEq (d) {
	const mp = d.mp;
	const v1 = mp.at(0), v2 = mp.at(1);

	return $c.sm(v1, { op: '@eq', else: v1 === v2 }, v2);
}

// (get type init=params)
function opGet (d) {
	const { mp } = d;
	return getInstance(mp.at(0), mp.at('init'));
}

// (if cond1 then1 cond2 then2 ... else=value)
function opIf (d) {
	const { mp } = d, end = mp.next - 1;

	for (let i = 0; i < end; i += 2) if (runIfCode(mp.at(i))) return runIfCode(mp.at(i + 1));
	/*
	 * Return the else value if provided; otherwise return the final
	 * expression if there's an odd number of expressions.
	 */
	if (mp.has('else')) return runIfCode(mp.at('else'));
	if (mp.next % 2) return runIfCode(mp.at(end));
}

// (or value...)
// Or: first true result, else last false result (default false)
function opOr (d) {
	const { mp } = d;
	let result = false;

	for (const v of mp.values()) {
		result = runIfCode(v);
		if (result) return result;
	}
	return result;
}

// (run {block!}... repeat=@f collect=@f)
function opRun (d) {
	const { mp } = d, collect = mp.at('collect');
	let result = collect ? new NANOS() : undefined;
	const save = v => { if (collect) result.push(v); else result = v; };

	if (mp.at('repeat')) for (const v of mp.values()) save(runWhileCode(v));
	else for (const v of mp.values()) save(runIfCode(v));
	return result;
}

// (throw error)
function opThrow (d) {
	const { mp } = d, err = mp.at(0);

	throw ((err instanceof Error) ? err : new Error(err));
}

// Returns true if exactly one value is true
function opXor (d) {
	const { mp } = d;
	let result = false;

	for (const v of mp.values()) {
		const curRes = runIfCode(v);
		if (curRes) {
			if (result) return false;
			result = curRes;
		}
	}
	return result;
}

export function install (name) {
	getInterface(name).set({
		final: true, lock: true, pristine: true, singleton: true,
		handlers: {
			_: (d) => d.mp.at(0),			// underscore ("basically parentheses")
			'&': opAnd,
			':': opCase,
			'+': opGet,
			'?': opIf,
			'~': (d) => !runIfCode(d.mp.at(0)),	// not
			'|': opOr,
			'=': opEq,
			'==': (d) => d.mp.at(0) === d.mp.at(1), // same
			'!=': (d) => !opEq(d),
			'!==': (d) => d.mp.at(0) !== d.mp.at(1), // different
			and: opAnd,
			await: opAwait,
			case: opCase,
			debug: (d) => debugConfig(d.mp),
			diff: (d) => d.mp.at(0) !== d.mp.at(1), // different
			eq: opEq,
			fcheck: (d) => fcheck(d.mp.at(0)),
			fwait: (d) => fwait(...d.mp.values()),
			fready: (d) => fready(d.mp.at('mid'), d.mp.at(0)),
			get: opGet,					// Get instance
			if: opIf,
			interface: (d) => getInterface(d.mp.at(0)),
			log: (d) => console.log(...d.mp.values()),
			logErr: (d) => console.error(...d.mp.values()),
			logInterfaces,
			logWarn: (d) => console.warn(...d.mp.values()),
			modHasCap: (d) => modHasCap(d.mp.at(0), d.mp.at(1)),
			ne: (d) => !opEq(d),
			not: (d) => !runIfCode(d.mp.at(0)),
			or: opOr,
			qjson: (d) => parseQJSON(d.mp.at(0, '')),
			run: opRun,
			same: (d) => d.mp.at(0) === d.mp.at(1),
			slid: (d) => parseSLID(d.mp.at(0, '')),
			throw: opThrow,
			type: (d) => globalThis.$msjsReceiver(d.mp.at(0))?.msjsType,
			typeAccepts: (d) => typeAccepts(d.mp.at(0), d.mp.at(1)),
			typeChains: (d) => typeChains(d.mp.at(0), d.mp.at(1)),
			xor: opXor,
		},
		cacheHints: {
			':': 'pin',
			'+': 'pin',
			'?': 'pin',
			case: 'pin',
			get: 'pin',
			if: 'pin',
		},
	});
	if (name === '@core') {
		setRO(globalThis, '$c', getInstance('@core'));
		// "Re-export" common runtime functions on $c to reduce imports
		Object.assign($c, {
			debugConfig,
			fcheck,
			fready,
			fwait,
			getInstance,
			getInterface,
			getModMeta,
			modHasCap,
			MsjsObject,
			runIfCode,
			runWhileCode,
			setModMeta,
			setRO,
			sm: sendAnonMessage,
			typeAccepts,
			typeChains,
		});
		// BEST PRACTICE: Make $c immutable after loading in mesgjs.esm.js
	}
}

// END
