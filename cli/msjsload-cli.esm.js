/*
 * msjsloader - Mesgjs module linker/loader
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 *
 * --cat - Module catalog database
 * --html - Wrap in a simple HTML page template
 * --out - Output file
 */

import { parseArgs } from 'jsr:@std/cli/parse-args';
import { DB } from 'https://deno.land/x/sqlite/mod.ts';
import { checkTables, getModule, getVersions } from 'mesgjs/msjs-catalog-lite.esm.js';
import { compareModVer, parseModVer, SemVerRanges } from 'mesgjs/semver.esm.js';
import { parseSLID } from 'nanos/nanos.esm.js';
import Logic from 'npm:logic-solver';

const solver = new Logic.Solver();
const flags = parseArgs(Deno.args, {
    boolean: [ 'ext', 'html' ],
    string: [ 'cat', 'out' ],
});

const dbExt = s => s.endsWith('.msjcat') ? s : (s + '.msjcat');
const dbFile = dbExt(flags.cat || 'modules');
const db = new DB(dbFile);

// Module mapping (path <=> mid)
let nextMid = 0;
const _midToMod = {}, _modToMid = {};
const _modCache = {};

// Requirements-to-encode queue (set of modpath@version)
const requ = new Set();
const modVers = {}, weights = [];

function computeWeights () {
    for (const mod of Object.keys(modVers)) {
	const mid = modToMid(mod);
	for (const en of modVers[mod].std.map(v => {
	    const p = parseModVer(v);
	    return [ p.major, p.minor, p.patch ];
	  }).sort((a, b) => compareModVer(b, a)).
	  map((va, i) => [ mid + '@' + va.join('.'), i ])) {
	    weights[en[0]] = en[1];
	}
    }
}

// Encode the specified requirements
// module spec; module spec; ...
function encodeReqs (reqs, label) {
    const all = [];
    for (const modSpec of reqs.split(';')) {
	const [ , mod, spec ] = modSpec.match(/\s*(\S+)\s+(.*)/);
	const mid = modToMid(mod), ranges = new SemVerRanges(spec), majors = ranges.majors(), any = [];
	// For each allowed module major, allow each in-range module version
	for (const major of majors) for (const ver of getVersions(db, mod, major, flags.ext)) if (ranges.inRange(ver)) {
	    any.push(`${mid}@${ver}`);
	    requ.add(`${mod}@${ver}`);		// Schedule if new mod@ver
	}
	if (!any.length) throw new Error(`No module ${mod} version satisfies "${spec.trim()}" for ${label}`);
	all.push(Logic.or(...any));
    }
    return (all.length ? Logic.and(...all) : Logic.TRUE);
}

function link (main, code) {
    solver.require(encodeReqs(main, 'entry point'));
    // Quasi-"trampoline" until all requirements have been encoded
    for (const item of requ.keys()) solver.require(Logic.implies(modToMid(item), encodeReqs(getModule(db, item).modreq, item)));

    // Constrain to at most one version of each module
    for (const item of requ.keys()) {
	const [ , mod, ver ] = item.match(/(.*)@(.*)/);
	modVers[mod] ||= { std: [], ext: [] };
	if (/[+-]/.test(ver)) modVers[mod].ext.push(ver);
	else modVers[mod].std.push(ver);
    }
    for (const mod of Object.keys(modVers)) {
	const mid = modToMid(mod);
	solver.require(Logic.atMostOne(...([...modVers[mod].std, ...modVers[mod].ext].map(v => mid + '@' + v))));
    }

    // Look for any solution
    const trial = solver.solve();
    if (!trial) throw new Error('Unable to resolve all dependencies');

    // Try to optimize using newest module versions
    computeWeights();
    const final = solver.minimizeWeightedSum(trial, Object.keys(weights), Object.values(weights));

    console.log('Module dependency resolution:');
    for (const midver of final.getTrueVars()) {
	const [ , mid, ver ] = midver.match(/(.*)@(.*)/);
	console.log(midToMod(mid) + '@' + ver);
    }

    if (code) { /* */ }
}

// Map module id to module
function midToMod (mid) { return _midToMod[mid]; }

// Map module to module id (passing optional version)
function modToMid (mod) {
    const mat = mod.match(/(.*)(@\d+\.\d+\..*)/);
    if (mat) mod = mat[1];
    if (!_modToMid[mod]) _midToMod[_modToMid[mod] = 'M' + (nextMid++).toString(36)] = mod;
    return _modToMid[mod] + (mat ? mat[2] : '');
}

checkTables(db);

const main = flags._[0];
if (!main) throw new Error(`Main entry point module or .msjs file required as first parameter`);
if (main.endsWith('.msjs') || main.endsWith('.esm.js')) {
    const jsFile = main.replace(/\.msjs$/, '.esm.js');
    const slidFile = main.replace(/\.esm\.js$|\.msjs$/, '.slid');
    const js = Deno.readTextFileSync(jsFile);
    const meta = parseSLID(Deno.readTextFileSync(slidFile));
    try {
	solver.require(encodeReqs(meta.at('modreq', ''), 'entry point'));
	link(meta.at('modreq', ''), js);
    } catch (e) {
	console.log('Error:', e.message);
    }
} else {
    try {
	solver.require(encodeReqs(main, 'entry point'));
	link(main);
    } catch (e) {
	console.log('Error:', e.message);
    }
}

// END
