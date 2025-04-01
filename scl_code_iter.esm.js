/*
 * SysCL @codeIter interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, NANOS, runIfCode, SCLFlow, setRO } from 'syscl/runtime.esm.js';

/*
 * @codeIter(run code times=n collect=boolean)
 * Returns the collected code values or the value from the last iteration.
 */
function opRun (d) {
    const { mp, js } = d;
    const raw = parseInt(mp.at('times', 1)), times = Number.isInteger(raw) ? raw : 1, collect = mp.at('collect');
    let result = collect ? new NANOS() : undefined;
    js.times = times;
    for (let i = 0; i < times; ++i) {
	js.capture = false;
	js.iteration = i;
	try {
	    if (collect) result.push(runIfCode(mp.at(0)));
	    else result = runIfCode(mp.at(0));
	}
	catch (e) {
	    if (!js.capture) throw e;
	    if (e.message === 'stop') break;
	    if (collect) result.push(e.info);
	    else result = e.info;
	}
    }
    return result;
}

/*
 * @codeIter(while pre=code main post=code collect=boolean)
 * @codeIter(while pre=code main mid=code extraCode post=code
 *   collect=boolean)
 * Returns the collected main values or the one from the last iteration.
 */
function opWhile (d) {
    const { mp, js } = d, ifc = v => (v?.sclType === '@code') ? v : undefined;
    // Snapshot blocks at start (in theory, they could change during execution)
    const main = mp.at(0), xtra = ifc(mp.at(1)), pre = ifc(mp.at('pre')), mid = xtra && ifc(mp.at('mid')), post = ifc(mp.at('post'));
    // At least one of the pre or post code blocks must be present
    if (!pre && !mid && !post) return;
    const collect = mp.at('collect'), react = e => {
	if (!js.capture || e.message === 'stop') throw e;
	js.capture = false;
    };
    let result = collect ? new NANOS() : undefined;
    js.times = undefined;
    for (let i = 0; ; ++i) {
	js.capture = false;
	js.iteration = i;
	try {
	    try { if (pre && !pre('run')) break; } catch (e) { react(e); }
	    try {
		if (collect) result.push(runIfCode(main));
		else result = runIfCode(main);
	    } catch (e) {
		react(e);
		if (collect) result.push(e.info);
		else result = e.info;
	    }
	    if (xtra) {
		try { if (mid && !mid('run')) break; } catch (e) { react(e); }
		try { xtra('run'); } catch (e) { react(e); }
	    }
	    try { if (post && !post('run')) break; } catch (e) { react(e); }
	} catch (e) {
	    if (!js.capture) throw e;
	    if (e.message === 'stop') break;
	}
    }
    return result;
}

/*
 * (interation0) - 0-based iteration number (# completed at start)
 * (interation1) - 1-based iteration number (# completed at end)
 * (remaining0) - # iterations remaining at start
 * (remaining1) - # iterations remaining at end
 * (times) - total # of iterations
 * (next) - skip to the next (step in the) iteration
 * (stop) - stop without further iterations
 */
export function installCodeIter () {
    getInterface('@codeIter').set({
	final: true, lock: true, pristine: true,
	handlers: {
	    '@init': d => setRO(d.octx, 'js', {}),
	    iteration0: d => d.js.iteration,
	    iteration1: d => d.js.iteration + 1,
	    next: d => { d.js.capture = true; throw new SCLFlow('next', d.mp.at(0)); },
	    remaining0: d => d.js.times ? (d.js.times - d.js.iteration) : undefined,
	    remaining1: d => d.js.times ? (d.js.times - d.js.iteration - 1) : undefined,
	    run: opRun,
	    stop: d => { d.js.capture = true; throw new SCLFlow('stop'); },
	    times: d => d.js.times,
	    while: opWhile,
	},
    });
}

// END
