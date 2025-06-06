/*
 * Mesgjs @loop interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, runIfCode, setRO, throwFlow } from './runtime.esm.js';
import { NANOS } from './vendor.esm.js';

/*
 * @codeIter(run code times=n collect=boolean)
 * Returns the collected code values or the value from the last iteration.
 */
function opRun (d) {
    const { mp, js } = d;
    const raw = parseInt(mp.at('times', 1), 10), times = Number.isInteger(raw) ? raw : 1, collect = mp.at('collect');
    let result = collect ? new NANOS() : undefined;
    const save = res => { if (collect) result.push(res); else result = res; };
    js.times = times;
    js.active = true;
    try { for (let i = 0; i < times; ++i) {
	js.capture = false;
	js.iteration = i;
	try { save(runIfCode(mp.at(0))); }
	catch (e) {
	    if (!js.capture) throw e;
	    if (js.hasFlowRes) {
		save(js.flowRes);
		js.hasFlowRes = js.flowRes = false;
	    }
	    if (e.message === 'stop') break;
	}
    } } finally { js.active = false; }
    return result;
}

/*
 * @codeIter(while pre=code main post=code collect=boolean)
 * @codeIter(while pre=code main mid=code extraCode post=code
 *   collect=boolean)
 * Returns the collected main values or the one from the last iteration.
 */
function opWhile (d) {
    const { mp, js } = d, ifc = v => (v?.msjsType === '@code') ? v : undefined;
    // Snapshot blocks at start (in theory, they could change during execution)
    const main = mp.at(0), xtra = ifc(mp.at(1)), pre = ifc(mp.at('pre')), mid = xtra && ifc(mp.at('mid')), post = ifc(mp.at('post'));
    // At least one of the pre or post code blocks must be present
    if (!pre && !mid && !post) throw new SyntaxError('(while) test {block!} required');;
    const collect = mp.at('collect');
    let result = collect ? new NANOS() : undefined;
    const save = res => { if (collect) result.push(res); else result = res; };
    const react = e => {
	if (!js.capture) throw e;
	if (js.hasFlowRes) {
	    save(js.flowRes);
	    js.hasFlowRes = js.flowRes = false;
	}
	if (e.message === 'stop') throw e;
	js.capture = false;
    };
    js.times = undefined;
    js.active = true;
    try { for (let i = 0; ; ++i) {
	js.capture = false;
	js.iteration = i;
	try {
	    try { if (pre && !pre('run')) break; } catch (e) { react(e); }
	    try { save(runIfCode(main)); } catch (e) { react(e); }
	    if (xtra) {
		try { if (mid && !mid('run')) break; } catch (e) { react(e); }
		try { xtra('run'); } catch (e) { react(e); }
	    }
	    try { if (post && !post('run')) break; } catch (e) { react(e); }
	} catch (e) {
	    js.active = false;
	    if (!js.capture) throw e;
	    if (e.message === 'stop') break;
	    js.active = true;
	}
    } } finally { js.active = false; }
    return result;
}

/*
 * (num) - 0-based loop number (# completed at start; first: 0)
 * (num1) - 1-based loop number (# completed at end; first: 1)
 * (rem) - # loops remaining at end (last: 0)
 * (rem1) - # loops remaining at start (last: 1)
 * (times) - total # of iterations
 * (next) - skip to the next (step in the) iteration
 * (stop) - stop without further iterations
 */
export function install (name) {
    getInterface(name).set({
	lock: true, pristine: true,
	handlers: {
	    '@init': d => setRO(d.octx, 'js', {}),
	    active: d => !!d.js.active,
	    num: d => d.js.iteration,
	    num1: d => d.js.iteration + 1,
	    next: d => throwFlow(d, 'next', name),
	    rem: d => d.js.times ? (d.js.times - d.js.iteration - 1) : undefined,
	    rem1: d => d.js.times ? (d.js.times - d.js.iteration) : undefined,
	    run: opRun,
	    stop: d => throwFlow(d, 'stop', name),
	    times: d => d.js.times,
	    while: opWhile,
	},
	cacheHints: {
	    while: 'pin',
	},
    });
}

// END
