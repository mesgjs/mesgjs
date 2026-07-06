/*
 * Mesgjs @try interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, MsjsFlow, runIfCode, setRO, throwFlow } from './runtime.esm.js';

// @try(try code... catchers=[type=code...]? catch=code? always=code?)
// @try(atry ...)
// Async version - the main code blocks (not error handlers) may be async; returns a (JS) promise
function opTry (d) {
	const { mp, rr } = d;
	const onCatch = (ex) => {
		if (!rr.capture) throw ex;
		if (rr.hasFlowRes) {
			rr.result = rr.flowRes;
			rr.hasFlowRes = rr.flowRes = false;
		}
		return (ex.message === 'stop');
	};
	const result = (rv = rr.result) => ((d.dop === 'atry') ? Promise.resolve(rv) : rv);

	rr.exception = undefined;
	rr.result = undefined;
	rr.active = true;
	try {
		if (d.dop === 'atry') return (async () => {
			for (const v of mp.values()) {
				rr.capture = false;
				try { rr.result = await runIfCode(v); }
				catch (ex) { if (onCatch(ex)) break; }
			}
			return rr.result;
		})();
		for (const v of mp.values()) {
			rr.capture = false;
			try { rr.result = runIfCode(v); }
			catch (ex) { if (onCatch(ex)) break; }
		}
		return rr.result;
	}
	catch (ex) {
		if (ex instanceof MsjsFlow) throw ex;
		rr.exception = ex;
		if (mp.has('catchers')) for (const [key, value] of mp.at('catchers').entries()) {
			const clob = globalThis[key];
			if (typeof clob !== 'function' || !(ex instanceof clob)) continue;
			if (value?.msjsType !== '@code') return result(value);
			rr.capture = false;
			try { $c.sm(value, 'run'); }
			catch (ex) {
				if (!rr.capture) throw ex;
				if (rr.hasFlowRes) {
					rr.result = rr.flowRes;
					rr.hasFlowRes = rr.flowRes = false;
				}
			}
			return result();
		}
		if (!mp.has('catch')) throw ex;
		const cv = mp.at('catch');
		if (cv?.msjsType !== '@code') return result(cv);
		rr.capture = false;
		try { $c.sm(cv, 'run'); }
		catch (ex) {
			if (!rr.capture) throw ex;
			if (rr.hasFlowRes) {
				rr.result = rr.flowRes;
				rr.hasFlowRes = rr.flowRes = false;
			}
		}
	}
	finally {
		runIfCode(mp.at('always'));
		rr.active = false;
	}
	return result();
}

export function install (name) {
	getInterface(name).set({
		lock: true, pristine: true,
		handlers: {
			atry: opTry,
			eq: (d) => d.rr === d.mp.at(0),
			error: (d) => d.rr.exception,
			message: (d) => d.rr.exception?.message,
			name: (d) => d.rr.exception?.name,
			ne: (d) => d.rr !== d.mp.at(0),
			next: (d) => throwFlow(d, 'next', name),
			result: (d) => d.rr.result,
			return: (d) => { d.rr.result = d.mp.at(0); },
			stop: (d) => throwFlow(d, 'stop', name),
			try: opTry,
		},
	});
}

// END
