/*
 * SysCL @regex interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, NANOS, sclInstance, setRO } from 'syscl/runtime.esm.js';

export const listize = res => res && new NANOS(res, { groups: res.groups && new NANOS(res.groups) });

function opInit (d) {
    const raw = d.mp.at(0, ''), re = (raw instanceof RegExp) ? raw : new RegExp(raw, d.mp.at(1, ''));
    setRO(d.rr, 'jsv', re);
    setRO(d.octx, 'js', { re });
    setRO(d.js, sclInstance, d.rr, false);
}

// regex(matchAll string each={block!} else={block!} collect=@f)
function opMatchAll (d) {
    const each = d.mp.at('each'), ls = d.mp.at('else'), collect = d.mp.at('collect');
    delete d.js.capture;
    delete d.js.match;
    d.js.num = -1;			// -1 = no matches (so far)
    let result = collect ? new NANOS() : undefined;
    const save = res => { if (collect) result.push(res); else result = res; };
    for (const match of d.mp.at(0, '').matchAll(d.js.re)) {
	++d.js.num;			// 0-based match number
	if (each?.sclType === '@code') {
	    d.js.match = listize(match);
	    try { save(each('run')); }
	    catch (ex) {
		if (!d.js.capture) throw ex;
		const info = ex.info;
		if (info?.has?.('result')) save(info.at('result'));
		if (ex.message === 'stop') break;
		delete d.js.capture;
	    }
	}
    }
    if (d.js.num < 0 && ls?.sclType === '@code') {
	try { save(ls('run')); }
	catch (ex) {
	    if (!d.js.capture) throw ex;
	    const info = ex.info;
	    if (info?.has?.('result')) save(info.at('result'));
	}
    }
    return result;
}

export function install () {
    getInterface('@regex').set({
	lock: true, pristine: true,
	handlers: {
	    '@init': opInit,
	    '@jsv': d => d.js.re,
	    exec: d => listize(d.js.re.exec(d.mp.at(0, ''))),
	    flags: d => d.js.re.flags,
	    last: d => d.js.re.lastIndex,
	    match: d => d.js.match,
	    match1: d => listize(d.mp.at(0, '').match(d.js.re)),
	    matchAll: opMatchAll,
	    next: d => { d.js.capture = true; throw new SCLFlow('next', d.mp); },
	    num: d => d.js.num,		// current match number
	    search: d => d.mp.at(0, '').search(d.js.re),
	    setLast: d => { d.js.re.lastIndex = d.mp.at(0, 0); return d.rr; },
	    source: d => d.js.re.source,
	    stop: d => { d.js.capture = true; throw new SCLFlow('stop', d.mp); },
	    test: d => d.js.re.test(d.mp.at(0, '')),
	},
    });
}

// END

