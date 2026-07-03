/*
 * Mesgjs @kvIter (key-value iteration) interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, MsjsObject, runIfCode, setRO, throwFlow, typeAccepts } from './runtime.esm.js';
import { isIndex, NANOS } from '@nanos';
import { unifiedList } from './unified-list.esm.js';

function common (d, keys) {
	const { mp, rr } = d, collect = mp.at('collect'), get = rr.src.get;
	let result = collect ? new NANOS() : undefined, count = 0;
	const save = (r) => { if (collect) result.push(r); else result = r; };
	const react = (e) => {
		if (!rr.capture) throw e;
		if (rr.hasFlowRes) {
			save(rr.flowRes);
			rr.hasFlowRes = rr.flowRes = false;
		}
		if (e.message === 'stop') throw e;
		rr.capture = false;
	};
	const onIndex = mp.at('index'), onNamed = mp.at('named'), split = onIndex || onNamed, onBoth = mp.at(1);

	rr.active = true;
	try {
		if (d.dop === 'afor' || d.dop === 'arev') return (async () => {
			for (const k of keys) {
				rr.capture = false;
				++count;
				if (isIndex(k)) {
					rr.isIndex = true;
					rr.key = parseInt(k, 10);
				} else {
					rr.isIndex = false;
					rr.key = k;
				}
				rr.value = get(k);
				if (split) {
					if (rr.isIndex) {
						try { if (onIndex) save(await runIfCode(onIndex)); }
						catch (e) { react(e); }
					} else {
						try { if (onNamed) save(await runIfCode(onNamed)); }
						catch (e) { react(e); }
					}
				}
				try { if (onBoth) save(await runIfCode(onBoth)); } catch (e) { react(e); }
			}
			if (!count) {
				const ls = d.mp.at('else');
				if (ls) return await runIfCode(ls);
			}
			return result;
		})();
		for (const k of keys) {
			rr.capture = false;
			++count;
			if (isIndex(k)) {
				rr.isIndex = true;
				rr.key = parseInt(k, 10);
			} else {
				rr.isIndex = false;
				rr.key = k;
			}
			rr.value = get(k);
			if (split) {
				if (rr.isIndex) {
					try { if (onIndex) save(runIfCode(onIndex)); }
					catch (e) { react(e); }
				} else {
					try { if (onNamed) save(runIfCode(onNamed)); }
					catch (e) { react(e); }
				}
			}
			try { if (onBoth) save(runIfCode(onBoth)); } catch (e) { react(e); }
		}
		if (!count) {
			const ls = d.mp.at('else');

			if (ls) return runIfCode(ls);
		}
		return result;
	} catch (e) { if (!rr.capture) throw e; }
	finally { rr.active = false; }
}

// Return a key/value interface for whatever object we were given
function getKVI (obj) {
	const ot = typeof obj, mt = MsjsObject.typeOf(obj);
	let keys, get;

	if (ot !== 'object' || obj === null) obj = [obj];
	if (mt) { // Mesgjs object
		if (typeAccepts(mt, 'keyIter')) keys = $c.sm(obj, 'keyIter');
		else if (typeAccepts(mt, 'keys')) keys = $c.sm(obj, 'keys').values();
		if (typeAccepts(mt, 'at')) get = (k) => $c.sm(obj, 'at', [k]);
		else if (typeAccepts(mt, 'get')) get = (k) => $c.sm(obj, 'get', [k]);
	} else { // Something else
		obj = unifiedList(obj);
		if (typeof obj?.keys === 'function') {
			keys = obj.keys();
			if (keys instanceof Array) keys = keys.values();
		} else if (obj?.keys instanceof Array) keys = obj.keys.values();
		if (typeof obj?.at === 'function') get = (key) => obj.at(key);
		else if (typeof obj?.get === 'function') get = (key) => obj.get(key);
		else get = (key) => obj[key];
	}
	keys ||= [].values();
	get ||= () => undefined;
	return { keys, get };
}

// (for src bothCode index=indexCode named=namedCode collect=bool else=value)
// (afor ...)
// Async version - returns a (JS) promise
function opFor (d) {
	const src = d.rr.src = getKVI(d.mp.at(0));
	return common(d, src.keys);
}

// (rev src bothCode index=indexCode named=namedCode)
// (arev ...)
// Async version - returns a (JS) promise
function opRev (d) {
	const src = d.rr.src = getKVI(d.mp.at(0));
	return common(d, [...src.keys].reverse());
}

export function install (name) {
	getInterface(name).set({
		lock: true, pristine: true,
		handlers: {
			active: (d) => !!d.rr.active,
			afor: opFor,
			arev: opRev,
			eq: (d) => d.rr === d.mp.at(0),
			for: opFor,
			isIndex: (d) => d.rr.isIndex,
			key: (d) => d.rr.key,
			ne: (d) => d.rr !== d.mp.at(0),
			next: (d) => throwFlow(d, 'next', name),
			rev: opRev,
			stop: (d) => throwFlow(d, 'stop', name),
			value: (d) => d.rr.value,
		},
	});
}

// END
