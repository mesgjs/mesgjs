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
    const { mp, ps } = d;
    const raw = parseInt(mp.at('times', 1)), times = Number.isInteger(raw) ? raw : 1, collect = mp.at('collect');
    let result = collect ? new NANOS() : undefined;
    ps.times = times;
    for (let i = 0; i < times; ++i) {
	ps.capture = false;
	ps.iteration = i;
	try {
	    if (collect) result.push(runIfCode(mp.at(0)));
	    else result = runIfCode(mp.at(0));
	}
	catch (e) {
	    if (!ps.capture) throw e;
	    if (e.message === 'stop') break;
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
    const { mp, ps } = d, ifc = v => (v?.sclType === '@code') ? v : undefined;
    // Snapshot blocks at start (in theory, they could change during execution)
    const main = mp.at(0), xtra = ifc(mp.at(1)), pre = ifc(mp.at('pre')), mid = xtra && ifc(mp.at('mid')), post = ifc(mp.at('post'));
    // At least one of the pre or post code blocks must be present
    if (!pre && !mid && !post) return;
    const collect = mp.at('collect'), react = e => {
	if (!ps.capture || e.message === 'stop') throw e;
	ps.capture = false;
    };
    let result = collect ? new NANOS() : undefined;
    ps.times = undefined;
    for (let i = 0; ; ++i) {
	ps.capture = false;
	ps.iteration = i;
	try {
	    try { if (pre && !pre('run')) break; } catch (e) { react(e); }
	    try {
		if (collect) result.push(runIfCode(main));
		else result = runIfCode(main);
	    } catch (e) { react(e); }
	    if (xtra) {
		try { if (mid && !mid('run')) break; } catch (e) { react(e); }
		try { xtra('run'); } catch (e) { react(e); }
	    }
	    try { if (post && !post('run')) break; } catch (e) { react(e); }
	} catch (e) {
	    if (!ps.capture) throw e;
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
	    '@init': d => setRO(d.octx, 'ps', {}),
	    iteration0: d => d.ps.iteration,
	    iteration1: d => d.ps.iteration + 1,
	    next: d => { d.ps.capture = true; throw new SCLFlow('next'); },
	    remaining0: d => d.ps.times ? (d.ps.times - d.ps.iteration) : undefined,
	    remaining1: d => d.ps.times ? (d.ps.times - d.ps.iteration - 1) : undefined,
	    run: opRun,
	    stop: d => { d.ps.capture = true; throw new SCLFlow('stop'); },
	    times: d => d.ps.times,
	    while: opWhile,
	},
    });
}

// END
