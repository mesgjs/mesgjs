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

const flags = parseArgs(Deno.args, {
    boolean: [ 'ext', 'html' ],
    string: [ 'cat', 'out' ],
});

const dbExt = s => s.endsWith('.msjcat') ? s : (s + '.msjcat');
const dbFile = dbExt(flags.cat || 'modules');
let db;

// Dependency resolver class
class Resolver {
    constructor (db) {
	this.db = db;
	this.solver = new Logic.Solver();
	this.requ = new Set();
	this.modVers = {};
	this.weights = [];
	this.nextMid = 0;
	this._midToMod = {};
	this._modToMid = {};
    }

    // Weight module versions to prefer newer versions
    computeWeights () {
	for (const mod of Object.keys(this.modVers)) {
	    const mid = this.modToMid(mod);
	    for (const en of this.modVers[mod].std.map(v => {
		const { major, minor, patch } = pmv(v);
		return [ major, minor, patch ];
	    }).sort((a, b) => compareModVer(b, a)).
		ma((va, i) => [ mid + '@' + va.join('.'), i ])) {
		this.weights[en[0]] = en[1];
	    }
	}
    }

    // Encode the specified requirements
    // module spec; module spec; ...
    encodeReqs (reqs, label, forced = new Map()) {
	if (typeof reqs === 'string') reqs = getModSpec(reqs);
	const all = [];
	for (const modSpec of reqs || []) {
	    const [ , mod, spec ] = modSpec.match(/\s*(\S+)\s+(.*)/);
	    if (forced.has(mod)) continue;
	    const mid = this.modToMid(mod), ranges = new SemVerRanges(spec), majors = ranges.majors(), any = [];
	    // For each allowed module major, allow each in-range module version
	    for (const major of majors) for (const ver of getVersions(this.db, mod, major, flags.ext)) if (ranges.inRange(ver)) {
		any.push(`${mid}@${ver}`);
		this.requ.add(`${mod}@${ver}`);		// Schedule if new mod@ver
	    }
	    if (any.length) all.push(Logic.or(...any));
	    else {
		console.error(`Error: No module ${mod} version satisfies "${spec.trim()}" for ${label}`);
		all.push(Logic.FALSE);
	    }
	}
	return (all.length ? Logic.and(...all) : Logic.TRUE);
    }
	
    // Map module id to module (passing optional version)
    midToMod (mid) {
	const { module, atVersion } = pmv(mid);
	return this._midToMod[module] + atVersion;
    }

    // Map module to module id (passing optional version)
    modToMid (mod) {
	const { module, atVersion } = pmv(mod);
	if (!this._modToMid[module]) this._midToMod[this._modToMid[module] = 'M' + (this.nextMid++).toString(36)] = module;
	return this._modToMid[module] + atVersion;
    }

    // Resolve module dependencies
    resolve (spec, forced = new Map()) {
	// Announce forced modules
	if (forced.size) {
	    console.log('Forcing the following module versions:');
	    for (const mod of forced.values()) console.log(`    ${mod}`);
	}

	const reqs = new Set(spec || []);
	for (const forcedMod of forced.values()) {
	    const { modreq } = getModule(this.db, forcedMod, true) || {};
	    if (modreq) for (const req of getModSpec(modreq)) reqs.add(req);
	}

	const filteredReqs = [...reqs].filter(r => {
	    const match = r.match(/\s*(\S+)\s+.*/);
	    return !match || !forced.has(match[1]);
	});

	this.solver.require(this.encodeReqs(filteredReqs, 'entry point', forced));

	// Quasi-"trampoline" until all requirements have been encoded
	for (const item of this.requ.keys()) {
	    const { module } = pmv(item);
	    if (forced.has(module)) continue;
	    const mod = getModule(this.db, item);
	    if (mod) this.solver.require(Logic.implies(this.modToMid(item), this.encodeReqs(mod.modreq, item, forced)));
	}

	// Constrain to at most one version of each module
	for (const item of this.requ.keys()) {
	    const { module, version, extver } = pmv(item);
	    if (forced.has(module)) continue;
	    this.modVers[module] ||= { std: [], ext: [] };
	    if (extver) this.modVers[module].ext.push(version);
	    else this.modVers[module].std.push(version);
	}
	for (const mod of Object.keys(this.modVers)) {
	    const mid = this.modToMid(mod);
	    this.solver.require(Logic.atMostOne(...([...this.modVers[mod].std, ...this.modVers[mod].ext].map(v => mid + '@' + v))));
	}

	// Look for any (trial) solution
	const trial = this.solver.solve();
	if (!trial) throw new Error('Unable to resolve module dependencies');

	// Optimize using newest module versions
	this.computeWeights();
	    
	const solvedMods = [];
	if (trial) {
	    const final = this.solver.minimizeWeightedSum(trial, Object.keys(this.weights), Object.values(this.weights));
	    for (const midver of final.getTrueVars()) {
		const modver = this.midToMod(midver);
		if (!solvedMods.length) console.log('Module dependencies resolved:');
		solvedMods.push(modver);
		console.log(modver);
	    }
	}

	return [ ...forced.values(), ...solvedMods ];
    }
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
function link (mainSpec, clientSpec, mainJsIn) {
    // Main entry point resolution
    const mainResolver = new Resolver(db);
    const mainForced = getModForceSpec(mainSpec);
    const mainFinalMods = mainResolver.resolve(getModSpec(mainSpec), mainForced);
    checkCompat(mainFinalMods, mainForced);
    checkFeatures(mainFinalMods);
    const modMeta = getModMeta(mainFinalMods, mainSpec);

    // Client-side resolution
    if (clientSpec) {
	const clientResolver = new Resolver(db);
	const clientForced = getModForceSpec(clientSpec);
	const clientFinalMods = clientResolver.resolve(getModSpec(clientSpec), clientForced);
	checkCompat(clientFinalMods, clientForced);
	checkFeatures(clientFinalMods);
	modMeta.client = getModMeta(clientFinalMods, clientSpec);
    }

    // JS import map
    const jsImportMap = getJSImportMap();

    const outbuf = [], output = (...c) => outbuf.push(...c);

    output(`${flags.html ? '' : '// '}<script type='importmap'>${jsImportMap}</script>\n`);
    if (flags.html) output("<script type='module'>\n");
    output(`import { setModMeta } from '${escJSStr(mapPath(db, 'mesgjs/runtime/mesgjs.esm.js'), { dq: false })}';\n`);
    output(`setModMeta(${JSON.stringify(modMeta, null, 2)}));\n`);

    if (mainJsIn) {
        output('$c.fwait("@loaded").then(() => {\n', mainJsIn, '\n});\n');
    }

    if (flags.html) output(`</script>`);

    if (flags.out) Deno.writeTextFileSync(flags.out, outbuf.join(''));
    else console.log(outbuf.join(''));
}

// Deeply merge two NANOS objects
function mergeSpecs (base, overlay) {
    const merged = base.clone(); // Create a shallow copy first
    for (const [key, value] of overlay.entries()) {
        const baseValue = merged.at(key);
        if (baseValue instanceof NANOS && value instanceof NANOS) {
            merged.set(key, mergeSpecs(baseValue, value));
        } else {
            merged.set(key, value);
        }
    }
    return merged;
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

function parseEntryPoint(path) {
    if (path.endsWith('.slid')) {
        return parseSLID(Deno.readTextFileSync(path));
    }
    return path;
}

try {
    db = new DB(dbFile, { mode: 'read' });
    checkTables(db, dbFile);

    const main = flags._[0];
    if (!main) throw new Error('Entry point module or .esm.js/.msjs/.slid file required');
    
    let mainSpec, clientSpec, mainJsIn;

    if (flags._[1]) {
        // Dual entry-point mode (server+client)
        const clientEntryPoint = flags._[1];
        if (clientEntryPoint.endsWith('.msjs') || clientEntryPoint.endsWith('.esm.js')) {
     throw new Error('The client entry point must be a .slid file or module path.');
        }

        mainSpec = parseEntryPoint(main);
        clientSpec = parseEntryPoint(clientEntryPoint);

        if (main.endsWith('.msjs') || main.endsWith('.esm.js')) {
            mainJsIn = Deno.readTextFileSync(main.replace(/\.msjs$/, '.esm.js')).trim();
        }
    } else if (main.endsWith('.slid')) {
        const nanosSpec = parseSLID(Deno.readTextFileSync(main));
        const serverOverlay = nanosSpec.at('server');
        const clientOverlay = nanosSpec.at('client');

        if (serverOverlay || clientOverlay) {
            mainSpec = serverOverlay ? mergeSpecs(nanosSpec, serverOverlay) : nanosSpec;
            if (clientOverlay) clientSpec = mergeSpecs(nanosSpec, clientOverlay);
        } else {
            mainSpec = nanosSpec;
        }
    } else if (main.endsWith('.msjs') || main.endsWith('.esm.js')) {
 const jsFile = main.replace(/\.msjs$/, '.esm.js');
 const slidFile = main.replace(/\.esm\.js$|\.msjs$/, '.slid');
 mainSpec = parseSLID(Deno.readTextFileSync(slidFile));
 mainJsIn = Deno.readTextFileSync(jsFile).trim();
    } else {
 mainSpec = main;
    }
    
    link(mainSpec, clientSpec, mainJsIn);

} catch (err) {
    if (Deno.env.has('DEBUG')) throw err;
    console.error('Error:', err.message);
    Deno.exit(1);
}

// END
