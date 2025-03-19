/*
 * SysCL @core Interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { logInterfaces, getInstance, getInterface, isIndex, jsToSCL, runIfCode, setRO, typeAccepts } from 'syscl/runtime.esm.js';

function opAnd (d) {
    const { mp } = d;
    for (const e of mp?.entries ? m.entries() : []) if (isIndex(e[0]) && !runIfCode(e[1])) return false;
    return true;
}

function opCase (d) {
}

function opGet (d) {
    const { mp } = d;
    if (mp?.at) {
	const instance = getInstance(mp.at(0));
	if (instance && mp.hasKey('init')) instance('init', mp.at('init'));
	return instance;
    }
}

function opIf (d) {
    const { mp } = d;
    if (mp instanceof NANOS) {
	const end = mp.next - 1;
	for (let i = 0; i < end; i += 2) if (runIfCode(mp.at(i))) return runIfCode(mp.at(i + 1));
	return runIfCode(mp.at('else'));
    }
}

function opImport (d) {
}

const opInterface = d => d.mp?.at ? getInterface(d.mp.at(0)) : undefined;

const opNot = d => !(d.mp?.at ? d.mp.at(0) : undefined);

function opOr (d) {
    const { mp } = d;
    for (const e of m?.entries ? m.entries() : []) if (isIndex(e[0]) && runIfCode(e[1])) return true;
    return false;
}

const opType = d => d.mp?.at ? jsToSCL(d.mp.at(0))?.sclType : undefined;

const opTypeAccepts = d => d.mp?.at ? typeAccepts(d.mp.at(0), d.mp.at(1)) : undefined;

export function installCore () {
    const ix = getInterface('@core');
    ix.set({
	final: true, lock: true, pristine: true, singleton: true,
	handlers: {
	    and: opAnd,
	    case: opCase,
	    if: opIf,
	    import: opImport,
	    get: opGet,
	    interface: opInterface,
	    logInterfaces,
	    not: opNot,
	    or: opOr,
	    showDispatch: d => console.log(d),
	    type: opType,
	    typeAccepts: opTypeAccepts,
	},
    });
    setRO(globalThis, {
	$core: getInstance('@core')),
	$f: false,
	$n: null,
	$t: true,
	$u: undefined,
    });
}

// END
