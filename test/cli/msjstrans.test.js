import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const MSJSTRANS_BIN = path.join(REPO_ROOT, 'bin/msjstrans');

let currentTempDir = null;

async function runTranspiler (args = [], options = {}) {
	try {
		const { stdout, stderr } = await execFileAsync(MSJSTRANS_BIN, args, {
			cwd: options.cwd || currentTempDir || REPO_ROOT,
			env: { ...process.env, ...options.env }
		});
		return { code: 0, stdout, stderr };
	} catch (err) {
		return {
			code: err.code ?? 1,
			stdout: err.stdout ?? '',
			stderr: err.stderr ?? err.message
		};
	}
}

function createCatalogDb (dbPath) {
	const db = new DatabaseSync(dbPath);
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

describe('msjstrans CLI Portability Suite', () => {
	let tempDir;

	test.beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'msjstrans-test-'));
		currentTempDir = tempDir;
	});

	test.afterEach(async () => {
		currentTempDir = null;
		if (tempDir) {
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	});

	it('transpiles basic .msjs to .esm.js and generates sourcemap', async () => {
		const srcPath = path.join(tempDir, 'sample.msjs');
		await fs.writeFile(srcPath, '@c(log "hello world")\n', 'utf8');

		const res = await runTranspiler([srcPath]);
		assert.strictEqual(res.code, 0, res.stderr);

		const outPath = path.join(tempDir, 'sample.esm.js');
		const outMap = path.join(tempDir, 'sample.esm.js.map');

		const outContent = await fs.readFile(outPath, 'utf8');
		assert.match(outContent, /hello world/);
		assert.match(outContent, /\/\/# sourceMappingURL=sample\.esm\.js\.map/);

		const mapStat = await fs.stat(outMap);
		assert.strictEqual(mapStat.isFile(), true);
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
		await fs.writeFile(srcPath, content, 'utf8');

		const res = await runTranspiler(['--inc-slid', srcPath]);
		assert.strictEqual(res.code, 0, res.stderr);

		const outContent = await fs.readFile(path.join(tempDir, 'slidMod.esm.js'), 'utf8');
		assert.match(outContent, /\/\*\[\(/);
		assert.match(outContent, /modpath=sampleMod/);
		assert.doesNotMatch(outContent, /Embedded comment inside SLID/);
	});

	it('displays lexical tokens with --tokens', async () => {
		const srcPath = path.join(tempDir, 'tokens.msjs');
		await fs.writeFile(srcPath, '@c(log "tokens test")\n', 'utf8');

		const res = await runTranspiler(['--tokens', '--no-js', srcPath]);
		assert.strictEqual(res.code, 0, res.stderr);
		assert.match(res.stdout, /TOKENS/);
		assert.match(res.stdout, /tokens test/);
	});

	it('displays parse tree with --tree', async () => {
		const srcPath = path.join(tempDir, 'tree.msjs');
		await fs.writeFile(srcPath, '@c(log "tree test")\n', 'utf8');

		const res = await runTranspiler(['--tree', '--no-js', srcPath]);
		assert.strictEqual(res.code, 0, res.stderr);
		assert.match(res.stdout, /PARSE TREE/);
	});

	it('skips output file generation when --no-js is supplied', async () => {
		const srcPath = path.join(tempDir, 'nojs.msjs');
		await fs.writeFile(srcPath, '@c(log "no js generation")\n', 'utf8');

		const res = await runTranspiler(['--no-js', srcPath]);
		assert.strictEqual(res.code, 0, res.stderr);

		const outPath = path.join(tempDir, 'nojs.esm.js');
		await assert.rejects(async () => fs.stat(outPath));
	});

	it('handles @debug blocks according to --enable-debug flag', async () => {
		const srcPath = path.join(tempDir, 'debug.msjs');
		const content = `@debug{
			@c(log "DEBUG_ONLY_LOG")
		}
		@c(log "ALWAYS_LOG")
		`;
		await fs.writeFile(srcPath, content, 'utf8');

		// Default: @debug excluded
		const resDefault = await runTranspiler([srcPath]);
		assert.strictEqual(resDefault.code, 0, resDefault.stderr);
		const outDefault = await fs.readFile(path.join(tempDir, 'debug.esm.js'), 'utf8');
		assert.doesNotMatch(outDefault, /DEBUG_ONLY_LOG/);
		assert.match(outDefault, /ALWAYS_LOG/);

		// With --enable-debug: @debug included
		const resEnabled = await runTranspiler(['--enable-debug', srcPath]);
		assert.strictEqual(resEnabled.code, 0, resEnabled.stderr);
		const outEnabled = await fs.readFile(path.join(tempDir, 'debug.esm.js'), 'utf8');
		assert.match(outEnabled, /DEBUG_ONLY_LOG/);
		assert.match(outEnabled, /ALWAYS_LOG/);
	});

	it('handles @js blocks and comment stripping with --enable-js and --no-strip-jsec', async () => {
		const srcPath = path.join(tempDir, 'jsblock.msjs');
		const content = `@js{
			// This is a JS comment
			console.log("embedded js");
		@}`;
		await fs.writeFile(srcPath, content, 'utf8');

		// Disallowed by default without --enable-js
		const resDisallowed = await runTranspiler([srcPath]);
		assert.notStrictEqual(resDisallowed.code, 0);

		// Allowed with --enable-js (comments stripped by default)
		const resStripped = await runTranspiler(['--enable-js', srcPath]);
		assert.strictEqual(resStripped.code, 0, resStripped.stderr);
		const outStripped = await fs.readFile(path.join(tempDir, 'jsblock.esm.js'), 'utf8');
		assert.match(outStripped, /embedded js/);
		assert.doesNotMatch(outStripped, /This is a JS comment/);

		// Allowed with --enable-js and --no-strip-jsec (comments retained)
		const resRetained = await runTranspiler(['--enable-js', '--no-strip-jsec', srcPath]);
		assert.strictEqual(resRetained.code, 0, resRetained.stderr);
		const outRetained = await fs.readFile(path.join(tempDir, 'jsblock.esm.js'), 'utf8');
		assert.match(outRetained, /embedded js/);
		assert.match(outRetained, /This is a JS comment/);
	});

	it('supports structured output directory hierarchy with --root, --mod, and --ver', async () => {
		const srcPath = path.join(tempDir, 'hier.msjs');
		const content = `[(
			modpath=pkg/sample
			version='2.4.1'
		)]
		@c(log "hierarchy test")
		`;
		await fs.writeFile(srcPath, content, 'utf8');

		const rootDir = path.join(tempDir, 'dist');
		await fs.mkdir(rootDir);

		const res = await runTranspiler(['--root', rootDir, '--mod', '--ver', srcPath]);
		assert.strictEqual(res.code, 0, res.stderr);

		const expectedFile = path.join(rootDir, 'pkg/sample/2/sample@2.4.1.esm.js');
		const expectedMap = path.join(rootDir, 'pkg/sample/2/sample@2.4.1.esm.js.map');

		assert.strictEqual((await fs.stat(expectedFile)).isFile(), true);
		assert.strictEqual((await fs.stat(expectedMap)).isFile(), true);
	});

	it('populates and updates module catalog database with --cat and --upcat', async () => {
		const catPath = path.join(tempDir, 'modules.msjcat');
		createCatalogDb(catPath);

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

		await fs.writeFile(srcPath, msjsContent, 'utf8');
		await fs.writeFile(slidPath, slidContent, 'utf8');

		// 1. Initial transpile with --cat
		const resTrans = await runTranspiler(['--cat', catPath, srcPath]);
		assert.strictEqual(resTrans.code, 0, resTrans.stderr);

		const db = new DatabaseSync(catPath);
		const rows1 = db.prepare('SELECT path, major, minor, patch, featpro, featreq, modreq, moddefer, modcaps FROM modules').all();
		assert.strictEqual(rows1.length, 1);
		assert.strictEqual(rows1[0].path, 'corp/widget');
		assert.strictEqual(rows1[0].major, 1);
		assert.strictEqual(rows1[0].minor, 2);
		assert.strictEqual(rows1[0].patch, 0);
		assert.strictEqual(rows1[0].featpro, 'widgetCore');
		assert.strictEqual(rows1[0].featreq, 'utilFeat');
		assert.strictEqual(rows1[0].modreq, 'corp/util@1.0.0');
		assert.strictEqual(rows1[0].moddefer, 'corp/util');
		assert.strictEqual(rows1[0].modcaps, 'domStorage');

		// 2. Update .slid metadata and run --upcat
		const updatedSlid = `[(
			modreq=[ corp/util@1.2.0 corp/extra@2.0.0 ]
			deferLoad=[ corp/extra ]
		)]`;
		await fs.writeFile(slidPath, updatedSlid, 'utf8');

		const resUpcat = await runTranspiler(['--cat', catPath, '--upcat', srcPath]);
		assert.strictEqual(resUpcat.code, 0, resUpcat.stderr);

		const rows2 = db.prepare('SELECT modreq, moddefer FROM modules WHERE path = ?').all('corp/widget');
		assert.strictEqual(rows2.length, 1);
		assert.strictEqual(rows2[0].modreq, 'corp/util@1.2.0 corp/extra@2.0.0');
		assert.strictEqual(rows2[0].moddefer, 'corp/extra');

		db.close();
	});

	it('reports errors for syntax issues and non-existent catalog or root', async () => {
		// Syntax error
		const badSyntaxPath = path.join(tempDir, 'bad.msjs');
		await fs.writeFile(badSyntaxPath, '@c(broken syntax [[(\n', 'utf8');
		const resSyntax = await runTranspiler([badSyntaxPath]);
		assert.notStrictEqual(resSyntax.code, 0);

		// Non-existent catalog
		const goodPath = path.join(tempDir, 'good.msjs');
		await fs.writeFile(goodPath, '@c(log "ok")\n', 'utf8');
		const resNoCat = await runTranspiler(['--cat', path.join(tempDir, 'nonexistent.msjcat'), goodPath]);
		assert.notStrictEqual(resNoCat.code, 0);

		// Non-existent root directory
		const resNoRoot = await runTranspiler(['--root', path.join(tempDir, 'does-not-exist'), goodPath]);
		assert.notStrictEqual(resNoRoot.code, 0);
	});

	describe('Cross-Engine Execution Matrix', () => {
		it('executes via MESGJS_ENGINE=deno', async (t) => {
			const hasDeno = await execFileAsync('which', ['deno']).then(() => true).catch(() => false);
			if (!hasDeno) {
				t?.skip?.('Deno engine not found');
				return;
			}
			const srcPath = path.join(tempDir, 'engine_deno.msjs');
			await fs.writeFile(srcPath, '@c(log "engine test")\n', 'utf8');

			const resDeno = await runTranspiler([srcPath], { env: { MESGJS_ENGINE: 'deno' } });
			assert.strictEqual(resDeno.code, 0, resDeno.stderr);
		});

		it('executes via MESGJS_ENGINE=bun', async (t) => {
			const hasBun = await execFileAsync('which', ['bun']).then(() => true).catch(() => false);
			const hasWicbun = await execFileAsync('which', ['wicbun']).then(() => true).catch(() => false);
			if (!hasBun || !hasWicbun) {
				t?.skip?.('Bun or wicbun not found');
				return;
			}
			const srcPath = path.join(tempDir, 'engine_bun.msjs');
			await fs.writeFile(srcPath, '@c(log "engine test")\n', 'utf8');

			const resBun = await runTranspiler([srcPath], { env: { MESGJS_ENGINE: 'bun' } });
			assert.strictEqual(resBun.code, 0, resBun.stderr);
		});

		it('executes via MESGJS_ENGINE=node', async (t) => {
			const hasNode = await execFileAsync('which', ['node']).then(() => true).catch(() => false);
			const hasWicnode = await execFileAsync('which', ['wicnode']).then(() => true).catch(() => false);
			if (!hasNode || !hasWicnode) {
				t?.skip?.('Node or wicnode not found');
				return;
			}
			const srcPath = path.join(tempDir, 'engine_node.msjs');
			await fs.writeFile(srcPath, '@c(log "engine test")\n', 'utf8');

			const resNode = await runTranspiler([srcPath], { env: { MESGJS_ENGINE: 'node' } });
			assert.strictEqual(resNode.code, 0, resNode.stderr);
		});
	});
});
