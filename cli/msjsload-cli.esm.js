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
import { checkTables, getModule, getVersions, mapPath } from 'mesgjs/module-catalog-lite.esm.js';
import { compareModVer, parseModVer as pmv, SemVerRanges } from 'mesgjs/semver.esm.js';
import { escapeJSString as escJSStr } from 'escape-js/escape.esm.js';
import { NANOS, parseSLID } from 'nanos/nanos.esm.js';
import Logic from 'npm:logic-solver';

const solver = new Logic.Solver();
const flags = parseArgs(Deno.args, {
    boolean: [ 'ext', 'html' ],
    string: [ 'cat', 'out' ],
});

const dbExt = s => s.endsWith('.msjcat') ? s : (s + '.msjcat');
const dbFile = dbExt(flags.cat || 'modules');
let db;

// Module mapping (path <=> mid)
let nextMid = 0;
const _midToMod = {}, _modToMid = {};
const _modCache = {};

// Requirements-to-encode queue (set of modpath@version)
const requ = new Set();
const modVers = {}, weights = [];

// Weight module versions to prefer newer versions
function computeWeights () {
    for (const mod of Object.keys(modVers)) {
	const mid = modToMid(mod);
	for (const en of modVers[mod].std.map(v => {
	    const { major, minor, patch } = pmv(v);
	    return [ major, minor, patch ];
	  }).sort((a, b) => compareModVer(b, a)).
	  map((va, i) => [ mid + '@' + va.join('.'), i ])) {
	    weights[en[0]] = en[1];
	}
    }
}

// Encode the specified requirements
// module spec; module spec; ...
function encodeReqs (reqs, label) {
    if (typeof reqs === 'string') reqs = getModSpec(reqs);
    const all = [];
    for (const modSpec of reqs || []) {
	const [ , mod, spec ] = modSpec.match(/\s*(\S+)\s+(.*)/);
	const mid = modToMid(mod), ranges = new SemVerRanges(spec), majors = ranges.majors(), any = [];
	// For each allowed module major, allow each in-range module version
	for (const major of majors) for (const ver of getVersions(db, mod, major, flags.ext)) if (ranges.inRange(ver)) {
	    any.push(`${mid}@${ver}`);
	    requ.add(`${mod}@${ver}`);		// Schedule if new mod@ver
	}
	if (any.length) all.push(Logic.or(...any));
	else {
	    console.error(`Error: No module ${mod} version satisfies "${spec.trim()}" for ${label}`);
	    all.push(Logic.FALSE);
	}
    }
    return (all.length ? Logic.and(...all) : Logic.TRUE);
}

// Return the JS import map in JSON format
function getJSImportMap () {
    return JSON.stringify({ imports: Object.fromEntries([
	'mesgjs/runtime/',
    ].map(path => [ path, mapPath(db, path) ])) });
}

// Return Mesgjs module metadata
function getModMeta (finalMods, meta) {
    const prefixMap = { '': '' }, modules = {};
    for (const mod of finalMods) {
	const { module, version } = pmv(mod), { integrity, featpro } = getModule(db, mod, true), meta = { integrity, version };
	if (featpro) meta.featpro = featpro.split(/[,\s]+/).filter(f => f);
	const [ url, mapping ] = mapPath(db, module, { detail: true, version });
	if (!mapping) meta.url = url;
	else prefixMap[mapping[0]] ||= mapping[1];
	modules[module] = meta;
    }
    delete prefixMap[''];

    if (meta instanceof NANOS) for (const mod of getModSpec(meta.at('deferLoad', []), 'deferLoad') || []) if (modules[mod]) modules[mod].deferLoad = true;
    return { prefixMap, modules };
}

// Return (;-separated, if string) list of module requirements (or defers)
function getModSpec (spec, group = 'modreq') {
    if (spec instanceof NANOS) {
	spec = spec.at(group);
	if (spec instanceof NANOS) spec = [...spec.values()];
    } else if (group !== 'modreq') return;
    if (typeof spec === 'string') {
	const sep = (group === 'modreq') ? /\s*;\s*/ : /[,;\s]+/;
	return spec.split(sep).filter(f => f);
    }
}

// Link the main entry point
function link (spec, jsIn) {
    // Resolve module dependencies
    const finalMods = resolveModDeps(getModSpec(spec));

    // Check for required features not provided
    checkFeatures(finalMods);

    // JS import map
    const jsImportMap = getJSImportMap();

    // Mesgjs mod meta
    const modMeta = getModMeta(finalMods, spec);

    // Module loading loop
    // JS code (if supplied)
    ({ jsIn, jsImportMap, modMeta });

    const outbuf = [], output = (...c) => outbuf.push(...c);

    output(`${flags.html ? '' : '// '}<script type='importmap'>${jsImportMap}</script>\n`);
    if (flags.html) output("<script type='module'>\n");
    output(`import { setModMeta } from '${escJSStr(mapPath(db, 'mesgjs/runtime/mesgjs.esm.js'), { dq: false })}';\n`);
    output(`setModMeta(${JSON.stringify(modMeta)}));\n`);
    if (flags.html) output(`</script>`);

    console.log(outbuf.join(''));
}

// Map module id to module (passing optional version)
function midToMod (mid) {
    const { module, atVersion } = pmv(mid);
    return _midToMod[module] + atVersion;
}

// Map module to module id (passing optional version)
function modToMid (mod) {
    const { module, atVersion } = pmv(mod);
    if (!_modToMid[module]) _midToMod[_modToMid[module] = 'M' + (nextMid++).toString(36)] = module;
    return _modToMid[module] + atVersion;
}

// Resolve module dependencies
function resolveModDeps (spec) {
    solver.require(encodeReqs(spec, 'entry point'));
    // Quasi-"trampoline" until all requirements have been encoded
    for (const item of requ.keys()) solver.require(Logic.implies(modToMid(item), encodeReqs(getModule(db, item).modreq, item)));

    // Constrain to at most one version of each module
    for (const item of requ.keys()) {
	const { module, version, extver } = pmv(item);
	modVers[module] ||= { std: [], ext: [] };
	if (extver) modVers[module].ext.push(version);
	else modVers[module].std.push(version);
    }
    for (const mod of Object.keys(modVers)) {
	const mid = modToMid(mod);
	solver.require(Logic.atMostOne(...([...modVers[mod].std, ...modVers[mod].ext].map(v => mid + '@' + v))));
    }

    // Look for any (trial) solution
    const trial = solver.solve();
    if (!trial) throw new Error('Unable to resolve all module dependencies');

    // Optimize using newest module versions
    computeWeights();
    const final = solver.minimizeWeightedSum(trial, Object.keys(weights), Object.values(weights));

    const finalMods = [];
    for (const midver of final.getTrueVars()) {
	const modver = midToMod(midver);
	if (!finalMods.length) console.log('Module dependencies resolved:');
	finalMods.push(modver);
	console.log(modver);
    }
    return finalMods;
}

function checkFeatures (finalMods) {
    // Feature check (provided vs required)
    const featpro = new Set();
    for (const mod of finalMods) for (const feat of getModule(db, mod, true).featpro.split(/[,\s]+/)) if (feat) featpro.add(feat);
    for (const mod of finalMods) {
	const modInfo = getModule(db, mod, true);
	for (const feat of modInfo.featreq.split(/[,\s]+/)) if (feat && !featpro.has(feat)) console.warn(`Warning: Module ${mod} requires missing feature ${feat}`);
    }
}

try {
    db = new DB(dbFile, { mode: 'read' });
    checkTables(db, dbFile);

    const main = flags._[0];
    if (!main) throw new Error('Entry point module or .esm.js/.msjs/.slid file required');
    if (main.endsWith('.msjs') || main.endsWith('.esm.js')) {
	const jsFile = main.replace(/\.msjs$/, '.esm.js');
	const slidFile = main.replace(/\.esm\.js$|\.msjs$/, '.slid');
	link(parseSLID(Deno.readTextFileSync(slidFile)), Deno.readTextFileSync(jsFile));
    } else if (main.endsWith('.slid')) {
	link(parseSLID(Deno.readTextFileSync(main)));
    } else {
	link(main);
    }
} catch (err) {
    if (Deno.env.has('DEBUG')) throw err;
    console.error('Error:', err.message);
    Deno.exit(1);
}

// END
