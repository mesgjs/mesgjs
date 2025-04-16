/*
 * SysCL @try interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, runIfCode, SCLFlow } from 'syscl/runtime.esm.js';

// @try(try code... catch=code always=code)
function opTry (d) {
    const { mp, js } = d;
    delete js.exception;
    delete js.result;
    const save = ex => {
	const info = ex.info;
	if (info?.has?.('result')) js.result = e.info.at('result');
    };
    try {
	for (const v of mp.values()) {
	    js.capture = false;
	    try { js.result = runIfCode(v); }
	    catch (ex) {
		if (!js.capture) throw ex;
		save(ex);
		if (ex.message === 'stop') break;
	    }
	}
    }
    catch (ex) {
	if (ex instanceof SCLFlow) throw ex;
	js.exception = ex;
	if (mp.has('catchers')) for (const en of mp.at('catchers').entries()) {
	    const clob = globalThis[en[0]];
	    if (typeof clob !== 'function' || !(ex instanceof clob)) continue;
	    if (en[1]?.sclType !== '@code') return en[1];
	    js.capture = false;
	    try { en[1]('run'); }
	    catch (ex) {
		if (!js.capture) throw ex;
		save(e);
	    }
	    return js.result;
	}
	if (!mp.has('catch')) throw ex;
	const cv = mp.at('catch');
	if (cv?.sclType !== '@code') return cv;
	js.capture = false;
	try { cv('run'); }
	catch (ex) {
	    if (!js.capture) throw ex;
	    save(ex);
	}
    }
    finally {
	runIfCode(mp.at('always'));
    }
    return js.result;
}

export function install (name) {
    getInterface(name).set({
	lock: true, pristine: true,
	handlers: {
	    '@init': d => setRO(d, 'js', {}),
	    exception: d => d.js.exception,
	    next: d => { d.js.capture = true; throw new SCLFlow('next', d.mp); },
	    result: d => d.js.result,
	    return: d => { d.js.result = d.mp.at(0); },
	    stop: d => { d.js.capture = true; throw new SCLFlow('stop', d.mp); },
	    try: opTry,
	},
    });
}

// END
