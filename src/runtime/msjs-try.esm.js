/*
 * Mesgjs @try interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, MsjsFlow, runIfCode, setRO, throwFlow } from './runtime.esm.js';

// @try(try code... catch=code always=code)
function opTry (d) {
    const { mp, js } = d;
    delete js.exception;
    delete js.result;
    js.active = true;
    try {
	for (const v of mp.values()) {
	    js.capture = false;
	    try { js.result = runIfCode(v); }
	    catch (ex) {
		if (!js.capture) throw ex;
		if (js.hasFlowRes) {
		    js.result = js.flowRes;
		    js.hasFlowRes = js.flowRes = false;
		}
		if (ex.message === 'stop') break;
	    }
	}
    }
    catch (ex) {
	if (ex instanceof MsjsFlow) throw ex;
	js.exception = ex;
	if (mp.has('catchers')) for (const en of mp.at('catchers').entries()) {
	    const clob = globalThis[en[0]];
	    if (typeof clob !== 'function' || !(ex instanceof clob)) continue;
	    if (en[1]?.msjsType !== '@code') return en[1];
	    js.capture = false;
	    try { en[1]('run'); }
	    catch (ex) {
		if (!js.capture) throw ex;
		if (js.hasFlowRes) {
		    js.result = js.flowRes;
		    js.hasFlowRes = js.flowRes = false;
		}
	    }
	    return js.result;
	}
	if (!mp.has('catch')) throw ex;
	const cv = mp.at('catch');
	if (cv?.msjsType !== '@code') return cv;
	js.capture = false;
	try { cv('run'); }
	catch (ex) {
	    if (!js.capture) throw ex;
	    if (js.hasFlowRes) {
		js.result = js.flowRes;
		js.hasFlowRes = js.flowRes = false;
	    }
	}
    }
    finally {
	runIfCode(mp.at('always'));
	js.active = false;
    }
    return js.result;
}

export function install (name) {
    getInterface(name).set({
	lock: true, pristine: true,
	handlers: {
	    '@init': d => setRO(d.octx, 'js', {}),
	    error: d => d.js.exception,
	    message: d => d.js.exception?.message,
	    name: d => d.js.exception?.name,
	    next: d => throwFlow(d, 'next', name),
	    result: d => d.js.result,
	    return: d => { d.js.result = d.mp.at(0); },
	    stop: d => throwFlow(d, 'stop', name),
	    try: opTry,
	},
    });
}

// END
