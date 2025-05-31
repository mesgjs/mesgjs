/*
 * Simple SemVer (semantic version) support for Mesgjs
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 */

// Compare two major/minor/patch version arrays, returning -, 0, or +.
export function compareModVer (v1, v2) {
    return ((v1[0] - v2[0]) || (v1[1] - v2[1]) || (v1[2] - v2[2]));
}

// Parse an array of (maybe) strings into an array of integers.
function parseEach (...a) {
    return [...a].map(s => (typeof s !== 'string') ? s : parseInt(s, 10));
}

// Parse module@version string into components
export function parseModVer (mod) {
    let [ , path, major, minor, patch, extver ] = mod.match(/\s*(?:(.*)@)?(\d+)\.(\d+)\.(\d+)([+-]\S+)?/) || [];
    [ major, minor, patch ] = parseEach(major, minor, patch);
    return { path, major, minor, patch, extver };
}

export class SemVerRanges {
    constructor (str) {
	this._majors = new Set();
	this._ranges = [];
	if (str) this.parse(str);
    }

    // Is a (string) version within the range(s)?
    // (Extended versions must match exactly.)
    inRange (ver) {
	let [ , major, minor, patch, extver ] = ver.match(/(\d+)\.(\d+)\.(\d+)([-+].*)?/);
	[major, minor, patch] = parseEach(major, minor, patch);
	if (extver) return this._ranges.some(r => r[0] === '=' && r[1] === major && r[2] === minor && r[3] === patch && r[4] === extver);
	const va = [ major, minor, patch ];
	for (const r of this._ranges) {
	    if (r[0] === '-' && compareModVer([r[1], r[2], r[3]], va) <= 0 && compareModVer(va, [r[4], r[5], r[6]]) < 0) return true;
	}
	return false;
    }

    // Array of major versions encountered
    majors () { return [...this._majors.keys()]; }

    // part, part, ...
    // major.minor.patch[+-]extver - exact match on extended version
    // major1.minor1.patch1<major2.minor2.patch2 - a range [mmp1, mmp2)
    // (all parts after major1 optional)
    parse (str) {
	for (const part of str.split(',')) {
	    let [ , major1, minor1, patch1, extver, major2, minor2, patch2 ] = part.match(/^\s*(\d+)(?:\.(\d+)(?:\.(\d+)([-+][\w\.+-]+)?)?)?\s*(?:<\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?)?\s*$/) || [];
	    [major1, minor1, patch1, major2, minor2, patch2] = parseEach(major1, minor1, patch1, major2, minor2, patch2);
	    if (major1 === undefined) continue;
	    if (extver !== undefined) {
		this._majors.add(major1);
		this._ranges.push(['=', major1, minor1, patch1, extver]);
		continue;
	    }
	    minor1 ??= 0;
	    patch1 ??= 0;
	    major2 ??= major1 + 1;
	    minor2 ??= 0;
	    patch2 ??= 0;
	    if (major2 < major1 || (major2 === major1 && ((minor2 < minor1) || (minor2 === minor1 && patch2 <= patch1)))) throw new RangeError(`Invalid version range ${part}`);
	    for (let major = (minor2 || patch2) ? major2 : (major2 - 1); major >= major1; --major) this._majors.add(major);
	    this._ranges.push(['-', major1, minor1, patch1, major2, minor2, patch2]);
	}
    }
}

// END
