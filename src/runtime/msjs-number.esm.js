/*
 * Mesgjs @number interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO, typeAccepts } from './runtime.esm.js';

function perform (d, opf, def = 0) {
    const mp = d.mp; let js = d.js;
    for (const v of mp.values()) js = opf(js, toNum(v, def));
    return js;
}

function toNum (v, def) {
    const st = v?.msjsType;
    if (st && typeAccepts(st, 'toNumber')) v = v('toNumber');
    const t = typeof v;
    if (t === 'number' || t === 'bigint') return v;
    return def;
}

function opAdd (d) {
    const mp = d.mp; let js = d.js;
    for (const v of mp.values()) js += toNum(v, 0);
    return js;
}

function opAtInit (d) {
    const { octx, mp } = d, num = mp.at(0), type = typeof num;
    setRO(octx, 'js', (type === 'number' || type === 'bigint') ? num : parseFloat(num));
}

function opHypot (d) {
    const { js, mp } = d;
    if (mp.has('of')) return Math.hypot(...mp.at('of').values());
    return Math.hypot(js, ...mp.values());
}

// Is number in the interval defined by the ge, gt, le, lt keys?
function opIval (d) {
    const { js, mp } = d;
    return (((mp.has('ge') && js < mp.at('ge')) ||
      (mp.has('gt') && js <= mp.at('gt')) ||
      (mp.has('le') && js > mp.at('le')) ||
      (mp.has('lt') && js >= mp.at('lt'))) ? false : true);
}

// (log) (default base=10) or (log base) or (log base=base)
function opLog (d) {
    const { js, mp } = d;
    if (mp.has('base')) return Math.log(js) / Math.log(mp.at('base'));
    if (mp.has(0)) return Math.log(js) / Math.log(mp.at(0));
    return Math.log10(js);
}

function opMax (d) {
    const { js, mp } = d;
    if (mp.has('of')) return Math.max(...mp.at('of').values());
    return Math.max(js, ...mp.values());
}

function opMin (d) {
    const { js, mp } = d;
    if (mp.has('of')) return Math.min(...mp.at('of').values());
    return Math.min(js, ...mp.values());
}

function opMul (d) {
    const mp = d.mp; let js = d.js;
    for (const v of mp.values()) js *= toNum(v, 1);
    return js;
}

function opSub (d) {
    const mp = d.mp; let js = d.js;
    for (const v of mp.values()) js -= toNum(v, 0);
    return js;
}

export function install () {
    getInterface('@number').set({
	lock: true, pristine: true,
	handlers: {
	    '@init': opAtInit,
	    '@jsv': d => d.js,
	    '+', opAdd,
	    '-', opSub,
	    '*', opMul,
	    '**': d => perform(d, (a, b) => a ** b, 1),
	    '/', d => perform(d, (a, b) => a / b, 1),
	    '/+', d => perform(d, (a, b) => a % b, NaN),
	    abs: d => Math.abs(d.js),
	    acos: d => Math.acos(d.js),
	    acosh: d => Math.acosh(d.js),
	    add: opAdd,
	    and: d => perform(d, (a, b) => a & b, -1),
	    asin: d => Math.asin(d.js),
	    asinh: d => Math.asinh(d.js),
	    atan: d => Math.atan(d.js),
	    atanh: d => Math.atanh(d.js),
	    atanxy: d => Math.atan2(toNum(d.mp.at('y', 0)), toNum(d.mp.at('x', 0))),
	    cbrt: d => Math.cbrt(d.js),		// Cube root
	    ceil: d => Math.ceil(d.js),
	    cmpl: d => ~d.js,			// Complement
	    cos: d => Math.cos(d.js),
	    cosh: d => Math.cosh(d.js),
	    div: d => perform(d, (a, b) => a / b, 1),
	    e: d => d.js * Math.E,
	    eq: d => d.js === toNum(d.mp.at(0)),
	    exp: d => Math.exp(d.js),		// e^base
	    expm1: d => Math.expm1(d.js),	// e^(base - 1)
	    floor: d => Math.floor(d.js),
	    ge: d => d.js >= toNum(d.mp.at(0)),
	    golden: d => 1.618033988749895 * d.js,// golden ratio (phi)
	    gt: d => d.js > toNum(d.mp.at(0)),
	    hypot: opHypot,
	    int: d => Math.trunc(d.js),
	    isNan: d => d.js !== d.js,
	    isNegInf: d => d.js === -Infinity,
	    isNegZero: d => d.js === 0 && (1 / d.js) === -Infinity,
	    isPosInf: d => d.js === Infinity,
	    isPosZero: d => d.js === 0 && (1 / d.js) === Infinity,
	    ival: opIval,
	    le: d => d.js <= toNum(d.mp.at(0)),
	    ln: d => Math.log(d.js),		// Natural log
	    ln10: d => Math.LN10 * d.js,
	    ln1p: d => Math.log1p(d.js),
	    ln2: d => Math.LN2 * d.js,
	    log: opLog,				// Log base 10 (or specific)
	    log10e: d => Math.LOG10E * d.js,
	    log2: d => Math.log2(d.js),
	    log2e: d => Math.LOG2E * d.js,
	    lshf: d => d.js << toNum(d.mp.at(0)),
	    lt: d => d.js < toNum(d.mp.at(0)),
	    max: opMax,
	    min: opMin,
	    mod: d => perform(d, (a, b) => a % b, NaN),
	    mul: opMul,
	    ne: d => d.js !== toNum(d.mp.at(0)),
	    neg: d => -d.js,
	    or: d => perform(d, (a, b) => a | b),
	    pi: d => Math.PI * d.js,
	    pow: d => perform(d, (a, b) => a ** b, 1),
	    random: d => Math.random() * d.js,
	    rshf: d => d.js >> toNum(d.mp.at(0)),
	    round: d => Math.round(d.js),
	    sign: d => Math.sign(d.js),
	    sin: d => Math.sin(d.js),
	    sinh: d => Math.sinh(d.js),
	    sqrt: d => Math.sqrt(d.js),
	    sqrt2: d => Math.SQRT2 * d.js,
	    sub: opSub,
	    tan: d => Math.tan(d.js),
	    tanh: d => Math.tanh(d.js),
	    toNumber: d => d.js,
	    toString: d => d.js.toString(d.mp.at(0)),
	    valueOf: d => d.js,
	    xor: d => perform(d, (a, b) => a ^ b),
	    zfrs: d => d.js >>> toNum(d.mp.at(0)),
	},
	cacheHints: {
	    '@init': 'pin',
	},
    });
}

// END
