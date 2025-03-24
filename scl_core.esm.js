/*
 * SysCL @core Interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { logInterfaces, getInstance, getInterface, isIndex, jsToSCL, runIfCode, setRO, typeAccepts } from 'syscl/runtime.esm.js';

// And: false if any not true, else last true result (default true)
function opAnd (d) {
    const { mp } = d;
    let result = true;
    for (const v of mp.values()) {
	result = runIfCode(v);
	if (!result) return false;
    }
    return result;
}

function opCase (d) {
    const { mp } = d;
    // Need to define equality testing
}

function opGet (d) {
    const { mp } = d, instance = getInstance(mp.at(0));
    if (instance && mp.has('init')) instance('init', mp.at('init'));
    return instance;
}

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

function opImport (d) {
}

// Or: first true result, else false
function opOr (d) {
    const { mp } = d;
    for (const v of mp.values()) {
	const r = runIfCode(v);
	if (r) return r;
    }
    return false;
}

function opRun (d) {
    const { mp } = d;
    let result;
    for (const e of mp.values()) result = runIfCode(v);
    return result;
}

export function installCore () {
    getInterface('@core').set({
	final: true, lock: true, pristine: true, singleton: true,
	handlers: {
	    _: d => d.mp.at(0),
	    and: opAnd,
	    // case: opCase,
	    if: opIf,
	    // import: opImport,
	    get: opGet,
	    interface: d => getInterface(d.mp.at(0)),
	    log: d => console.log(...d.mp.values()),
	    logInterfaces,
	    not: d => !d.mp.at(0),
	    or: opOr,
	    run: opRun,
	    // testDispatch: d => console.log(d),
	    type: d => jsToSCL(d.mp.at(0))?.sclType,
	    typeAccepts: d => typeAccepts(d.mp.at(0), d.mp.at(1)),
	},
    });
    setRO(globalThis, {
	$c: getInstance('@core'),
	$f: false,
	$n: null,
	$t: true,
	$u: undefined,
    });
}

// END
