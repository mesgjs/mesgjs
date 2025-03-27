/*
 * SysCL @listIter interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, isIndex, NANOS, runIfCode, SCLFlow, setRO, unifiedList } from 'syscl/runtime.esm.js';

function common (d, keys) {
    const { mp, ps } = d, collect = mp.at('collect'), list = ps.list, react = e => {
	if (!ps.capture || e.message === 'stop') throw e;
	ps.capture = false;
    };
    let result = collect ? new NANOS() : undefined;
    const save = r => { if (collect) result.push(r); else result = r; };
    const onIndex = mp.at('index'), onNamed = mp.at('named'), onBoth = mp.at(1);
    try {
	for (const k of keys) {
	    ps.capture = false;
	    [ ps.key, ps.value ] = [ k, list.at(k) ];
	    if (isIndex(k)) {
		ps.isIndex = true;
		try { if (onIndex) save(runIfCode(onIndex)); }
		catch (e) { react(e); }
	    } else {
		ps.isIndex = false;
		try { if (onNamed) save(runIfCode(onNamed)); }
		catch (e) { react(e); }
	    }
	    try { if (onBoth) save(runIfCode(onBoth)); } catch (e) { react(e); }
	}
    } catch (e) { if (!ps.capture) throw e; }
    return result;
}

// (for list bothCode index=indexCode named=namedCode collect=boolean)
function opFor (d) {
    const list = d.ps.list = unifiedList(d.mp.at(0));
    return common(d, list.keys());
}

// (rev list bothCode index=indexCode named=namedCode)
function opRev (d) {
    const list = d.ps.list = unifiedList(d.mp.at(0));
    return common(d, [...list.keys()].reverse().values());
}

export function installListIter () {
    getInterface('@listIter').set({
	final: true, lock: true, pristine: true,
	handlers: {
	    '@init': d => setRO(d.octx, 'ps', {}),
	    for: opFor,
	    isIndex: d => d.ps.isIndex,
	    key: d => d.ps.key,
	    next: d => { d.ps.capture = true; throw new SCLFlow('next'); },
	    rev: opRev,
	    stop: d => { d.ps.capture = true; throw new SCLFlow('stop'); },
	    value: d => d.ps.value,
	},
    });
}

// END
