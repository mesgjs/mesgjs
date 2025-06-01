/*
 * msjstrans - Mesgjs-to-JavaScript transpiler
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 *
 * --cat - The module catalog database
 * --mod - Use configSLID module path
 * --no-js - Do not generate JavaScript or source map
 * --root - The output root directory
 * --tokens - Display lexical tokens
 * --tree - Display parse tree
 * --ver - Use configSLID module version
 * *.msjs - Mesgjs source files
 * *.slid - Matching extra-meta-data (e.g. for modsreqd)
 */

import { parseArgs } from 'jsr:@std/cli/parse-args';
import { DB } from 'https://deno.land/x/sqlite/mod.ts';
import { lex, parse } from 'mesgjs/lexparse.esm.js';
import { transpileTree, mappingGenerator } from 'mesgjs/transpile.esm.js';
import { checkTables } from 'mesgjs/module-catalog-lite.esm.js';
import { calcDigest } from 'mesgjs/runtime/calc-digest.esm.js';
import { parseSLID } from 'nanos/nanos.esm.js';

const flags = parseArgs(Deno.args, {
    boolean: [ 'tokens', 'tree', 'mod', 'ver', 'no-js' ],
    string: [ 'cat', 'root' ],
});
// console.log(flags);

let root = flags.root || '';
if (root && root.slice(-1) !== '/') root += '/';
if (root && !Deno.lstatSync(root)?.isDirectory) throw new Error(`Directory ${root} not found`);

let db;
if (flags.cat) {
    // Check module-catalog existence and contents if supplied
    const dbFile = flags.cat.endsWith('.msjcat') ? flags.cat : (flags.cat + '.msjcat');
    if (!Deno.lstatSync(dbFile).isFile) throw new Error(`Module catalog ${dbFile} not found`);
    db = new DB(dbFile, { mode: 'write' });
    checkTables(db, dbFile);
}

// Return true if any path component begins with .
function dotStart (path) {
    return path.split('/').some(c => c[0] === '.');
}

/*
 * Config modpath -> dir/base (iff root supplied)
 * Else srcpath -> .../base
 * Version -> file = base + @version
 * Version -> dir += base/major/ (iff root supplied)
 * Final path = (dist) root + dir + file + .esm.js
 */
function outPath (srcPath, config) {
    const version = flags.ver && config?.at('version'), modPath = root && flags.mod && config?.at('modpath');
    const [ major ] = version ? version.match(/\d+/) : [];

    let dir, base;
    if (modPath) {		// Work from configured module path
	if (dotStart(modPath)) throw new Error(`Invalid module path ${modPath}`);
	[ , dir, base ] = modPath.match(/^\/?(.*\/)?(.*)$/);
    } else {			// Work from source file.msjs name
	[ , base ] = srcPath.match(/(?:.*\/)?([^@]+)(.*\.msjs)$/);
	if (dotStart(base)) throw new Error(`Invalid module path ${base}`);
    }
    dir ||= '';
    if (dir && dir.slice(-1) !== '/') dir += '/';

    const file = base + (version ? ('@' + version) : '') + '.esm.js';
    if (root && version) dir += `${base}/${major}/`;
    return { dir, file };
}

// Process one Mesgjs source file
async function process (srcPath) {
    console.log(`Processing file ${srcPath}...`);
    const source = Deno.readTextFileSync(srcPath);

    const [ _, inFile ] = srcPath.match(/(?:.*\/)?(.*)/);
    const { configSLID, tokens } = lex(source, { src: inFile });
    if (flags.tokens) {
	console.log('TOKENS');
	console.dir(tokens, { depth: null });
    }
    const config = configSLID && parseSLID(configSLID);

    const { tree, errors: parseErrors } = parse(tokens);
    if (parseErrors?.length) {
	console.log(parseErrors.join('\n'));
	Deno.exit(1);
    }
    if (flags.tree) {
	console.log('PARSE TREE');
	console.dir(tree, { depth: null });
    }
    if (flags['no-js']) return;

    let meta = { at: (_, def = '') => def };
    try {
	const slidPath = srcPath.replace(/\.msjs$/, '.slid');
	const slid = Deno.readTextFileSync(slidPath);
	if (slid) meta = parseSLID(slid);
    } catch (e) {
	console.log('Note: .slid meta-data is absent or unreadable.');
	console.log('No module dependencies will be recorded.');
    }

    const { code, errors: txpErrors, fatal, segments } = transpileTree(tree);
    if (txpErrors?.length) console.log(txpErrors.join('\n'));
    if (fatal) console.log(fatal);
    if (txpErrors?.length || fatal) Deno.exit(1);

    const { dir, file } = outPath(srcPath, config);
    const finalDir = root + dir;
    const finalPath = finalDir + file;
    const mapping = mappingGenerator(segments);
    mapping.file = dir + file;
    mapping.sourcesContent = [ source ];
    const mapJSON = JSON.stringify(mapping);
    const codePlus = code + `\n//# sourceMappingURL=${file}.map\n`;

    const version = config && config.at('version'), modPath = config && config.at('modpath');
    const [ , major, minor, patch, extver ] = version ? version.match(/(\d+)\.(\d+)\.(\d+)([+-].*)?/) : [];

    let skip = false;
    if (flags.ver || db) {
	if (!version) {
	    console.log(`Warning: no version in ${srcPath}`);
	    skip = true;
	} else if (!major || !minor || !patch) {
	    console.log(`Warning: invalid version ${version} in ${srcPath}`);
	    skip = true;
	}
    }
    if ((flags.mod || db) && !modPath) {
	console.log(`Warning: no modpath in ${srcPath}`);
	skip = true;
    }
    if (skip) return;

    console.log(`Writing ${finalPath} and map...`);
    //if (finalDir) console.log(`mkdir ${finalDir}`)
    if (finalDir) Deno.mkdirSync(finalDir, { recursive: true });
    Deno.writeTextFileSync(finalPath, codePlus, { encoding: 'utf8' });
    Deno.writeTextFileSync(finalPath + '.map', mapJSON, { encoding: 'utf8' });

    if (db && major && minor && patch && modPath) {
	const sha512 = await calcDigest(codePlus, 'SHA-512');
	db.query('insert or replace into modules (path, major, minor, patch, extver, integ, featpro, featreq, modreq) values (?, ?, ?, ?, ?, ?, ?, ?, ?)', [ modPath, major, minor, patch, extver ?? '', sha512, config.at('featpro', ''), config.at('featreq', ''), meta.at('modreq', '') ]);
    }
}

for (const file of flags._) {
    if (/\.msjs$/.test(file)) await process(file);
    else console.log(`Expected file extension .msjs: ${file}`);
}
console.log('Done');

// END
