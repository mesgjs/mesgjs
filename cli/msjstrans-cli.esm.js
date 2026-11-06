/*
 * msjstrans - Mesgjs-to-JavaScript transpiler
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 *
 * --add-space - Add extra white space to the output for development/debugging
 * --cat - The module catalog database
 * --enable-debug - Enable @debug{...} debuggin blocks
 * --enable-js - Enable @js{...@} JavaScript embeds
 * --inc-slid - Embed in-file config-SLID into transpiled JavaScript output
 * --mod - Use configSLID module path
 * --no-js - Do not generate JavaScript or source map
 * --no-strip-jsec - Do not strip comments from JavaScript embeds
 * --root - The output root directory
 * --tokens - Display lexical tokens
 * --tree - Display parse tree
 * --upcat - Update the existing module catalog entry without transpiling the module
 * --ver - Use configSLID module version
 * *.msjs - Mesgjs source files
 * *.slid - Matching extra-meta-data (e.g. for modreq)
 */

import fs from 'node:fs';
import process from 'node:process';
import { parseArgs } from 'node:util';

import { lex, parse } from 'mesgjs/src/lexparse.esm.js';
import { transpileTree, mappingGenerator } from 'mesgjs/src/transpile.esm.js';
import { addModule, checkTables, normalSpace } from 'mesgjs/src/module-catalog-lite.esm.js';
import { calcDigest } from 'mesgjs/src/runtime/calc-digest.esm.js';
import { parseModVer as pmv } from 'mesgjs/src/semver.esm.js';
import { parseSLID } from '@nanos';

async function openDatabase (dbFile) {
	if (globalThis.Bun) {
		const { Database } = await import('bun:sqlite');
		const db = new Database(dbFile);
		return {
			query: (sql, params = []) => db.query(sql).values(...params),
			execute: (sql) => db.run(sql),
			close: () => db.close()
		};
	}
	if (globalThis.Deno) {
		const { DB } = await import('https://deno.land/x/sqlite/mod.ts');
		const db = new DB(dbFile, { mode: 'write' });
		return {
			query: (sql, params = []) => db.query(sql, params),
			execute: (sql) => db.execute(sql),
			close: () => db.close()
		};
	}
	// Node.js (node:sqlite DatabaseSync)
	try {
		const { DatabaseSync } = await import('node:sqlite');
		const db = new DatabaseSync(dbFile);
		return {
			query: (sql, params = []) => {
				const stmt = db.prepare(sql);
				if (/^\s*(select|pragma)/i.test(sql)) {
					return stmt.all(...params).map(row => Object.values(row));
				}
				stmt.run(...params);
				return [];
			},
			execute: (sql) => db.exec(sql),
			close: () => db.close()
		};
	} catch (err) {
		throw new Error(`SQLite driver not available in this runtime: ${err.message}`);
	}
}

const rawArgs = globalThis.Deno?.args || globalThis.process?.argv?.slice(2) || [];
const { values: flags, positionals } = parseArgs({
	args: rawArgs,
	options: {
		'add-space': { type: 'boolean', default: false },
		'enable-debug': { type: 'boolean', default: false },
		'enable-js': { type: 'boolean', default: false },
		'inc-slid': { type: 'boolean', default: false },
		'mod': { type: 'boolean', default: false },
		'no-js': { type: 'boolean', default: false },
		'no-strip-jsec': { type: 'boolean', default: false },
		'tokens': { type: 'boolean', default: false },
		'tree': { type: 'boolean', default: false },
		'upcat': { type: 'boolean', default: false },
		'ver': { type: 'boolean', default: false },
		'cat': { type: 'string' },
		'root': { type: 'string' }
	},
	allowPositionals: true
});
const upcat = flags.upcat;

let root = flags.root || '';
if (root && root.slice(-1) !== '/') root += '/';
if (root && (!fs.existsSync(root) || !fs.statSync(root).isDirectory())) throw new Error(`Directory ${root} not found`);

let db;
if (flags.cat) {
	// Check module-catalog existence and contents if supplied
	const dbFile = flags.cat.endsWith('.msjcat') ? flags.cat : (flags.cat + '.msjcat');
	if (!fs.existsSync(dbFile) || !fs.statSync(dbFile).isFile()) throw new Error(`Module catalog ${dbFile} not found`);
	db = await openDatabase(dbFile);
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
async function processFile (srcPath) {
	console.log(`Processing file ${srcPath}...`);
	const source = fs.readFileSync(srcPath, 'utf8');

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
		process.exit(1);
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
		const slid = fs.readFileSync(slidPath, 'utf8');
		if (slid) meta = parseSLID(slid);
	} catch (_err) {
		console.log('Note: .slid meta-data is absent or unreadable.');
		console.log('No module dependencies will be recorded.');
	}

	const txpOpts = {
		addWhiteSpace: flags['add-space'],
		debugBlocks: flags['enable-debug'],
		enableJS: flags['enable-js'],
		stripJSEC: !flags['no-strip-jsec']
	};
	const { code, errors: txpErrors, fatal, segments } = upcat ? {} : transpileTree(tree, txpOpts);
	if (txpErrors?.length) console.log(txpErrors.join('\n'));
	if (fatal) console.log(fatal);
	if (txpErrors?.length || fatal) process.exit(1);

	const { dir, file } = outPath(srcPath, config);
	const finalDir = root + dir;
	const finalPath = finalDir + file;
	const mapping = upcat ? {} : mappingGenerator(segments);
	mapping.file = dir + file;
	mapping.sourcesContent = [ source ];
	const mapJSON = JSON.stringify(mapping);
	const slidHeader = (flags['inc-slid'] && config) ? `/*${config.toSLID()}*/\n` : '';
	const codePlus = slidHeader + (code || '') + `\n//# sourceMappingURL=${file}.map\n`;

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
		if (finalDir) fs.mkdirSync(finalDir, { recursive: true });
		fs.writeFileSync(finalPath, codePlus, 'utf8');
		fs.writeFileSync(finalPath + '.map', mapJSON, 'utf8');
	}

	// If we have the appropriate info, add or update this module in the module catalog
	if (db && !([ major, minor, patch ].includes(undefined)) && modPath) {
		const sha512 = await calcDigest(codePlus, 'SHA-512');
		const modreq = normalSpace(meta.at('modreq', ''));
		const moddefer = normalSpace(meta.at('deferLoad', ''));
		if (upcat) {
			console.log(`Updating dependencies for ${modPath}@${major}.${minor}.${patch}${extver}...`);
			db.query(`update modules set modreq = ?, moddefer = ? where path = ? and major = ? and minor = ? and patch = ? and extver = ?`, [ modreq, moddefer, modPath, major, minor, patch, extver ?? '' ]);
		} else {
			const featpro = config.at('featpro', ''), featreq = config.at('featreq', ''), modcaps = config.at('modcaps', '');
			console.log(`Updating module catalog for ${modPath}@${version}...`);
			addModule(db, `${modPath}@${version}`, { integrity: sha512, featpro, featreq, modreq, moddefer, modcaps });
		}
	}
}

for (const file of positionals) {
	if (/\.msjs$/.test(file)) await processFile(file);
	else console.log(`Expected file extension .msjs: ${file}`);
}
console.log('Done');

// END
