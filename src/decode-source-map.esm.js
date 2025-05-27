import { decode as vldec } from 'mesgjs/vlq.esm.js';

export function decodeMappings (str) {
    const lineSegs = [];
    let gc = 0, sf = 0, sl = 0, sc = 0;

    function expSeg (encSeg) {
	const parts = vldec(encSeg);
	gc += parts[0];
	if (parts.length === 1) return { gc };
	sf += parts[1];
	sl += parts[2];
	sc += parts[3];
	return { gc, sf, sl, sc };
    }

    str.split(';').forEach((segs, lno) => {
	if (segs !== '') {
	    gc = 0;
	    lineSegs[lno] = segs.split(',').map(seg => expSeg(seg));
	}
    });

    return lineSegs;
}

export function findSegment (map, line, col) {
    if (col === undefined) [ line, col ] = line.split(':');
    --line; --col;		// From 1-index to 0-index
    const mapLine = map[line];
    if (!mapLine || mapLine[0].gc > col) {
	// We need to find the last preceding mapping, if any
	for (let prv = line - 1; prv >= 0; --prv) if (map[prv]) return { gl: prv, ...map[prv].at(-1) };
	return;
    }
    // Find the last entry at or before the target column
    let i = mapLine.length;
    while (--i && mapLine[i].gc > col);
    return { gl: line, ...mapLine[i] };
}

// END
