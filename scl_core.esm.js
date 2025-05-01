/*
 * SysCL @core Interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { debugConfig, getInstance, getInterface, jsToSCL, logInterfaces, NANOS, runIfCode, setRO, typeAccepts, typeChains } from 'syscl/runtime.esm.js';
import { parseSLID } from 'syscl/nanos.esm.js';

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

// (case val cmp1 res1 ... cmpN resN else=default)
function opCase (d) {
    const { mp } = d, val = mp.at(0), type = val?.sclType, stop = mp.next - 1;
    const op = typeAccepts(type, 'caseEq') ? 'caseEq' : typeAccepts(type, 'eq') ? 'eq' : undefined, eq = op ? (to => val(op, to)) : (to => val === to);
    for (let i = 1; i < stop; i += 2) if (eq(runIfCode(mp.at(i)))) return runIfCode(mp.at(i + 1));
    return runIfCode(mp.at('else'));
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

// function opImport (d) {
// }

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

// (run value... collect=@f)
function opRun (d) {
    const { mp } = d, collect = mp.at('collect');
    let result = collect ? new NANOS() : undefined;
    const save = v => { if (collect) result.push(v); else result = v; };
    for (const v of mp.values()) save(runIfCode(v));
    return result;
}

// (throw error)
function opThrow (d) {
    const { mp } = d, err = mp.at(0);
    throw ((err instanceof Error) ? err : new Error(err));
}

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
	    _: d => d.mp.at(0),		// underscore ("basically parentheses")
	    and: opAnd,
	    case: opCase,
	    debug: d => debugConfig(d.mp),
	    get: opGet,			// Get instance
	    if: opIf,
	    // import: opImport,
	    interface: d => getInterface(d.mp.at(0)),
	    log: d => console.log(...d.mp.values()),
	    logInterfaces,
	    not: d => !runIfCode(d.mp.at(0)),
	    or: opOr,
	    run: opRun,
	    slid: d => parseSLID(d.mp.at(0, '')),
	    throw: opThrow,
	    type: d => jsToSCL(d.mp.at(0))?.sclType,
	    typeAccepts: d => typeAccepts(d.mp.at(0), d.mp.at(1)),
	    typeChains: d => typeChains(d.mp.at(0), d.mp.at(1)),
	    xor: opXor,
	},
	cacheHints: {
	    case: 'pin',
	    get: 'pin',
	    if: 'pin',
	},
    });
    // @core is also responsible for these...
    if (name === '@core') setRO(globalThis, {
	$c: getInstance('@core'),
	$f: false,
	$gss: new NANOS(),
	$n: null,
	$t: true,
	$u: undefined,
    });
}

// END
