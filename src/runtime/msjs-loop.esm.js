/*
 * Mesgjs @loop interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, runIfCode, MsjsCode, setRO, throwFlow } from './runtime.esm.js';
import { NANOS } from '@nanos';

/*
 * @codeIter(run code times=n collect=boolean)
 * Returns the collected code values or the value from the last iteration.
 * @codeIter(arun code times=n collect=boolean)
 * Async version - works the same way but returns a (JS) promise.
 */
function opRun (d) {
	const { mp, rr } = d;
	const raw = parseInt(mp.at('times', 1), 10);
	const times = Number.isInteger(raw) ? raw : 1;
	const collect = mp.at('collect');
	let result = collect ? new NANOS() : undefined;
	const save = (res) => { if (collect) result.push(res); else result = res; };
	const onCatch = (e) => {
		if (!rr.capture) throw e;
		if (rr.hasFlowRes) {
			save(rr.flowRes);
			rr.hasFlowRes = rr.flowRes = false;
		}
		return e.message === 'stop';
	};

	rr.times = times;
	rr.active = true;
	try {
		if (d.dop === 'arun') return (async () => {
			for (let i = 0; i < times; ++i) {
				rr.capture = false;
				rr.iteration = i;
				try { save(await runIfCode(mp.at(0))); }
				catch (e) { if (onCatch(e)) break; }
			}
			return result;
		})();
		for (let i = 0; i < times; ++i) {
			rr.capture = false;
			rr.iteration = i;
			try { save(runIfCode(mp.at(0))); }
			catch (e) { if (onCatch(e)) break; }
		}
		return result;
	} finally { rr.active = false; }
}

/*
 * @codeIter(while pre=code main post=code collect=boolean)
 * @codeIter(while pre=code main mid=code extraCode post=code
 *	 collect=boolean)
 * Returns the collected main values or the one from the last iteration.
 * @codeIter(awhile ...)
 * Async version - works the same way, but returns a (JS) promise.
 */
function opWhile (d) {
	const { mp, rr } = d;
	const ifc = (v) => (v instanceof MsjsCode) ? v : undefined;
	// Snapshot blocks at start (in theory, they could change during execution)
	const main = mp.at(0), xtra = ifc(mp.at(1)), pre = ifc(mp.at('pre')), mid = xtra && ifc(mp.at('mid')), post = ifc(mp.at('post'));
	// At least one of the pre or post code blocks must be present
	if (!pre && !mid && !post) throw new SyntaxError('(while) test {block!} required');;
	const collect = mp.at('collect');
	let result = collect ? new NANOS() : undefined;
	const save = (res) => { if (collect) result.push(res); else result = res; };
	const react = (e) => {
		if (!rr.capture) throw e;
		if (rr.hasFlowRes) {
			save(rr.flowRes);
			rr.hasFlowRes = rr.flowRes = false;
		}
		if (e.message === 'stop') throw e;
		rr.capture = false;
	};
	const onCatch = (e) => {
		rr.active = false;
		if (!rr.capture) throw e;
		if (e.message === 'stop') return true;
		rr.active = true;
		return false;
	};

	rr.times = undefined;
	rr.active = true;
	try {
		if (d.dop === 'awhile') return (async () => {
			for (let i = 0; ; ++i) {
				rr.capture = false;
				rr.iteration = i;
				try {
					try { if (pre && !await $c.sm(pre, 'run')) break; } catch (e) { react(e); }
					try { save(await runIfCode(main)); } catch (e) { react(e); }
					if (xtra) {
						try { if (mid && !await $c.sm(mid, 'run')) break; } catch (e) { react(e); }
						try { await $c.sm(xtra, 'run'); } catch (e) { react(e); }
					}
					try { if (post && !await $c.sm(post, 'run')) break; } catch (e) { react(e); }
				} catch (e) { if (onCatch(e)) break; }
			}
			return result;
		})();
		for (let i = 0; ; ++i) {
			rr.capture = false;
			rr.iteration = i;
			try {
				try { if (pre && !$c.sm(pre, 'run')) break; } catch (e) { react(e); }
				try { save(runIfCode(main)); } catch (e) { react(e); }
				if (xtra) {
					try { if (mid && !$c.sm(mid, 'run')) break; } catch (e) { react(e); }
					try { $c.sm(xtra, 'run'); } catch (e) { react(e); }
				}
				try { if (post && !$c.sm(post, 'run')) break; } catch (e) { react(e); }
			} catch (e) { if (onCatch(e)) break; }
		}
		return result;
	} finally { rr.active = false; }
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
			active: (d) => !!d.rr.active,
			arun: opRun,
			awhile: opWhile,
			eq: (d) => d.rr === d.mp.at(0),
			ne: (d) => d.rr !== d.mp.at(0),
			num: (d) => d.rr.iteration,
			num1: (d) => d.rr.iteration + 1,
			next: (d) => throwFlow(d, 'next', name),
			rem: (d) => d.rr.times ? (d.rr.times - d.rr.iteration - 1) : undefined,
			rem1: (d) => d.rr.times ? (d.rr.times - d.rr.iteration) : undefined,
			run: opRun,
			stop: (d) => throwFlow(d, 'stop', name),
			times: (d) => d.rr.times,
			while: opWhile,
		},
		cacheHints: {
			while: 'pin',
		},
	});
}

// END
