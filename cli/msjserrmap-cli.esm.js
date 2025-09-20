/*
 * msjserrmap - Map JavaScript error locations back to Mesgjs source
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 */

import { decodeMappings, findSegment } from 'mesgjs/src/decode-source-map.esm.js';

let sourceMap, segments;

for (const arg of Deno.args) {
	if (arg.match(/^\d+:\d+$/)) {
		const [ line, col ] = arg.split(':'), res = segments && findSegment(segments, line, col);
		if (res?.sf !== undefined) console.log(`${line}:${col} => Gen ${res.gl+1}:${res.gc+1} / Src ${res.sl+1}:${res.sc+1} in ${res.sf}: ${sourceMap.sources[res.sf]}`);
		else console.log(`${line}:${col} => No source found`);
	} else if (arg === '--dump') {
		console.dir(Object.entries(segments), { depth: null });
	} else {
		sourceMap = JSON.parse(Deno.readTextFileSync(arg));
		segments = decodeMappings(sourceMap.mappings);
	}
}

// END
