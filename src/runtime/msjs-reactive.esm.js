/*
 * Mesgjs @reactive interface
 *
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, runIfCode, setRO } from './runtime.esm.js';
import { reactive } from './vendor.esm.js';

setRO(globalThis, 'reactive', reactive);

let instType;

function jsdef (def) {
	switch (def?.msjsType) {
	case '@code':		return () => def('run');
	case '@function':	return def('jsfn');
	case instType:		return def('@jsv').getter;
	default:			return def;
	}
}

function jsfn (fn) {
	switch (fn?.msjsType) {
	case '@code':		return fn('fn')('jsfn');
	case '@function':	return fn('jsfn');
	default:			return fn;
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
	setRO(d.js, $c.symbols.instance, d.rr, false);
	setRO(d.rr, { jsv: d.js, valueOf: () => d.js });
}

// Perform a reactive batch operation using a @code block or plain JS function
function opBatch (d) {
	const task = d.mp.at(0);
	if (typeof task !== 'function') return;
	if (task.msjsType) return reactive.batch(() => runIfCode(task));
	return reactive.batch(task);
}

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
	return d.rr; // Return instance for chaining
}

function opUntr (d) { return reactive.untracked(() => runIfCode(d.mp.at(0))); }

// Return a reactive-interface object
const isReactive = (v) => !!reactive.typeOf(v);
const onSet = (n, k, v) => { // On NANOS set
	const curVal = n.atRaw(k), curIsR = isReactive(curVal), newIsR = isReactive(v);
	if (curIsR) {
		// Current value is reactive.
		if (newIsR) curVal.def = v; // Tracking-chain of reactive values
		else curVal.wv = v; // Plain reactive value
		return curVal; // The reactive itself does not get replaced
	}
	if (n.options.autoReactive) {
		// Automatically make new values reactive based on NANOS option
		const r = reactive();
		if (newIsR) r.def = v;
		else r.wv = v;
		return r;
	}
	// Keep original value
	return v;
};
function rio (r) {
	if (!r) r = reactive();
	return {
		// Basic (reactive packaging)
		batch: reactive.batch,
		changed: () => r.ripple(),
		create: rio,
		depend: () => r.rv,
		// Extended (reactive values)
		get: (v) => v.rv,
		isReactive,
		onSet,
	};
}

export function install (name) {
	instType = name;
	getInterface(name).set({
		lock: true, pristine: true,
		handlers: {
			'@init': opInit,
			'@jsv': (d) => d.js,
			batch: opBatch,
			def: (d) => d.js.def,
			eager: (d) => d.js.eager,
			error: (d) => d.js.error,
			fv: (d) => reactive.fv(d.js),
			rio: (d) => rio(d.js),
			rv: (d) => d.js.rv,
			set: opSet,
			unready: (d) => d.js.unready(),
			untr: opUntr,
			wait: (d) => reactive.wait(),
		},
	});
}

// END
