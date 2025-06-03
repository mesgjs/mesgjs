/*
 * Mesgjs @reactive interface
 *
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, runIfCode, msjsInstance, setRO } from './runtime.esm.js';
import { reactive } from './vendor.esm.js';

let instType;

function jsdef (def) {
    switch (def?.msjsType) {
    case '@code':	return () => def('run');
    case '@function':	return def('jsfn');
    case instType:	return def('@jsv').getter;
    }
}

function jsfn (fn) {
    switch (fn?.msjsType) {
    case '@code':	return fn('fn')('jsfn');
    case '@function':	return fn('jsfn');
    default:		return fn;
    }
}

function opInit (d) {
    const { mp } = d, p0 = mp.at(0);
    // Wrap an existing reactive or create a new one
    if (p0?.$reactive === reactive.type) setRO(d.octx, 'js', p0);
    else {
	const cmp = mp.at('cmp'), def = mp.at('def');
	if (typeof cmp === 'function') mp.set('cmp', jsfn(cmp));
	if (typeof def === 'function') mp.set('def', jsdef(def));
	if (!mp.has('v') && mp.has(0)) mp.set('v', mp.at(0));
	setRO(d.octx, 'js', reactive(mp?.storage || {}));
    }
    setRO(d.js, msjsInstance, d.rr, false);
}

function opBatch (d) { return reactive.batch(() => runIfCode(d.mp.at(0))); }

function opSet (d) {
    const { js, mp } = d;
    for (const en of mp.entries()) {
	switch (en[0]) {
	case 'def':
	    if (typeof en[1] === 'function') js.def = jsdef(en[1]);
	    break;
	case 'eager': case 'eager1': case 'eager2':
	    js.eager = en[1];
	    break;
	case 'v': case '0':
	    js.wv = en[1];
	    break;
	}
    }
    return js;
}

function opUntr (d) { return reactive.untracked(() => runIfCode(d.mp.at(0))); }

// Return a reactive-interface object
function rio (r) {
    if (!r) r = reactive();
    return {
	batch: reactive.batch,
	changed: () => r.ripple(),
	create: rio,
	depend: () => r.rv,
    };
}

export function install (name) {
    instType = name;
    getInterface(name).set({
	lock: true, pristine: true,
	handlers: {
	    '@init': opInit,
	    '@jsv': d => d.js,
	    batch: opBatch,
	    def: d => d.js.def,
	    eager: d => d.js.eager,
	    error: d => d.js.error,
	    fv: d => reactive.fv(d.js),
	    rio: d => rio(d.js),
	    rv: d => d.js.rv,
	    set: opSet,
	    untr: opUntr,
	},
    });
}

// END
