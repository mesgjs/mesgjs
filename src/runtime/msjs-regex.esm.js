/*
 * Mesgjs @regex interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO, throwFlow } from './runtime.esm.js';

const listize = res => res && new NANOS(res, { groups: res.groups && new NANOS(res.groups) });

function opInit (d) {
    const raw = d.mp.at(0, ''), re = (raw instanceof RegExp) ? raw : new RegExp(raw, d.mp.at(1, ''));
    setRO(d.rr, 'jsv', re);
    setRO(d.octx, 'js', { re });
    setRO(d.js, $c.symbols.instance, d.rr, false);
}

// regex(matchAll string each={block!} else={block!} collect=@f)
function opMatchAll (d) {
    const { js, mp } = d;
    const each = mp.at('each'), ls = mp.at('else'), collect = mp.at('collect');
    delete js.capture;
    delete js.match;
    js.num = -1;			// -1 = no matches (so far)
    let result = collect ? new NANOS() : undefined;
    const save = res => { if (collect) result.push(res); else result = res; };
    js.active = true;
    try {
	for (const match of mp.at(0, '').matchAll(js.re)) {
	    ++js.num;			// 0-based match number
	    if (each?.msjsType === '@code') {
		js.match = listize(match);
		try { save(each('run')); }
		catch (ex) {
		    if (!js.capture) throw ex;
		    if (js.hasFlowRes) {
			save(js.flowRes);
			js.hasFlowRes = js.flowRes = false;
		    }
		    if (ex.message === 'stop') break;
		    delete js.capture;
		}
	    }
	}
	if (js.num < 0 && ls?.msjsType === '@code') {
	    try { save(ls('run')); }
	    catch (ex) {
		if (!js.capture) throw ex;
		if (js.hasFlowRes) {
		    save(js.flowRes);
		    js.hasFlowRes = js.flowRes = false;
		}
	    }
	}
    } finally { js.active = false; }
    return result;
}

export function install () {
    const name = '@regex';
    getInterface(name).set({
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
	    next: d => throwFlow(d, 'next', name),
	    num: d => d.js.num,		// current match number
	    search: d => d.mp.at(0, '').search(d.js.re),
	    setLast: d => { d.js.re.lastIndex = d.mp.at(0, 0); return d.rr; },
	    source: d => d.js.re.source,
	    stop: d => throwFlow(d, 'stop', name),
	    test: d => d.js.re.test(d.mp.at(0, '')),
	},
    });
}

// END

