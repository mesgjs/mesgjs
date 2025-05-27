/*
 * Mesgjs @kvIter (key-value iteration) interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, isIndex, NANOS, runIfCode, setRO, throwFlow, typeAccepts } from 'mesgjs/runtime.esm.js';

function common (d, keys) {
    const { mp, js } = d, collect = mp.at('collect'), get = js.src.get;
    let result = collect ? new NANOS() : undefined, count = 0;
    const save = r => { if (collect) result.push(r); else result = r; };
    const react = e => {
	if (!js.capture) throw e;
	if (js.hasFlowRes) {
	    save(js.flowRes);
	    js.hasFlowRes = js.flowRes = false;
	}
	if (e.message === 'stop') throw e;
	js.capture = false;
    };
    const onIndex = mp.at('index'), onNamed = mp.at('named'), split = onIndex || onNamed, onBoth = mp.at(1);
    js.active = true;
    try {
	for (const k of keys) {
	    js.capture = false;
	    ++count;
	    [ js.key, js.value ] = [ k, get(k) ];
	    if (split) {
		if (isIndex(k)) {
		    js.isIndex = true;
		    try { if (onIndex) save(runIfCode(onIndex)); }
		    catch (e) { react(e); }
		} else {
		    js.isIndex = false;
		    try { if (onNamed) save(runIfCode(onNamed)); }
		    catch (e) { react(e); }
		}
	    }
	    try { if (onBoth) save(runIfCode(onBoth)); } catch (e) { react(e); }
	}
	js.active = false;
    } catch (e) { if (!js.capture) throw e; }
    finally { js.active = false; }
    if (!count) {
	const ls = d.mp.at('else');
	if (ls) return runIfCode(ls);
    }
    return result;
}

// Return a key/value interface for whatever object we were given
function getKVI (obj) {
    const ot = typeof obj, st = obj?.msjsType;
    let keys, get;
    if ((ot !== 'object' && ot !== 'function') || obj === null) obj = [obj];
    if (st) {
	if (typeAccepts(st, 'keyIter')) keys = obj('keyIter');
	else if (typeAccepts(st, 'keys')) keys = obj('keys').values();
	if (typeAccepts(st, 'at')) get = k => obj('at', [k]);
	else if (typeAccepts(st, 'get')) get = k => obj('get', [k]);
    } else {
	if (typeof obj?.keys === 'function') {
	    keys = obj.keys();
	    if (Array.isArray(keys)) keys = keys.values();
	} else if (Array.isArray(obj?.keys)) keys = objs.keys.values();
	if (typeof obj?.at === 'function') get = k => obj.at(k);
	else if (typeof obj?.get === 'function') get = k => obj.get(k);
	else get = k => obj[k];
    }
    keys ||= [].values();
    get ||= () => undefined;
    return { keys, get };
}

// (for src bothCode index=indexCode named=namedCode collect=bool else=value)
function opFor (d) {
    const src = d.js.src = getKVI(d.mp.at(0));
    return common(d, src.keys);
}

// (rev src bothCode index=indexCode named=namedCode)
function opRev (d) {
    const src = d.js.src = getKVI(d.mp.at(0));
    return common(d, [...src.keys].reverse());
}

export function install (name) {
    getInterface(name).set({
	lock: true, pristine: true,
	handlers: {
	    '@init': d => setRO(d.octx, 'js', {}),
	    active: d => !!d.js.active,
	    for: opFor,
	    isIndex: d => d.js.isIndex,
	    key: d => d.js.key,
	    next: d => throwFlow(d, 'next', name),
	    rev: opRev,
	    stop: d => throwFlow(d, 'stop', name),
	    value: d => d.js.value,
	},
    });
}

// END
