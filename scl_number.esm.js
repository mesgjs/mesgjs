/*
 * SysCL @number interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO, typeAccepts, typeChains } from 'syscl/runtime.esm.js';

function toNum (v, def) {
    const st = v?.sclType;
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

function opDiv (d) {
    const mp = d.mp; let js = d.js;
    for (const v of mp.values) js /= toNum(v, 1);
    return js;
}

// Is number in the interval defined by the ge, gt, le, lt keys?
function opInter (d) {
    const { js, mp } = d;
    return (((mp.has('ge') && js < mp.at('ge')) ||
      (mp.has('gt') && js <= mp.at('gt')) ||
      (mp.has('le') && js > mp.at('le')) ||
      (mp.has('lt') && js >= mp.at('lt'))) ? false : true);
}

function opMod (d) {
    const mp = d.mp; let js = d.js;
    for (const v of mp.values()) js %= toNum(v, NaN);
    return js;
}

function opMul (d) {
    const mp = d.mp; let js = d.js;
    for (const v of mp.values()) js *= toNum(v, 1);
    return js;
}

function opPow (d) {
    const mp = d.mp; let js = d.js;
    for (const v of mp.values()) js **= toNum(v, 1);
    return js;
}

function opSub (d) {
    const mp = d.mp; let js = d.js;
    for (const v of mp.values()) js -= toNum(v, 0);
    return js;
}

export function install () {
    getInterface('@number').set({
	final: true, lock: true, pristine: true,
	handlers: {
	    '@init': opAtInit,
	    '@jsv': d => d.js,
	    add: opAdd,
	    div: opDiv,
	    eq: d => d.js === d.mp.at(0),
	    ge: d => d.js >= d.mp.at(0),
	    gt: d => d.js > d.mp.at(0),
	    inter: opInter,
	    isNan: d => d.js !== d.js,
	    isNegInf: d => d.js === -Infinity,
	    isNegZero: d => d.js === 0 && (1 / d.js) === -Infinity,
	    isPosInf: d => d.js === Infinity,
	    isPosZero: d => d.js === 0 && (1 / d.js) === Infinity,
	    le: d => d.js <= d.mp.at(0),
	    lt: d => d.js < d.mp.at(0),
	    mod: opMod,
	    mul: opMul,
	    ne: d => d.js !== d.mp.at(0),
	    neg: d => -d.js,
	    pow: opPow,
	    sub: opSub,
	    toNumber: d => d.js,
	    toString: d => d.js.toString(d.mp.at(0)),
	    valueOf: d => d.js,
	},
	cacheHints: {
	    '@init': 'pin',
	},
    });
}

// END
