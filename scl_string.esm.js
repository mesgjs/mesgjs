/*
 * SysCL @string interface
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInstance, getInterface, jsToSCL, NANOS, setRO, typeAccepts } from 'syscl/runtime.esm.js';

// Join strings together with an optional separator
// a(join b c with=-) // a-b-c
function opJoin (d) {
    const { mp, js } = d, sep = mp.at('with') ?? '', parts = [ js ];
    for (const v of mp.values()) {
	const so = jsToSCL(v);
	if (typeAccepts(so.sclType, 'toString')) parts.push(so('toString'));
    }
    return parts.join(sep);
}

// Join strings together with the receiver as separator
// ,(joining a b c) // a,b,c
function opJoining (d) {
    const { mp, js } = d, parts = [];
    for (const v of mp.values()) {
	const so = jsToSCL(v);
	if (typeAccepts(so.sclType, 'toString')) parts.push(so('toString'));
    }
    return parts.join(js);
}

function opReplace (d, all = false) {
    const rawPat = d.mp.at(0, ''), pat = (rawPat?.sclType === '@regex')? rawPat.jsv : rawPat;
    const rawRep = d.mp.at(1, ''), rep = (rawRep?.sclType === '@function') ? replWrapper.bind({ sclfn: rawRep }) : rawRep;
    return (all ? d.js.replaceAll(pat, rep) : d.js.replace(pat, rep));
}

function opSplit (d) {
    const rawSep = d.mp.at(0, ''), sep = (rawSep?.sclType === '@regex') ? rawSep.jsv : rawSep;
    return d.js.split(sep, d.mp.at(1, Infinity));
}

// JS-to-SCL replacement-function wrapper
function replWrapper (...args) {
    /*
     * Transform this rather awkward JS signature to a nice, clean SCL one
     * (match, p1, p2, ..., pN, offset, string, groups?)
     */
    const match = args.shift(), [ groups ] = args.slice(-1), hasG = typeof groups === 'object';
    const [ offset, string ] = args.splice(hasG ? -3 : -2);
    const mp = new NANOS(args, { match, offset, string }, hasG ? { groups: new NANOS(groups) } : []);
    return this.sclfn('call', mp);
}

export function install () {
    getInterface('@string').set({
	final: true, lock: true, pristine: true,
	handlers: {
	    '@init': d => setRO(d.octx, 'js', d.mp.at(0, '').toString()),
	    '@jsv': d => d.js,
	    at: d => d.js.at(d.mp.at(0, 0)),
	    charAt: d => d.js.charAt(d.mp.at(0, 0)),
	    charCodeAt: d => d.js.charCodeAt(d.mp.at(0, 0)),
	    codePointAt: d => d.js.codePointAt(d.mp.at(0, 0)),
	    endsWith: d => d.js.endsWith(d.mp.at(0, ''), d.mp.at(1, d.js.length)),
	    eq: d => d.js === d.mp.at(0),
	    escRE: d => RegExp.escape(d.js),	// regex-escaped version
	    ge: d => d.js >= d.mp.at(0),
	    gt: d => d.js > d.mp.at(0),
	    includes: d => d.js.includes(d.mp.at(0, '')),
	    indexOf: d => d.js.indexOf(d.mp.at(0, ''), d.mp.at(1, 0)),
	    isWellFormed: d => d.js.isWellFormed(),
	    join: opJoin,
	    joining: opJoining,
	    lastIndexOf: d => d.js.lastIndexOf(d.mp.at(0, ''), d.mp.at(1, Infinity)),
	    le: d => d.js <= d.mp.at(0),
	    length: d => d.js.length,
	    lt: d => d.js < d.mp.at(0),
	    ne: d => d.js !== d.mp.at(0),
	    normalize: d => d.js.normalize(d.mp.at(0, 'NFC')),
	    padEnd: d => d.js.padEnd(d.mp.at(0, 0), d.mp.at(1, ' ')),
	    padStart: d => d.js.padStart(d.mp.at(0, 0), d.mp.at(1, ' ')),
	    regex: d => getInstance('@regex', [ d.js, d.mp.at(0, '') ]),
	    repeat: d => d.js.repeat(d.mp.at(0, 0)),
	    replace: d => opReplace(d),
	    replaceAll: d => opReplace(d, true),
	    slice: d => d.js.slice(d.mp.at(0, 0), d.mp.at(1, d.js.length)),
	    split: opSplit,
	    startsWith: d => d.js.startsWith(d.mp.at(0, ''), d.mp.at(1, 0)),
	    toLower: d => d.js.toLowerCase(),
	    toString: d => d.js,
	    toUpper: d => d.js.toUpperCase(),
	    trim: d => d.js.trim(),
	    trimEnd: d => d.js.trimEnd(),
	    trimStart: d => d.js.trimStart(),
	    valueOf: d => d.js,
	},
	cacheHints: {
	    '@init': 'pin',
	},
    });
}

// END
