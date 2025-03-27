/*
 * SysCL @number interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from 'syscl/runtime.esm.js';
// import { getInterface, jsToSCL, NANOS, runIfCode, setRO } from 'syscl/runtime.esm.js';

function opAdd (d) {
    const { ps, mp } = d;
    return [...mp.values()].reduce((a, b) => a + b, ps);
}

function opAtInit (d) {
    const { octx, mp } = d, num = mp.at(0), type = typeof num;
    setRO(octx, 'ps', (type === 'number' || type === 'bigint') ? num : parseFloat(num));
}

function opDiv (d) {
    const { ps, mp } = d;
    return [...mp.values()].reduce((a, b) => a / b, ps);
}

// Is number in the interval defined by the ge, gt, le, lt keys?
function opInter (d) {
    const { ps, mp } = d;
    return (((mp.has('ge') && ps < mp.at('ge')) ||
      (mp.has('gt') && ps <= mp.at('gt')) ||
      (mp.has('le') && ps > mp.at('le')) ||
      (mp.has('lt') && ps >= mp.at('lt'))) ? false : true);
}

function opMod (d) {
    const { ps, mp } = d;
    return [...mp.values()].reduce((a, b) => a % b, ps);
}

function opMul (d) {
    const { ps, mp } = d;
    return [...mp.values()].reduce((a, b) => a * b, ps);
}

function opPow (d) {
    const { ps, mp } = d;
    return [...mp.values()].reduce((a, b) => a ** b, ps);
}

function opSub (d) {
    const { ps, mp } = d;
    return [...mp.values()].reduce((a, b) => a - b, ps);
}

export function installNumber () {
    getInterface('@number').set({
	final: true, lock: true, pristine: true,
	handlers: {
	    '@init': opAtInit,
	    add: opAdd,
	    div: opDiv,
	    eq: d => d.ps === d.mp.at(0),
	    ge: d => d.ps >= d.mp.at(0),
	    gt: d => d.ps > d.mp.at(0),
	    inter: opInter,
	    isNan: d => d.ps !== d.ps,
	    isNegInf: d => d.ps === -Infinity,
	    isNegZero: d => d.ps === 0 && (1 / d.ps) === -Infinity,
	    isPosInf: d => d.ps === Infinity,
	    isPosZero: d => d.ps === 0 && (1 / d.ps) === Infinity,
	    le: d => d.ps <= d.mp.at(0),
	    lt: d => d.ps < d.mp.at(0),
	    mod: opMod,
	    mul: opMul,
	    ne: d => d.ps !== d.mp.at(0),
	    neg: d => -d.ps,
	    pow: opPow,
	    sub: opSub,
	    toString: d => d.ps.toString(d.mp.at(0)),
	    valueOf: d => d.ps,
	},
    });
}

// END
