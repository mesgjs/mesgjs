/*
 * SysCL @try interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, runIfCode, SCLFlow, setRO } from 'syscl/runtime.esm.js';

// @try(try code... catch=code always=code)
function opTry (d) {
    const { mp, ps } = d;
    try {
	let result;
	for (const v of mp.values()) result = runIfCode(v);
	return result;
    }
    catch (e) {
	if (e instanceof SCLFlow || !mp.has('catch')) throw e;
	ps.exception = e;
	const cv = mp.at('catch');
	if (cv.sclType === '@code') cv('run');
	else return cv;
    }
    finally {
	runIfCode(mp.at('always'));
    }
}

export function installTry () {
    getInterface('@try').set({
	final: true, lock: true, pristine: true,
	handlers: {
	    '@init': d => setRO(d.octx, 'ps', {}),
	    exception: d => d.ps.exception,
	    try: opTry,
	},
    });
}

// END
