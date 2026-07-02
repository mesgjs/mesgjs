/*
 * Mesgjs @number interface - JS number / bigint receiver singleton
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, MsjsObject, setRO, typeAccepts } from './runtime.esm.js';

function perform (d, opf, def = 0) {
	const mp = d.mp; let js = d.orr;

	for (const v of mp.values()) js = opf(js, toNum(v, def));
	return js;
}

function toNum (v, def) {
	if (v instanceof MsjsObject && typeAccepts(v.msjsType, 'toNumber')) v = $c.sm(v, 'toNumber');

	const jsType = typeof v;

	return (jsType === 'number' || jsType === 'bigint') ? v : def;
}

function opAdd (d) {
	const mp = d.mp;
	let js = d.orr;

	for (const v of mp.values()) js += toNum(v, 0);
	return js;
}

function opHypot (d) {
	const { orr, mp } = d;

	if (mp.has('of')) return Math.hypot(...mp.at('of').values());
	return Math.hypot(orr, ...mp.values());
}

// Is number in the interval defined by the ge, gt, le, lt keys?
function opIval (d) {
	const { orr, mp } = d;

	return (((mp.has('ge') && orr < mp.at('ge')) ||
	  (mp.has('gt') && orr <= mp.at('gt')) ||
	  (mp.has('le') && orr > mp.at('le')) ||
	  (mp.has('lt') && orr >= mp.at('lt'))) ? false : true);
}

// (log) (default base=10) or (log base) or (log base=base)
function opLog (d) {
	const { orr, mp } = d;

	if (mp.has('base')) return Math.log(orr) / Math.log(mp.at('base'));
	if (mp.has(0)) return Math.log(orr) / Math.log(mp.at(0));
	return Math.log10(orr);
}

function opMax (d) {
	const { orr, mp } = d;

	if (mp.has('of')) return Math.max(...mp.at('of').values());
	return Math.max(orr, ...mp.values());
}

function opMin (d) {
	const { orr, mp } = d;

	if (mp.has('of')) return Math.min(...mp.at('of').values());
	return Math.min(orr, ...mp.values());
}

function opMul (d) {
	const mp = d.mp;
	let orr = d.orr;

	for (const v of mp.values()) orr *= toNum(v, 1);
	return orr;
}

function opSub (d) {
	const mp = d.mp; let orr = d.orr;

	for (const v of mp.values()) orr -= toNum(v, 0);
	return orr;
}

export function install () {
	getInterface('@number').set({
		lock: true, pristine: true, singleton: true,
		handlers: {
			'@eq': (d) => d.orr === toNum(d.mp.at(0)),
			'@jsv': (d) => d.orr,
			'+': opAdd,
			'&': (d) => perform(d, (a, b) => a & b, -1), // and
			'/': (d) => perform(d, (a, b) => a / b, 1), // div
			'=': (d) => d.orr === toNum(d.mp.at(0)), // eq
			'>=': (d) => d.orr >= toNum(d.mp.at(0)), // ge
			'>': (d) => d.orr > toNum(d.mp.at(0)), // gt
			'<=': (d) => d.orr <= toNum(d.mp.at(0)), // le
			'<<': (d) => d.orr << toNum(d.mp.at(0)), // lshf
			'<': (d) => d.orr < toNum(d.mp.at(0)), // lt
			'/+': (d) => perform(d, (a, b) => a % b, NaN), // mod
			'*': opMul,
			'!=': (d) => d.orr !== toNum(d.mp.at(0)), // ne
			'+-': (d) => -d.orr, // neg
			'|': (d) => perform(d, (a, b) => a | b), // or
			'**': (d) => perform(d, (a, b) => a ** b, 1), // pow
			'>>': (d) => d.orr >> toNum(d.mp.at(0)), // rshf
			'-': opSub,
			'^': (d) => perform(d, (a, b) => a ^ b), // xor
			'>>>': (d) => d.orr >>> toNum(d.mp.at(0)), // zfrs
			abs: (d) => Math.abs(d.orr),
			acos: (d) => Math.acos(d.orr),
			acosh: (d) => Math.acosh(d.orr),
			add: opAdd,
			and: (d) => perform(d, (a, b) => a & b, -1),
			asin: (d) => Math.asin(d.orr),
			asinh: (d) => Math.asinh(d.orr),
			atan: (d) => Math.atan(d.orr),
			atanh: (d) => Math.atanh(d.orr),
			atanxy: (d) => Math.atan2(toNum(d.mp.at('y', 0)), toNum(d.mp.at('x', 0))),
			cbrt: (d) => Math.cbrt(d.orr),			// Cube root
			ceil: (d) => Math.ceil(d.orr),
			cmpl: (d) => ~d.orr,					// Complement
			cos: (d) => Math.cos(d.orr),
			cosh: (d) => Math.cosh(d.orr),
			div: (d) => perform(d, (a, b) => a / b, 1),
			e: (d) => d.orr * Math.E,
			eq: (d) => d.orr === toNum(d.mp.at(0)),
			exp: (d) => Math.exp(d.orr),			// e^base
			expm1: (d) => Math.expm1(d.orr),		// e^(base - 1)
			floor: (d) => Math.floor(d.orr),
			ge: (d) => d.orr >= toNum(d.mp.at(0)),
			golden: (d) => 1.618033988749895 * d.orr,// golden ratio (phi)
			gt: (d) => d.orr > toNum(d.mp.at(0)),
			hypot: opHypot,
			int: (d) => Math.trunc(d.orr),
			isNan: (d) => d.orr !== d.orr,
			isNegInf: (d) => d.orr === -Infinity,
			isNegZero: (d) => d.orr === 0 && (1 / d.orr) === -Infinity,
			isPosInf: (d) => d.orr === Infinity,
			isPosZero: (d) => d.orr === 0 && (1 / d.orr) === Infinity,
			ival: opIval,
			le: (d) => d.orr <= toNum(d.mp.at(0)),
			ln: (d) => Math.log(d.orr),			// Natural log
			ln10: (d) => Math.LN10 * d.orr,
			ln1p: (d) => Math.log1p(d.orr),
			ln2: (d) => Math.LN2 * d.orr,
			log: opLog,							// Log base 10 (or specific)
			log10e: (d) => Math.LOG10E * d.orr,
			log2: (d) => Math.log2(d.orr),
			log2e: (d) => Math.LOG2E * d.orr,
			lshf: (d) => d.orr << toNum(d.mp.at(0)),
			lt: (d) => d.orr < toNum(d.mp.at(0)),
			max: opMax,
			min: opMin,
			mod: (d) => perform(d, (a, b) => a % b, NaN),
			mul: opMul,
			ne: (d) => d.orr !== toNum(d.mp.at(0)),
			neg: (d) => -d.orr,
			or: (d) => perform(d, (a, b) => a | b),
			pi: (d) => Math.PI * d.orr,
			pow: (d) => perform(d, (a, b) => a ** b, 1),
			random: (d) => Math.random() * d.orr,
			rshf: (d) => d.orr >> toNum(d.mp.at(0)),
			round: (d) => Math.round(d.orr),
			sign: (d) => Math.sign(d.orr),
			sin: (d) => Math.sin(d.orr),
			sinh: (d) => Math.sinh(d.orr),
			sqrt: (d) => Math.sqrt(d.orr),
			sqrt2: (d) => Math.SQRT2 * d.orr,
			sub: opSub,
			tan: (d) => Math.tan(d.orr),
			tanh: (d) => Math.tanh(d.orr),
			toNumber: (d) => d.orr,
			toString: (d) => d.orr.toString(d.mp.at(0)),
			valueOf: (d) => d.orr,
			xor: (d) => perform(d, (a, b) => a ^ b),
			zfrs: (d) => d.orr >>> toNum(d.mp.at(0)),
		},
		cacheHints: {
			'@init': 'pin',
			'+': 'pin',
			'-': 'pin',
			add: 'pin',
			sub: 'pin',
		},
	});
}

// END
