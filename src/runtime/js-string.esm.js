/*
 * Mesgjs @string interface - JS String receiver singleton
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInstance, getInterface, MsjsFunction, runIfCode, setRO, typeAccepts } from './runtime.esm.js';
import { NANOS } from '@nanos';

// (eq value ...)
// Returns @t if target is equal to *any* value
function opEq (d) {
	const { mp, orr } = d;
	let first = true;

	for (const v of mp.values()) {
		const to = first ? v : runIfCode(v);

		first = false;
		if (orr === to) return true;
	}
	return false;
}

// Join strings together with an optional separator
// a(join b c with=-) // a-b-c
function opJoin (d) {
	const { mp, orr } = d, sep = mp.at('with') ?? '', parts = [ orr ];

	for (const v of mp.values()) {
		if (typeof v === 'string') parts.push(v);
		else {
			const part = $c.sm(v, { op: 'toString', else: null });

			if (typeof part === 'string') parts.push(part);
		}
	}
	return parts.join(sep);
}

// Join strings together with the receiver as separator
// ,(joining a b c) // a,b,c
function opJoining (d) {
	const { mp, orr } = d, parts = [];

	for (const v of mp.values()) {
		if (typeof v === 'string') parts.push(v);
		else {
			const part = $c.sm(v, { op: toString, else: null });

			if (typeof part === 'string') parts.push(part);
		}
	}
	return parts.join(orr);
}

function opReplace (d, all = false) {
	const pat = d.mp.at(0, '');
	const rawRep = d.mp.at(1, ''), rep = (rawRep instanceof MsjsFunction) ? replWrapper.bind({ msjsfn: rawRep }) : rawRep;

	return (all ? d.orr.replaceAll(pat, rep) : d.orr.replace(pat, rep));
}

function opSplit (d) {
	const sep = d.mp.at(0, '');

	return new NANOS(d.orr.split(sep, d.mp.at(1)));
}

// JS-to-Msjs replacement-function wrapper
function replWrapper (...args) {
	/*
	 * Transform this rather awkward JS signature to a nice, clean Msjs one
	 * (match, p1, p2, ..., pN, offset, string, groups?)
	 */
	const match = args.shift(), [ groups ] = args.slice(-1), hasG = typeof groups === 'object';
	const [ offset, string ] = args.splice(hasG ? -3 : -2);
	const mp = new NANOS(args, { match, offset, string }, hasG ? { groups: new NANOS(groups) } : []);

	return $c.sm(this.msjsfn, 'call', mp);
}

export function install () {
	getInterface('@string').set({
		final: true, lock: true, pristine: true, singleton: true,
		handlers: {
			'@eq': opEq,
			'@jsv': (d) => d.orr,
			'=': opEq, // eq
			'>=': (d) => d.orr >= d.mp.at(0), // ge
			'>': (d) => d.orr > d.mp.at(0), // gt
			'+': opJoin,
			'-': opJoining,
			'<=': (d) => d.orr <= d.mp.at(0), // le
			'<': (d) => d.orr < d.mp.at(0), // lt
			'!=': (d) => !opEq(d), // ne
			at: (d) => d.orr.at(d.mp.at(0, 0)),
			charAt: (d) => d.orr.charAt(d.mp.at(0, 0)),
			charCodeAt: (d) => d.orr.charCodeAt(d.mp.at(0, 0)),
			codePointAt: (d) => d.orr.codePointAt(d.mp.at(0, 0)),
			endsWith: (d) => d.orr.endsWith(d.mp.at(0, ''), d.mp.at(1, d.orr.length)),
			eq: opEq,
			escRE: (d) => RegExp.escape(d.orr),	// regex-escaped version
			ge: (d) => d.orr >= d.mp.at(0),
			gt: (d) => d.orr > d.mp.at(0),
			includes: (d) => d.orr.includes(d.mp.at(0, '')),
			indexOf: (d) => d.orr.indexOf(d.mp.at(0, ''), d.mp.at(1, 0)),
			isWellFormed: (d) => d.orr.isWellFormed(),
			join: opJoin,
			joining: opJoining,
			lastIndexOf: (d) => d.orr.lastIndexOf(d.mp.at(0, ''), d.mp.at(1, Infinity)),
			le: (d) => d.orr <= d.mp.at(0),
			length: (d) => d.orr.length,
			lt: (d) => d.orr < d.mp.at(0),
			ne: (d) => !opEq(d),
			normalize: (d) => d.orr.normalize(d.mp.at(0, 'NFC')),
			padEnd: (d) => d.orr.padEnd(d.mp.at(0, 0), d.mp.at(1, ' ')),
			padStart: (d) => d.orr.padStart(d.mp.at(0, 0), d.mp.at(1, ' ')),
			re: (d) => new RegExp(d.orr, d.mp.at(0, '')),
			repeat: (d) => d.orr.repeat(d.mp.at(0, 0)),
			replace: (d) => opReplace(d),
			replaceAll: (d) => opReplace(d, true),
			slice: (d) => d.orr.slice(d.mp.at(0, 0), d.mp.at(1, d.orr.length)),
			split: opSplit,
			startsWith: (d) => d.orr.startsWith(d.mp.at(0, ''), d.mp.at(1, 0)),
			substring: (d) => d.orr.substring(d.mp.at(0, 0), d.mp.at(1, d.orr.length)),
			toBigInt: (d) => BigInt(d.orr),
			toFloat: (d) => parseFloat(d.orr),
			toInt: (d) => parseInt(d.orr, d.mp.at(0, 10)),
			toLower: (d) => d.orr.toLowerCase(),
			toString: (d) => d.orr,
			toUpper: (d) => d.orr.toUpperCase(),
			trim: (d) => d.orr.trim(),
			trimEnd: (d) => d.orr.trimEnd(),
			trimStart: (d) => d.orr.trimStart(),
			valueOf: (d) => d.orr,
		},
	});
}

// END
