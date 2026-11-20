import { describe, it, beforeEach, afterEach } from '@compat/test';
import { assertMatch, assertNotStrictEquals, assertStrictEquals } from '@std/assert';
import { fromFileUrl, makeTempDir, readTextFile, removeDir, writeTextFile } from '@compat/file';
import { openDatabase } from '@compat/sqlite';
import { spawn } from '@compat/subprocess';
import * as path from '@compat/path';

const __filename = fromFileUrl(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const MSJSLOAD_BIN = path.join(REPO_ROOT, 'bin/msjsload');

let currentTempDir = null;

async function runMsjsload (args = [], options = {}) {
	try {
		const proc = spawn(MSJSLOAD_BIN, args, {
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

async function createCatalog (dbPath) {
	const db = await openDatabase(dbPath, { create: true });
	db.exec(`
		CREATE TABLE path_map (input TEXT PRIMARY KEY, output TEXT);
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
	return db;
}

describe('msjsload CLI Portability Suite', () => {
	let tempDir;

	beforeEach(async () => {
		tempDir = await makeTempDir({ prefix: 'msjsload-test-' });
		currentTempDir = tempDir;
	});

	afterEach(async () => {
		currentTempDir = null;
		if (tempDir) {
			await removeDir(tempDir, { recursive: true, force: true });
		}
	});

	it('resolves dependencies and links single entry point', async () => {
		const catPath = path.join(tempDir, 'catalog.msjcat');
		const db = await createCatalog(catPath);
		db.query(`INSERT INTO path_map (input, output) VALUES
			('mesgjs/runtime/', 'https://cdn.example.com/mesgjs/runtime/'),
			('core/app', 'https://cdn.example.com/core/app.esm.js'),
			('core/util', 'https://cdn.example.com/core/util.esm.js');
		`);
		db.query(`INSERT INTO modules (path, major, minor, patch, extver, integrity, featpro, featreq, modreq)
			VALUES
			('core/app', 1, 0, 0, '', 'sha-app', 'appFeat', '', 'core/util 1<2'),
			('core/util', 1, 2, 0, '', 'sha-util', 'utilFeat', '', '');
		`);
		db.close();

		const slidPath = path.join(tempDir, 'entry.slid');
		await writeTextFile(slidPath, `[(
			modreq=[ 'core/app 1<2' ]
		)]`);

		const res = await runMsjsload(['--cat', catPath, slidPath]);
		assertStrictEquals(res.code, 0, res.stderr);
		assertMatch(res.stdout, /Module dependencies resolved:/);
		assertMatch(res.stdout, /core\/app@1\.0\.0/);
		assertMatch(res.stdout, /core\/util@1\.2\.0/);
		assertMatch(res.stdout, /setModMeta\(/);
	});

	it('handles dual entry points (server and client)', async () => {
		const catPath = path.join(tempDir, 'catalog.msjcat');
		const db = await createCatalog(catPath);
		db.query(`INSERT INTO modules (path, major, minor, patch, extver, integrity, featpro, featreq, modreq)
			VALUES
			('svr/mod', 1, 0, 0, '', 'sha-svr', '', '', ''),
			('cli/mod', 1, 0, 0, '', 'sha-cli', '', '', '');
		`);
		db.close();

		const serverSlid = path.join(tempDir, 'server.slid');
		await writeTextFile(serverSlid, `[( modreq=[ 'svr/mod 1<2' ] )]`);

		const clientSlid = path.join(tempDir, 'client.slid');
		await writeTextFile(clientSlid, `[( modreq=[ 'cli/mod 1<2' ] )]`);

		const res = await runMsjsload(['--cat', catPath, serverSlid, clientSlid]);
		assertStrictEquals(res.code, 0, res.stderr);
		assertMatch(res.stdout, /setModMeta\(/);
		assertMatch(res.stdout, /"client":/);
		assertMatch(res.stdout, /cli\/mod/);
	});

	it('supports file output via --out and HTML wrapper via --html', async () => {
		const catPath = path.join(tempDir, 'catalog.msjcat');
		const db = await createCatalog(catPath);
		db.query(`INSERT INTO modules (path, major, minor, patch, extver, integrity, featpro, featreq, modreq)
			VALUES ('pkg/m', 1, 0, 0, '', 'sha-m', '', '', '');
		`);
		db.close();

		const slidPath = path.join(tempDir, 'app.slid');
		await writeTextFile(slidPath, `[( modreq=[ 'pkg/m 1.0.0' ] )]`);

		const outPath = path.join(tempDir, 'bundle.html');
		const res = await runMsjsload(['--cat', catPath, '--html', '--out', outPath, slidPath]);
		assertStrictEquals(res.code, 0, res.stderr);

		const outContent = await readTextFile(outPath);
		assertMatch(outContent, /<script type='module'>/);
		assertMatch(outContent, /setModMeta\(/);
		assertMatch(outContent, /<\/script>/);
	});

	it('prefers newest module versions in resolution and honors modforce', async () => {
		const catPath = path.join(tempDir, 'catalog.msjcat');
		const db = await createCatalog(catPath);
		db.query(`INSERT INTO modules (path, major, minor, patch, extver, integrity, featpro, featreq, modreq)
			VALUES
			('pkg/dep', 1, 0, 0, '', 'sha-100', '', '', ''),
			('pkg/dep', 1, 1, 0, '', 'sha-110', '', '', ''),
			('pkg/dep', 1, 5, 0, '', 'sha-150', '', '', ''),
			('pkg/dep', 2, 0, 0, '', 'sha-200', '', '', '');
		`);
		db.close();

		// 1. Should pick highest ^1.0.0 -> 1.5.0
		const slidPath1 = path.join(tempDir, 'newest.slid');
		await writeTextFile(slidPath1, `[( modreq=[ 'pkg/dep 1<2' ] )]`);
		const resNewest = await runMsjsload(['--cat', catPath, slidPath1]);
		assertStrictEquals(resNewest.code, 0, resNewest.stderr);
		assertMatch(resNewest.stdout, /pkg\/dep@1\.5\.0/);

		// 2. Forced version override via modforce
		const slidPath2 = path.join(tempDir, 'forced.slid');
		await writeTextFile(slidPath2, `[(
			modreq=[ 'pkg/dep 1<2' ]
			modforce=[ 'pkg/dep@1.0.0' ]
		)]`);
		const resForced = await runMsjsload(['--cat', catPath, slidPath2]);
		assertStrictEquals(resForced.code, 0, resForced.stderr);
		assertMatch(resForced.stdout, /Forcing the following module versions:\n\tpkg\/dep@1\.0\.0/);
		assertMatch(resForced.stdout, /pkg\/dep@1\.0\.0/);
	});

	it('warns on missing required features or incompatible forced versions', async () => {
		const catPath = path.join(tempDir, 'catalog.msjcat');
		const db = await createCatalog(catPath);
		db.query(`INSERT INTO modules (path, major, minor, patch, extver, integrity, featpro, featreq, modreq)
			VALUES
			('mod/a', 1, 0, 0, '', 'sha-a', '', 'missing_feat', 'mod/b 2<3'),
			('mod/b', 1, 0, 0, '', 'sha-b1', '', '', ''),
			('mod/b', 2, 0, 0, '', 'sha-b2', '', '', '');
		`);
		db.close();

		const slidPath = path.join(tempDir, 'warnings.slid');
		await writeTextFile(slidPath, `[(
			modreq=[ 'mod/a 1<2' ]
			modforce=[ 'mod/b@1.0.0' ]
		)]`);

		const res = await runMsjsload(['--cat', catPath, slidPath]);
		assertStrictEquals(res.code, 0, res.stderr);
		assertMatch(res.stderr, /Warning: Module mod\/a@1\.0\.0 might not work with forced mod\/b@1\.0\.0/);
		assertMatch(res.stderr, /Warning: Module mod\/a@1\.0\.0 requires missing feature missing_feat/);
	});

	it('fails when requirements cannot be satisfied or entry point is omitted', async () => {
		const catPath = path.join(tempDir, 'catalog.msjcat');
		const db = await createCatalog(catPath);
		db.close();

		// 1. Missing entry point argument
		const resMissingArg = await runMsjsload(['--cat', catPath]);
		assertNotStrictEquals(resMissingArg.code, 0);
		assertMatch(resMissingArg.stderr, /Error: Entry point module or \.esm\.js\/\.msjs\/\.slid file required/);

		// 2. Unsatisfied module dependency
		const slidPath = path.join(tempDir, 'unsatisfied.slid');
		await writeTextFile(slidPath, `[( modreq=[ 'nonexistent/pkg 1<2' ] )]`);
		const resUnsat = await runMsjsload(['--cat', catPath, slidPath]);
		assertNotStrictEquals(resUnsat.code, 0);
		assertMatch(resUnsat.stderr, /Error: No module nonexistent\/pkg version satisfies/);
	});

	describe('Cross-Engine Execution Matrix', () => {
		it('executes via MESGJS_ENGINE=deno', async () => {
			const hasDeno = await spawn('which', ['deno']).status.then((st) => st.success).catch(() => false);
			if (!hasDeno) {
				it.skip?.('Deno engine not found');
				return;
			}
			const catPath = path.join(tempDir, 'eng_deno.msjcat');
			const db = await createCatalog(catPath);
			db.query(`INSERT INTO modules (path, major, minor, patch, extver, integrity) VALUES ('eng/mod', 1, 0, 0, '', 'sha');`);
			db.close();

			const slidPath = path.join(tempDir, 'eng_deno.slid');
			await writeTextFile(slidPath, `[( modreq=[ 'eng/mod 1.0.0' ] )]`);

			const res = await runMsjsload(['--cat', catPath, slidPath], { env: { MESGJS_ENGINE: 'deno' } });
			assertStrictEquals(res.code, 0, res.stderr);
		});

		it('executes via MESGJS_ENGINE=bun', async () => {
			const hasBun = await spawn('which', ['bun']).status.then((st) => st.success).catch(() => false);
			const hasWicbun = await spawn('which', ['wicbun']).status.then((st) => st.success).catch(() => false);
			if (!hasBun || !hasWicbun) {
				it.skip?.('Bun or wicbun not found');
				return;
			}
			const catPath = path.join(tempDir, 'eng_bun.msjcat');
			const db = await createCatalog(catPath);
			db.query(`INSERT INTO modules (path, major, minor, patch, extver, integrity) VALUES ('eng/mod', 1, 0, 0, '', 'sha');`);
			db.close();

			const slidPath = path.join(tempDir, 'eng_bun.slid');
			await writeTextFile(slidPath, `[( modreq=[ 'eng/mod 1.0.0' ] )]`);

			const res = await runMsjsload(['--cat', catPath, slidPath], { env: { MESGJS_ENGINE: 'bun' } });
			assertStrictEquals(res.code, 0, res.stderr);
		});

		it('executes via MESGJS_ENGINE=node', async () => {
			const hasNode = await spawn('which', ['node']).status.then((st) => st.success).catch(() => false);
			const hasWicnode = await spawn('which', ['wicnode']).status.then((st) => st.success).catch(() => false);
			if (!hasNode || !hasWicnode) {
				it.skip?.('Node or wicnode not found');
				return;
			}
			const catPath = path.join(tempDir, 'eng_node.msjcat');
			const db = await createCatalog(catPath);
			db.query(`INSERT INTO modules (path, major, minor, patch, extver, integrity) VALUES ('eng/mod', 1, 0, 0, '', 'sha');`);
			db.close();

			const slidPath = path.join(tempDir, 'eng_node.slid');
			await writeTextFile(slidPath, `[( modreq=[ 'eng/mod 1.0.0' ] )]`);

			const res = await runMsjsload(['--cat', catPath, slidPath], { env: { MESGJS_ENGINE: 'node' } });
			assertStrictEquals(res.code, 0, res.stderr);
		});
	});
});
