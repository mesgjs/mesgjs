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
function encodeReqs (reqs, label, forced = new Map()) {
    if (typeof reqs === 'string') reqs = getModSpec(reqs);
    const all = [];
    for (const modSpec of reqs || []) {
	const [ , mod, spec ] = modSpec.match(/\s*(\S+)\s+(.*)/);
	if (forced.has(mod)) continue;
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
function getModMeta (finalMods, spec) {
    const prefixMap = { '': '' }, modules = {}, eager = {};
    const entryPointDefers = (spec instanceof NANOS && new Set(getModSpec(spec.at('deferLoad', []), 'deferLoad'))) || new Set();
    const entryPointReqs = new Set(getModSpec(spec).map(req => pmv(req).module));

    for (const mod of finalMods) {
        const { module: modPath, version } = pmv(mod);
        const modInfo = getModule(db, mod, true);
        const { integrity, featpro, modreq, moddefer } = modInfo;
        const moduleMeta = { integrity, version };

        if (featpro) moduleMeta.featpro = featpro.split(/[,\s]+/).filter(f => f);

        const [url, mapping] = mapPath(db, modPath, { detail: true, version });
        if (!mapping) moduleMeta.url = url;
        else prefixMap[mapping[0]] ||= mapping[1];

        modules[modPath] = moduleMeta;

        // Check deferrals from other modules
        const deferSet = new Set((moddefer || '').split(/[,\s]+/).filter(f => f));
        for (const req of (modreq || '').split(/[,\s]+/).filter(f => f)) {
            const reqPath = pmv(req).module;
            if (!deferSet.has(reqPath)) eager[reqPath] = true;
        }

        // Check deferrals from entry point for top-level dependencies
        if (entryPointReqs.has(modPath) && !entryPointDefers.has(modPath)) {
            eager[modPath] = true;
        }
    }

    for (const modPath in modules) {
        if (!eager[modPath]) {
            modules[modPath].deferLoad = true;
        }
    }

    delete prefixMap[''];
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

// Return map of forced modules
function getModForceSpec (spec) {
    const forced = new Map();
    const list = getModSpec(spec, 'modforce');
    if (!list) return forced;
    for (const item of list) {
	const { module, version } = pmv(item);
	if (module && version) forced.set(module, item);
    }
    return forced;
}

// Link the main entry point
function link (spec, jsIn) {
    // Get forced modules
    const forced = getModForceSpec(spec);

    // Resolve module dependencies
    const finalMods = resolveModDeps(getModSpec(spec), forced);

    // Check for compatibility issues with forced modules
    checkCompat(finalMods, forced);

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
    if (jsIn) output('fwait("@loaded").then(() => {\n', jsIn, '\n});\n');
    if (flags.html) output(`</script>`);

    if (flags.out) Deno.writeTextFileSync(flags.out, outbuf.join(''));
    else console.log(outbuf.join(''));
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
function resolveModDeps (spec, forced = new Map()) {
    // Announce forced modules
    if (forced.size) {
        console.log('Forcing the following module versions:');
        for (const mod of forced.values()) console.log(`    ${mod}`);
    }

    const reqs = new Set(spec || []);
    for (const forcedMod of forced.values()) {
        const { modreq } = getModule(db, forcedMod, true) || {};
        if (modreq) for (const req of getModSpec(modreq)) reqs.add(req);
    }

    const filteredReqs = [...reqs].filter(r => {
        const match = r.match(/\s*(\S+)\s+.*/);
        return !match || !forced.has(match[1]);
    });

    solver.require(encodeReqs(filteredReqs, 'entry point', forced));

    // Quasi-"trampoline" until all requirements have been encoded
    for (const item of requ.keys()) {
        const { module } = pmv(item);
        if (forced.has(module)) continue;
        const mod = getModule(db, item);
        if (mod) solver.require(Logic.implies(modToMid(item), encodeReqs(mod.modreq, item, forced)));
    }

    // Constrain to at most one version of each module
    for (const item of requ.keys()) {
	const { module, version, extver } = pmv(item);
        if (forced.has(module)) continue;
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
    if (!trial) throw new Error('Unable to resolve module dependencies');

    // Optimize using newest module versions
    computeWeights();
    
    const solvedMods = [];
    if (trial) {
	const final = solver.minimizeWeightedSum(trial, Object.keys(weights), Object.values(weights));
	for (const midver of final.getTrueVars()) {
	    const modver = midToMod(midver);
	    if (!solvedMods.length) console.log('Module dependencies resolved:');
	    solvedMods.push(modver);
	    console.log(modver);
	}
    }

    return [ ...forced.values(), ...solvedMods ];
}

function checkCompat (finalMods, forced) {
    if (!forced.size) return;

    for (const mod of finalMods) {
        const modInfo = getModule(db, mod, true);
        if (!modInfo) continue;
        const modReqs = getModSpec(modInfo.modreq);
        if (!modReqs) continue;

        for (const req of modReqs) {
            const match = req.match(/\s*(\S+)\s+(.*)/);
            if (!match) continue;
            const [, reqMod, reqSpecStr] = match;

            if (forced.has(reqMod)) {
                const forcedVersionFull = forced.get(reqMod);
                const forcedVersionInfo = pmv(forcedVersionFull);
                const ranges = new SemVerRanges(reqSpecStr);
                const baseVersion = `${forcedVersionInfo.major}.${forcedVersionInfo.minor}.${forcedVersionInfo.patch}`;

                if (!ranges.inRange(forcedVersionFull) && !ranges.inRange(baseVersion)) {
                    const { module, version } = pmv(mod);
                    console.warn(`Warning: Module ${module}@${version} might not work with forced ${forcedVersionFull}`);
                }
            }
        }
    }
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
	link(parseSLID(Deno.readTextFileSync(slidFile)), Deno.readTextFileSync(jsFile).trim());
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
