/*
 * msjserrmap - Map JavaScript error locations back to Mesgjs source
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 */

import { exit, getEnv } from '@compat/runtime';
import { args as getArgs } from '@compat/cli';
import { readTextFileSync } from '@compat/file';
import { decodeMappings, findSegment } from 'mesgjs/src/decode-source-map.esm.js';

try {
	const rawArgs = getArgs();
	let sourceMap, segments;

	for (const arg of rawArgs) {
		if (arg.match(/^\d+:\d+$/)) {
			const [ line, col ] = arg.split(':'), res = segments && findSegment(segments, line, col);
			if (res?.sf !== undefined) console.log(`${line}:${col} => Gen ${res.gl+1}:${res.gc+1} / Src ${res.sl+1}:${res.sc+1} in ${res.sf}: ${sourceMap.sources[res.sf]}`);
			else console.log(`${line}:${col} => No source found`);
		} else if (arg === '--dump') {
			console.dir(Object.entries(segments || {}), { depth: null });
		} else {
			sourceMap = JSON.parse(readTextFileSync(arg));
			segments = decodeMappings(sourceMap.mappings);
		}
	}
} catch (err) {
	let debug = false;
	try {
		debug = Boolean(getEnv()?.DEBUG);
	} catch {
		// Ignore if env permission is not granted
	}

	if (debug) throw err;
	console.error(`Error: ${err.message}`);
	exit(1);
}

// END
