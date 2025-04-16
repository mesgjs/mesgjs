/*
 * SysCL @listIter interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, isIndex, NANOS, runIfCode, SCLFlow, setRO, unifiedList } from 'syscl/runtime.esm.js';

function common (d, keys) {
    const { mp, js } = d, collect = mp.at('collect'), list = js.list;
    let result = collect ? new NANOS() : undefined;
    const save = r => { if (collect) result.push(r); else result = r; };
    const react = e => {
	if (!js.capture) throw e;
	const info = e.info;
	if (info?.has?.('result')) save(info.at('result'));
	if (e.message === 'stop') throw e;
	js.capture = false;
    };
    const onIndex = mp.at('index'), onNamed = mp.at('named'), onBoth = mp.at(1);
    try {
	for (const k of keys) {
	    js.capture = false;
	    [ js.key, js.value ] = [ k, list.at(k) ];
	    if (isIndex(k)) {
		js.isIndex = true;
		try { if (onIndex) save(runIfCode(onIndex)); }
		catch (e) { react(e); }
	    } else {
		js.isIndex = false;
		try { if (onNamed) save(runIfCode(onNamed)); }
		catch (e) { react(e); }
	    }
	    try { if (onBoth) save(runIfCode(onBoth)); } catch (e) { react(e); }
	}
    } catch (e) { if (!js.capture) throw e; }
    return result;
}

// (for list bothCode index=indexCode named=namedCode collect=boolean)
function opFor (d) {
    const list = d.js.list = unifiedList(d.mp.at(0));
    return common(d, list.keys());
}

// (rev list bothCode index=indexCode named=namedCode)
function opRev (d) {
    const list = d.js.list = unifiedList(d.mp.at(0));
    return common(d, [...list.keys()].reverse().values());
}

export function install (name) {
    getInterface(name).set({
	lock: true, pristine: true,
	handlers: {
	    '@init': d => setRO(d.octx, 'js', {}),
	    for: opFor,
	    isIndex: d => d.js.isIndex,
	    key: d => d.js.key,
	    next: d => { d.js.capture = true; throw new SCLFlow('next', d.mp); },
	    rev: opRev,
	    stop: d => { d.js.capture = true; throw new SCLFlow('stop', d.mp); },
	    value: d => d.js.value,
	},
    });
}

// END
