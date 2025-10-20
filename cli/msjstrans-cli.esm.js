/*
 * msjstrans - Mesgjs-to-JavaScript transpiler
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 *
 * --add-space - Add extra white space to the output for development/debugging
 * --cat - The module catalog database
 * --enable-debug - Enable @debug{...} debuggin blocks
 * --enable-js - Enable @js{...@} JavaScript embeds
 * --mod - Use configSLID module path
 * --no-js - Do not generate JavaScript or source map
 * --root - The output root directory
 * --tokens - Display lexical tokens
 * --tree - Display parse tree
 * --upcat - Update the existing module catalog entry without transpiling the module
 * --ver - Use configSLID module version
 * *.msjs - Mesgjs source files
 * *.slid - Matching extra-meta-data (e.g. for modreq)
 */

import { parseArgs } from 'jsr:@std/cli/parse-args';
import { DB } from 'https://deno.land/x/sqlite/mod.ts';
import { lex, parse } from 'mesgjs/src/lexparse.esm.js';
import { transpileTree, mappingGenerator } from 'mesgjs/src/transpile.esm.js';
import { addModule, checkTables } from 'mesgjs/src/module-catalog-lite.esm.js';
import { calcDigest } from 'mesgjs/src/runtime/calc-digest.esm.js';
import { parseModVer as pmv } from 'mesgjs/src/semver.esm.js';
import { parseSLID } from 'nanos/src/nanos.esm.js';

const flags = parseArgs(Deno.args, {
	boolean: [ 'add-space', 'enable-debug', 'enable-js', 'mod', 'no-js', 'tokens', 'tree', 'upcat', 'ver' ],
	string: [ 'cat', 'root' ],
});
const upcat = flags.upcat;
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
 * Ex: foo/bar 1.2.3 => root/foo/bar/1/bar@1.2.3.esm.js
 */
function outPath (srcPath, config) {
	const version = flags.ver && config?.at('version'), modPath = root && flags.mod && config?.at('modpath');
	const [ major ] = version ? version.match(/\d+/) : [];

	let dir, base;
	if (modPath) {				// Work from configured module path
		if (dotStart(modPath)) throw new Error(`Invalid module path ${modPath}`);
		[ , dir, base ] = modPath.match(/^\/?(.*\/)?(.*)$/);
	} else {					// Work from source file.msjs name
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

	// Split out the final (file) component of the srcPath
	const [ _, inFile ] = srcPath.match(/(?:.*\/)?(.*)/);
	const { configSLID, tokens } = lex(source, { src: inFile });
	if (flags.tokens) {		// Show generated lexical tokens
		console.log('TOKENS');
		console.dir(tokens, { depth: null });
	}
	// Grab the intra-file configuration SLID
	const config = configSLID && parseSLID(configSLID);

	const { tree, errors: parseErrors } = upcat ? {} : parse(tokens);
	if (parseErrors?.length) {
		console.log(parseErrors.join('\n'));
		Deno.exit(1);
	}
	if (flags.tree && !upcat) {		  // Show parsed abstract syntax tree (AST)
		console.log('PARSE TREE');
		console.dir(tree, { depth: null });
	}
	if (flags['no-js'] && !upcat) return;

	// Stub a simplified fake NANOS.at that defaults to an empty string
	let meta = { at: (_, def = '') => def };
	try {
		const slidPath = srcPath.replace(/\.msjs$/, '.slid');
		const slid = Deno.readTextFileSync(slidPath);
		if (slid) meta = parseSLID(slid);
	} catch (_err) {
		console.log('Note: .slid meta-data is absent or unreadable.');
		console.log('No module dependencies will be recorded.');
	}

	const txpOpts = {
		addWhiteSpace: flags['add-space'],
		debugBlocks: flags['enable-debug'],
		enableJS: flags['enable-js']
	};
	const { code, errors: txpErrors, fatal, segments } = upcat ? {} : transpileTree(tree, txpOpts);
	if (txpErrors?.length) console.log(txpErrors.join('\n'));
	if (fatal) console.log(fatal);
	if (txpErrors?.length || fatal) Deno.exit(1);

	const { dir, file } = outPath(srcPath, config);
	const finalDir = root + dir;
	const finalPath = finalDir + file;
	const mapping = upcat ? {} : mappingGenerator(segments);
	mapping.file = dir + file;
	mapping.sourcesContent = [ source ];
	const mapJSON = JSON.stringify(mapping);
	const codePlus = (code || '') + `\n//# sourceMappingURL=${file}.map\n`;

	const version = config && config.at('version'), modPath = config && config.at('modpath');
	const { major, minor, patch, extver } = pmv(version);

	let skip = false;
	if (flags.ver || db) {
		if (!version) {
			console.log(`Warning: No version in ${srcPath}`);
			skip = true;
		} else if ([ major, minor, patch ].includes(undefined)) {
			console.log(`Warning: Invalid version ${version} in ${srcPath}`);
			skip = true;
		}
	}
	if ((flags.mod || db) && !modPath) {
		console.log(`Warning: No modpath in ${srcPath}`);
		skip = true;
	}
	if (skip) return;

	if (!upcat) {
		console.log(`Writing ${finalPath} and map...`);
		if (finalDir) Deno.mkdirSync(finalDir, { recursive: true });
		Deno.writeTextFileSync(finalPath, codePlus, { encoding: 'utf8' });
		Deno.writeTextFileSync(finalPath + '.map', mapJSON, { encoding: 'utf8' });
	}

	// If we have the appropriate info, add or update this module in the module catalog
	if (db && !([ major, minor, patch ].includes(undefined)) && modPath) {
		const sha512 = await calcDigest(codePlus, 'SHA-512');
		const modreq = meta.at('modreq', '');
		const moddefer = meta.at('deferLoad', '');
		if (upcat) {
			console.log(`Updating dependencies for ${modPath}@${major}.${minor}.${patch}${extver}...`);
			db.query(`update modules set modreq = ?, moddefer = ? where path = ? and major = ? and minor = ? and patch = ? and extver = ?`, [ modreq, moddefer, modPath, major, minor, patch, extver ?? '' ]);
		} else {
			const featpro = config.at('featpro', ''), featreq = config.at('featreq', ''), modcaps = config.at('modcaps', '');
			console.log(`Updating module catalog for ${modPath}@${major}.${minor}.${patch}${extver}...`);
			addModule(db, `${modPath}@${version}`, { integrity: sha512, featpro, featreq, modreq, moddefer, modcaps });
		}
	}
}

for (const file of flags._) {
	if (/\.msjs$/.test(file)) await process(file);
	else console.log(`Expected file extension .msjs: ${file}`);
}
console.log('Done');

// END
