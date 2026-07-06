/*
 * Mesgjs @reactive receiver singleton interface
 *
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, runIfCode, setRO } from './runtime.esm.js';
import { reactive } from '@reactive';

setRO(globalThis, 'reactive', reactive);

let instType;

// Helper to appropriately execute different types of "def" sources
function jsdef (def) {
	if (def?.$reactive === reactive.type) return def.getter;
	switch (def?.msjsType) {
	case '@code':		return () => $c.sm(def, 'run');
	case '@function':	return $c.sm(def, 'jsfn');
	}
	return def;
}

// Helper to normalize to a plain JS function
function jsfn (fn) {
	switch (fn?.msjsType) {
	case '@code':		return $c.sm($c.sm(fn, 'fn'), 'jsfn');
	case '@function':	return $c.sm(fn, 'jsfn');
	}
	return fn;
}

// Perform a reactive batch operation using a @code block or plain JS function
function opBatch (d) {
	const task = d.mp.at(0);

	if (typeof task === 'function') return reactive.batch(task);
	return reactive.batch(() => runIfCode(task));
}

// (new v? cmp?=cmp def?=def eager?=boolean v?=v)
function opNew (d) {
	const { mp } = d, opts = {};

	if (mp.has('cmp')) opts.cmp = jsfn(mp.at('cmp'));
	if (mp.has('def')) opts.def = jsdef(mp.at('def'));
	if (mp.has('eager')) opts.eager = jseager(mp.at('eager'));
	if (mp.has('v')) opts.v = mp.at('v');
	else if (mp.has(0)) opts.v = mp.at(0);
	return reactive(opts);
}

function opSet (d) {
	const { mp, orr } = d;

	for (const [key, value] of mp.entries()) {
		switch (key) {
		case 'def':
			orr.def = jsdef(value);
			break;
		case 'eager': case 'eager1': case 'eager2':
			orr.eager = value;
			break;
		case 'v': case '0':
			orr.wv = value;
			break;
		}
	}
	return d.orr; // Return instance for chaining
}

function opUnbatch (d) {
	const task = d.mp.at(0);

	if (typeof task === 'function') return reactive.unbatch(task);
	return reactive.unbatch(() => runIfCode(d.mp.at(0)));
}

function opUntr (d) {
	const task = d.mp.at(0);

	if (typeof task === 'function') return reactive.untracked(task);
	return reactive.untracked(() => runIfCode(d.mp.at(0)));
}

// Return a reactive-interface object
const isReactive = (v) => !!reactive.typeOf(v);

function onSet  (n, k, v) { // On NANOS set
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
}

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
		lock: true, pristine: true, singleton: true,
		handlers: {
			'@eq': (d) => d.orr === d.mp.at(0),
			'@jsv': (d) => d.orr,
			batch: opBatch,
			def: (d) => d.orr.def,
			eager: (d) => d.orr.eager,
			eq: (d) => d.orr === d.mp.at(0),
			error: (d) => d.orr.error,
			fv: (d) => reactive.fv(d.orr),
			ne: (d) => d.orr !== d.mp.at(0),
			new: opNew,
			rio: (d) => rio(d.orr),
			rv: (d) => d.orr.rv,
			set: opSet,
			unbatch: opUnbatch,
			unready: (d) => d.orr.unready(),
			untr: opUntr,
			wait: () => reactive.wait(),
		},
	});
}

// END
