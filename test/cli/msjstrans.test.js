import { describe, it, beforeEach, afterEach } from '@compat/test';
import { assertMatch, assertNotStrictEquals, assertStrictEquals, assertRejects } from '@std/assert';
import { fromFileUrl, makeDir, makeTempDir, readTextFile, removeDir, stat, writeTextFile } from '@compat/file';
import { openDatabase } from '@compat/sqlite';
import { spawn } from '@compat/subprocess';
import * as path from '@compat/path';

const __filename = fromFileUrl(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const MSJSTRANS_BIN = path.join(REPO_ROOT, 'bin/msjstrans');

let currentTempDir = null;

async function runTranspiler (args = [], options = {}) {
	try {
		const proc = spawn(MSJSTRANS_BIN, args, {
			cwd: options.cwd || currentTempDir || REPO_ROOT,
			env: options.env,
		});
		const res = await proc.text();
		return {
			code: res.code,
			stdout: res.stdout,
			stderr: res.stderr,
		};
	} catch (err) {
		return {
			code: err.code ?? 1,
			stdout: err.stdout ?? '',
			stderr: err.stderr ?? err.message,
		};
	}
}

async function createCatalogDb (dbPath) {
	const db = await openDatabase(dbPath, { create: true });
	db.exec(`
		CREATE TABLE path_map (
			input TEXT NOT NULL PRIMARY KEY,
			output TEXT NOT NULL
		);
		CREATE TABLE modules (
			path TEXT NOT NULL,
			major INT NOT NULL,
			minor INT NOT NULL,
			patch INT NOT NULL,
			extver TEXT NOT NULL,
			integrity TEXT NOT NULL,
			featpro TEXT NOT NULL DEFAULT "",
			featreq TEXT NOT NULL DEFAULT "",
			modreq TEXT NOT NULL DEFAULT "",
			moddefer TEXT NOT NULL DEFAULT "",
			modcaps TEXT NOT NULL DEFAULT "",
			PRIMARY KEY (path, major, minor, patch, extver)
		);
	`);
	db.close();
}

// NB: describe('...', async () => {...}) does not work (at least for Deno)
const hasDeno = await spawn('which', ['deno']).status.then((st) => st.success).catch(() => false);
const denoIgnore = !hasDeno;
const hasBun = await spawn('which', ['bun']).status.then((st) => st.success).catch(() => false);
const hasWicbun = await spawn('which', ['wicbun']).status.then((st) => st.success).catch(() => false);
const bunIgnore = !hasBun || !hasWicbun;
const hasNode = await spawn('which', ['node']).status.then((st) => st.success).catch(() => false);
const hasWicnode = await spawn('which', ['wicnode']).status.then((st) => st.success).catch(() => false);
const nodeIgnore = !hasNode || !hasWicnode;

describe('msjstrans CLI Portability Suite', () => {
	let tempDir;

	beforeEach(async () => {
		tempDir = await makeTempDir({ prefix: 'msjstrans-test-' });
		currentTempDir = tempDir;
	});

	afterEach(async () => {
		currentTempDir = null;
		if (tempDir) {
			await removeDir(tempDir, { recursive: true, force: true });
		}
	});

	it('transpiles basic .msjs to .esm.js and generates sourcemap', async () => {
		const srcPath = path.join(tempDir, 'sample.msjs');
		await writeTextFile(srcPath, '@c(log "hello world")\n');

		const res = await runTranspiler([srcPath]);
		assertStrictEquals(res.code, 0, res.stderr);

		const outPath = path.join(tempDir, 'sample.esm.js');
		const outMap = path.join(tempDir, 'sample.esm.js.map');

		const outContent = await readTextFile(outPath);
		assertMatch(outContent, /hello world/);
		assertMatch(outContent, /\/\/# sourceMappingURL=sample\.esm\.js\.map/);

		const mapStat = await stat(outMap);
		assertStrictEquals(mapStat.isFile, true);
	});

	it('embeds SLID header and strips inner comments with --inc-slid', async () => {
		const srcPath = path.join(tempDir, 'slidMod.msjs');
		const content = `[(
			/* Embedded comment inside SLID */
			modpath=sampleMod
			version='1.0.0'
		)]
		@c(log "testing slid")
		`;
		await writeTextFile(srcPath, content);

		const res = await runTranspiler(['--inc-slid', srcPath]);
		assertStrictEquals(res.code, 0, res.stderr);

		const outContent = await readTextFile(path.join(tempDir, 'slidMod.esm.js'));
		assertMatch(outContent, /\/\*\[\(/);
		assertMatch(outContent, /modpath=sampleMod/);
		assertStrictEquals(outContent.includes('Embedded comment inside SLID'), false);
	});

	it('displays lexical tokens with --tokens', async () => {
		const srcPath = path.join(tempDir, 'tokens.msjs');
		await writeTextFile(srcPath, '@c(log "tokens test")\n');

		const res = await runTranspiler(['--tokens', '--no-js', srcPath]);
		assertStrictEquals(res.code, 0, res.stderr);
		assertMatch(res.stdout, /TOKENS/);
		assertMatch(res.stdout, /tokens test/);
	});

	it('displays parse tree with --tree', async () => {
		const srcPath = path.join(tempDir, 'tree.msjs');
		await writeTextFile(srcPath, '@c(log "tree test")\n');

		const res = await runTranspiler(['--tree', '--no-js', srcPath]);
		assertStrictEquals(res.code, 0, res.stderr);
		assertMatch(res.stdout, /PARSE TREE/);
	});

	it('skips output file generation when --no-js is supplied', async () => {
		const srcPath = path.join(tempDir, 'nojs.msjs');
		await writeTextFile(srcPath, '@c(log "no js generation")\n');

		const res = await runTranspiler(['--no-js', srcPath]);
		assertStrictEquals(res.code, 0, res.stderr);

		const outPath = path.join(tempDir, 'nojs.esm.js');
		await assertRejects(async () => await stat(outPath));
	});

	it('handles @debug blocks according to --enable-debug flag', async () => {
		const srcPath = path.join(tempDir, 'debug.msjs');
		const content = `@debug{
			@c(log "DEBUG_ONLY_LOG")
		}
		@c(log "ALWAYS_LOG")
		`;
		await writeTextFile(srcPath, content);

		// Default: @debug excluded
		const resDefault = await runTranspiler([srcPath]);
		assertStrictEquals(resDefault.code, 0, resDefault.stderr);
		const outDefault = await readTextFile(path.join(tempDir, 'debug.esm.js'));
		assertStrictEquals(outDefault.includes('DEBUG_ONLY_LOG'), false);
		assertMatch(outDefault, /ALWAYS_LOG/);

		// With --enable-debug: @debug included
		const resEnabled = await runTranspiler(['--enable-debug', srcPath]);
		assertStrictEquals(resEnabled.code, 0, resEnabled.stderr);
		const outEnabled = await readTextFile(path.join(tempDir, 'debug.esm.js'));
		assertMatch(outEnabled, /DEBUG_ONLY_LOG/);
		assertMatch(outEnabled, /ALWAYS_LOG/);
	});

	it('handles @js blocks and comment stripping with --enable-js and --no-strip-jsec', async () => {
		const srcPath = path.join(tempDir, 'jsblock.msjs');
		const content = `@js{
			// This is a JS comment
			console.log("embedded js");
		@}`;
		await writeTextFile(srcPath, content);

		// Disallowed by default without --enable-js
		const resDisallowed = await runTranspiler([srcPath]);
		assertNotStrictEquals(resDisallowed.code, 0);

		// Allowed with --enable-js (comments stripped by default)
		const resStripped = await runTranspiler(['--enable-js', srcPath]);
		assertStrictEquals(resStripped.code, 0, resStripped.stderr);
		const outStripped = await readTextFile(path.join(tempDir, 'jsblock.esm.js'));
		assertMatch(outStripped, /embedded js/);
		assertStrictEquals(outStripped.includes('This is a JS comment'), false);

		// Allowed with --enable-js and --no-strip-jsec (comments retained)
		const resRetained = await runTranspiler(['--enable-js', '--no-strip-jsec', srcPath]);
		assertStrictEquals(resRetained.code, 0, resRetained.stderr);
		const outRetained = await readTextFile(path.join(tempDir, 'jsblock.esm.js'));
		assertMatch(outRetained, /embedded js/);
		assertMatch(outRetained, /This is a JS comment/);
	});

	it('supports structured output directory hierarchy with --root, --mod, and --ver', async () => {
		const srcPath = path.join(tempDir, 'hier.msjs');
		const content = `[(
			modpath=pkg/sample
			version='2.4.1'
		)]
		@c(log "hierarchy test")
		`;
		await writeTextFile(srcPath, content);

		const rootDir = path.join(tempDir, 'dist');
		await makeDir(rootDir);

		const res = await runTranspiler(['--root', rootDir, '--mod', '--ver', srcPath]);
		assertStrictEquals(res.code, 0, res.stderr);

		const expectedFile = path.join(rootDir, 'pkg/sample/2/sample@2.4.1.esm.js');
		const expectedMap = path.join(rootDir, 'pkg/sample/2/sample@2.4.1.esm.js.map');

		assertStrictEquals((await stat(expectedFile)).isFile, true);
		assertStrictEquals((await stat(expectedMap)).isFile, true);
	});

	it('populates and updates module catalog database with --cat and --upcat', async () => {
		const catPath = path.join(tempDir, 'modules.msjcat');
		await createCatalogDb(catPath);

		const srcPath = path.join(tempDir, 'catalogMod.msjs');
		const slidPath = path.join(tempDir, 'catalogMod.slid');

		const msjsContent = `[(
			modpath='corp/widget'
			version='1.2.0'
			featpro=[ widgetCore ]
			featreq=[ utilFeat ]
			modcaps=[ domStorage ]
		)]
		@c(log "widget code")
		`;
		const slidContent = `[(
			modreq=[ 'corp/util@1.0.0' ]
			deferLoad=[ 'corp/util' ]
		)]`;

		await writeTextFile(srcPath, msjsContent);
		await writeTextFile(slidPath, slidContent);

		// 1. Initial transpile with --cat
		const resTrans = await runTranspiler(['--cat', catPath, srcPath]);
		assertStrictEquals(resTrans.code, 0, resTrans.stderr);

		const db1 = await openDatabase(catPath);
		const rows1 = db1.queryObjects('SELECT path, major, minor, patch, featpro, featreq, modreq, moddefer, modcaps FROM modules');
		assertStrictEquals(rows1.length, 1);
		assertStrictEquals(rows1[0].path, 'corp/widget');
		assertStrictEquals(rows1[0].major, 1);
		assertStrictEquals(rows1[0].minor, 2);
		assertStrictEquals(rows1[0].patch, 0);
		assertStrictEquals(rows1[0].featpro, 'widgetCore');
		assertStrictEquals(rows1[0].featreq, 'utilFeat');
		assertStrictEquals(rows1[0].modreq, 'corp/util@1.0.0');
		assertStrictEquals(rows1[0].moddefer, 'corp/util');
		assertStrictEquals(rows1[0].modcaps, 'domStorage');
		db1.close();

		// 2. Update .slid metadata and run --upcat
		const updatedSlid = `[(
			modreq=[ corp/util@1.2.0 corp/extra@2.0.0 ]
			deferLoad=[ corp/extra ]
		)]`;
		await writeTextFile(slidPath, updatedSlid);

		const resUpcat = await runTranspiler(['--cat', catPath, '--upcat', srcPath]);
		assertStrictEquals(resUpcat.code, 0, resUpcat.stderr);

		const db2 = await openDatabase(catPath);
		const rows2 = db2.queryObjects('SELECT modreq, moddefer FROM modules WHERE path = ?', ['corp/widget']);
		assertStrictEquals(rows2.length, 1);
		assertStrictEquals(rows2[0].modreq, 'corp/util@1.2.0 corp/extra@2.0.0');
		assertStrictEquals(rows2[0].moddefer, 'corp/extra');
		db2.close();
	});

	it('reports errors for syntax issues and non-existent catalog or root', async () => {
		// Syntax error
		const badSyntaxPath = path.join(tempDir, 'bad.msjs');
		await writeTextFile(badSyntaxPath, '@c(broken syntax [[(\n');
		const resSyntax = await runTranspiler([badSyntaxPath]);
		assertNotStrictEquals(resSyntax.code, 0);

		// Non-existent catalog
		const goodPath = path.join(tempDir, 'good.msjs');
		await writeTextFile(goodPath, '@c(log "ok")\n');
		const resNoCat = await runTranspiler(['--cat', path.join(tempDir, 'nonexistent.msjcat'), goodPath]);
		assertNotStrictEquals(resNoCat.code, 0);

		// Non-existent root directory
		const resNoRoot = await runTranspiler(['--root', path.join(tempDir, 'does-not-exist'), goodPath]);
		assertNotStrictEquals(resNoRoot.code, 0);
	});

	describe('Cross-Engine Execution Matrix', () => {
		it({
			name: denoIgnore ? 'Deno not found for MESGJS_ENGINE=deno' : 'executes via MESGJS_ENGINE=deno',
			ignore: denoIgnore,
			fn: async () => {
				const srcPath = path.join(tempDir, 'engine_deno.msjs');
				await writeTextFile(srcPath, '@c(log "engine test")\n');

				const resDeno = await runTranspiler([srcPath], { env: { MESGJS_ENGINE: 'deno' } });
				assertStrictEquals(resDeno.code, 0, resDeno.stderr);
			}
		});

		it({
			name: bunIgnore ? 'Bun or wicbun not found for MESGJS_ENGINE=bun' : 'executes via MESGJS_ENGINE=bun',
			ignore: bunIgnore,
			fn: async () => {
				const srcPath = path.join(tempDir, 'engine_bun.msjs');
				await writeTextFile(srcPath, '@c(log "engine test")\n');

				const resBun = await runTranspiler([srcPath], { env: { MESGJS_ENGINE: 'bun' } });
				assertStrictEquals(resBun.code, 0, resBun.stderr);
			}
		});

		it({
			name: nodeIgnore ? 'Node or wicnode not found for MESGJS_ENGINE=node' : 'executes via MESGJS_ENGINE=node',
			ignore: nodeIgnore,
			fn: async () => {
				const srcPath = path.join(tempDir, 'engine_node.msjs');
				await writeTextFile(srcPath, '@c(log "engine test")\n');

				const resNode = await runTranspiler([srcPath], { env: { MESGJS_ENGINE: 'node' } });
				assertStrictEquals(resNode.code, 0, resNode.stderr);
			}
		});
	});
});
