/*
 * Mesgjs @regex interface - JS RegExp receiver singleton
 * Mesgjs @rematch interface - matchAll iterator
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO, throwFlow } from './runtime.esm.js';

const listize = (res) => res && new NANOS(res, { groups: res.groups && new NANOS(res.groups) });

// rematch(matchAll regex string each={block!} else={block!} collect=@f)
function opMatchAll (d) {
	const { mp, rr } = d;
	const regex = mp.at(0), string = mp.at(1, '');
	const each = mp.at('each'), ls = mp.at('else'), collect = mp.at('collect');
	const eachIsCode = each?.msjsType === '@code';

	if (!(regex instanceof RegExp)) throw new TypeError('Missing regular expression parameter');
	rr.capture = false;
	rr.match = undefined;
	rr.num = -1;						// -1 = no matches (so far)
	rr.regex = regex;

	let result = collect ? new NANOS() : undefined;
	const save = res => { if (collect) result.push(res); else result = res; };

	rr.active = true;
	try {
		for (const match of string.matchAll(regex)) {
			++rr.num;					// 0-based match number
			if (eachIsCode) {
				rr.match = listize(match);
				try { save($c.sm(each, 'run')); }
				catch (ex) {
					if (!rr.capture) throw ex;
					if (rr.hasFlowRes) {
						save(rr.flowRes);
						rr.hasFlowRes = rr.flowRes = false;
					}
					if (ex.message === 'stop') break;
					rr.capture = false;
				}
			}
		}
		if (rr.num < 0 && ls?.msjsType === '@code') {
			try { save($c.sm(ls, 'run')); }
			catch (ex) {
				if (!rr.capture) throw ex;
				if (rr.hasFlowRes) {
					save(rr.flowRes);
					rr.hasFlowRes = rr.flowRes = false;
				}
			}
		}
	} finally { rr.active = false; }
	return result;
}

export function install () {
	const regex = '@regex';
	const rematch = '@rematch';

	getInterface(regex).set({
		lock: true, pristine: true, singleton: true,
		handlers: {
			'@eq': (d) => d.orr === d.mp.at(0),
			'@jsv': (d) => d.orr,
			eq: (d) => d.orr === d.mp.at(0),
			exec: (d) => listize(d.orr.exec(d.mp.at(0, ''))),
			flags: (d) => d.orr.flags,
			last: (d) => d.orr.lastIndex,
			match1: (d) => listize(d.mp.at(0, '').match(d.orr)),
			ne: (d) => d.orr !== d.mp.at(0),
			search: (d) => d.mp.at(0, '').search(d.orr),
			setLast: (d) => { if (d.orr instanceof RegExp) d.orr.lastIndex = d.mp.at(0, 0); return d.orr; },
			source: (d) => d.orr.source,
			test: (d) => d.orr.test(d.mp.at(0, '')),
		},
	});

	getInterface(rematch).set({
		lock: true, pristine: true,
		handlers: {
			last: (d) => d.rr.regex?.last,
			next: (d) => throwFlow(d, 'next', rematch),
			match: (d) => d.rr.match,
			matchAll: opMatchAll,
			num: (d) => d.rr.num,			// current match number
			setLast: (d) => { if (d.rr.regex instanceof RegExp) d.rr.regex.lastIndex = d.mp.at(0, 0); return d.rr; },
			stop: (d) => throwFlow(d, 'stop', rematch),
		},
	});
}

// END

