/*
 * msjstrans - Mesgjs-to-JavaScript transpiler
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 */

import { parseArgs } from 'jsr:@std/cli/parse-args';
import { DB } from 'https://deno.land/x/sqlite/mod.ts';
import { lex, parse } from 'mesgjs/lexparse.esm.js';
import { transpileTree, mappingGenerator } from 'mesgjs/transpile.esm.js';
import { calcDigest } from 'mesgjs/calc_digest.esm.js';
import { parseSLID } from 'mesgjs/nanos.esm.js';

const flags = parseArgs(Deno.args, {
    boolean: [ 'tokens', 'tree', 'ver', 'no-js' ],
    string: [ 'cat', 'root' ],
});
// console.log(flags);

let root = flags.root || '';
if (root && root.slice(-1) !== '/') root += '/';
if (root && !Deno.lstatSync(root)?.isDirectory) throw new Error(`Directory ${root} not found`);

if (flags.ver && !flags.root) throw new Error('--root option required with --ver option');

let db;
if (flags.cat) {
    // Check module-catalog existence and contents if supplied
    const dbFile = flags.cat.endsWith('.msjcat') ? flags.cat : (flags.cat + '.msjcat');
    if (!Deno.lstatSync(dbFile).isFile) throw new Error(`Module catalog ${dbFile} not found`);
    db = new DB(dbFile);
    const maps = db.query("select name from sqlite_master where type='table' and name='path_map'");
    const mods = db.query("select name from sqlite_master where type='table' and name='modules'");
    if (!maps.length || !mods.length) throw new Error(`No path map and/or modules in ${dbFile}`);
}

// Return true if any path component begins with .
function dotStart (path) {
    return path.split('/').some(c => c[0] === '.');
}

/*
 * Config modpath -> dir/file
 * Else path -> ./file
 * Version -> dir += base/major/
 * Final path = (dist) root + dir + file
 */
function outPath (srcPath, config) {
    const version = flags.ver && config?.at('version'), modPath = root && config?.at('modPath');
    const [ major ] = version ? version.match(/\d+/) : [];

    let dir, base;
    if (modPath) {		// Work from configured module path
	if (dotStart(modPath)) throw new Error(`Invalid module path ${modPath}`);
	[ , dir, base ] = modPath.match(/^\/?(.*\/)?(.*)$/);
    } else {			// Work from source file name
	[ , base ] = srcPath.match(/(?:.*\/)?([^@]+)(.*\.msjs)$/);
	if (dotStart(base)) throw new Error(`Invalid module path ${base}`);
    }
    dir ||= '';
    if (dir && dir.slice(-1) !== '/') dir += '/';

    const file = base + (version ? ('@' + version) : '') + '.esm.js';
    if (version) dir += `${base}/${major}/`;
    return { dir, file };
}

// Process one Mesgjs source file
function process (srcPath) {
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

    console.log(`Writing ${finalPath} and map...`);
    if (finalDir) console.log(`mkdir ${finalDir}`)
    // if (finalDir) Deno.mkdirSync(finalDir, { recursive: true });
    // Deno.writeTextFileSync(finalPath, codePlus, { encoding: 'utf8' });
    // Deno.writeTextFileSync(finalPath + '.map', mapJSON, { encoding: 'utf8' });
}

for (const file of flags._) {
    if (/\.msjs$/.test(file)) process(file);
    else console.log(`Expected file extension .msjs: ${file}`);
}
console.log('Done');

//console.log(await calcDigest(codePlus, 'SHA-512'));
// if (flags.cat && config?.name && config?.version) {
// }

// END
