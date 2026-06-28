/*
 * Mesgjs @timestamp Interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, runIfCode } from './runtime.esm.js';

// (elapsed {block})
// Returns elapsed time in msec to execute the block
function opElapsed (d) {
	const startTime = Date.now();

	runIfCode(d.mp.at(0));

	return Date.now() - startTime;
}

// (fromUTCYMDHMS year month day hour minute second)
// Returns the timestamp
function opFromUTCYMDHMS (d) {
	const [yr, mon, day, hr, min, sec] = [0, 1, 2, 3, 4, 5].map((n) => d.mp.at(n));

	return Date.UTC(yr, mon - 1, day, hr, min, sec);
}

// (toUTCYMDHMS timestamp)
// Returns [year month day hour minute second msec dow]
function opToUTCYMDHMS (d) {
	const time = new Date(d.mp.at(0));

	return new NANOS([
		time.getUTCFullYear(),
		time.getUTCMonth() + 1,
		time.getUTCDate(),
		time.getUTCHours(),
		time.getUTCMinutes(),
		time.getUTCSeconds(),
		time.getUTCMilliseconds(),
		time.getUTCDay(),
	]);
}

export function install (name) {
	getInterface(name).set({
		final: true, lock: true, pristine: true, singleton: true,
		handlers: {
			elapsed: opElapsed,
			fromISOString: (d) => Date.parse(d.mp.at(0)),
			fromUTCYMDHMS: opFromUTCYMDHMS,
			now: () => Date.now(),
			toISOString: (d) => new Date(d.mp.at(0)).toISOString(),
			toUTCYMDHMS: opToUTCYMDHMS,
		},
	});
}
