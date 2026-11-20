import { describe, it, beforeEach, afterEach } from '@compat/test';
import { assertMatch, assertNotStrictEquals, assertStrictEquals } from '@std/assert';
import { fromFileUrl, makeTempDir, removeDir } from '@compat/file';
import { openDatabase } from '@compat/sqlite';
import { spawn } from '@compat/subprocess';
import * as path from '@compat/path';

const __filename = fromFileUrl(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const MSJSCAT_BIN = path.join(REPO_ROOT, 'bin/msjscat');

let currentTempDir = null;

async function runMsjscat (args = [], options = {}) {
	try {
		const proc = spawn(MSJSCAT_BIN, args, {
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

describe('msjscat CLI Portability Suite', () => {
	let tempDir;

	beforeEach(async () => {
		tempDir = await makeTempDir({ prefix: 'msjscat-test-' });
		currentTempDir = tempDir;
	});

	afterEach(async () => {
		currentTempDir = null;
		if (tempDir) {
			await removeDir(tempDir, { recursive: true, force: true });
		}
	});

	it('initializes catalog tables on empty or new database', async () => {
		const dbName = path.join(tempDir, 'custom_cat');
		const res = await runMsjscat(['--db', dbName]);
		assertStrictEquals(res.code, 0, res.stderr);

		const db = await openDatabase(dbName + '.msjcat');
		const tables = db.query("SELECT name FROM sqlite_master WHERE type='table'").flat();
		assertStrictEquals(tables.includes('path_map'), true);
		assertStrictEquals(tables.includes('modules'), true);
		db.close();
	});

	it('performs path-map insertion, query, listing, resolution, and removal', async () => {
		const dbName = path.join(tempDir, 'testcat');

		// 1. Insert exact and prefix path-maps
		const resInsert1 = await runMsjscat(['--db', dbName, '--mapin', 'corp/util', '--mapout', 'https://cdn.example.com/util.esm.js']);
		assertStrictEquals(resInsert1.code, 0, resInsert1.stderr);

		const resInsert2 = await runMsjscat(['--db', dbName, '--mapin', 'corp/extra/', '--mapout', 'https://cdn.example.com/extra/']);
		assertStrictEquals(resInsert2.code, 0, resInsert2.stderr);

		// 2. Query path-map
		const resQuery = await runMsjscat(['--db', dbName, '--mapin', 'corp/util']);
		assertStrictEquals(resQuery.code, 0, resQuery.stderr);
		assertMatch(resQuery.stdout, /corp\/util: https:\/\/cdn\.example\.com\/util\.esm\.js/);

		// 3. List path-maps
		const resList = await runMsjscat(['--db', dbName, '--lsmap']);
		assertStrictEquals(resList.code, 0, resList.stderr);
		assertMatch(resList.stdout, /corp\/util: https:\/\/cdn\.example\.com\/util\.esm\.js/);
		assertMatch(resList.stdout, /corp\/extra\/: https:\/\/cdn\.example\.com\/extra\//);

		// 4. Resolve exact and prefix path mappings with --map
		const resMapExact = await runMsjscat(['--db', dbName, '--map', 'corp/util']);
		assertStrictEquals(resMapExact.code, 0, resMapExact.stderr);
		assertMatch(resMapExact.stdout, /Output: https:\/\/cdn\.example\.com\/util\.esm\.js/);

		const resMapPrefix = await runMsjscat(['--db', dbName, '--map', 'corp/extra/submodule']);
		assertStrictEquals(resMapPrefix.code, 0, resMapPrefix.stderr);
		assertMatch(resMapPrefix.stdout, /Output: https:\/\/cdn\.example\.com\/extra\/submodule/);

		// 5. Remove path-map
		const resRm = await runMsjscat(['--db', dbName, '--mapin', 'corp/util', '--rmmap']);
		assertStrictEquals(resRm.code, 0, resRm.stderr);

		// 6. Verify removal
		const resQueryAfter = await runMsjscat(['--db', dbName, '--mapin', 'corp/util']);
		assertStrictEquals(resQueryAfter.code, 0, resQueryAfter.stderr);
		assertMatch(resQueryAfter.stdout, /Path-map entry "corp\/util" not found/);
	});

	it('queries and filters module entries via --lsmod and --mod', async () => {
		const dbName = path.join(tempDir, 'modcat');
		const dbPath = dbName + '.msjcat';
		const db = await openDatabase(dbPath, { create: true });
		db.exec(`
			CREATE TABLE IF NOT EXISTS path_map (input TEXT PRIMARY KEY, output TEXT);
			CREATE TABLE IF NOT EXISTS modules (
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

		db.query(`INSERT INTO modules (path, major, minor, patch, extver, integrity, featpro, featreq, modreq)
			VALUES
			('pkg/app', 1, 0, 0, '', 'sha-100', 'appCore', '', 'corp/util@1.0.0'),
			('pkg/app', 1, 2, 0, '', 'sha-120', 'appCore', 'extra', 'corp/util@1.2.0'),
			('pkg/app', 2, 0, 0, '', 'sha-200', 'appCoreV2', '', ''),
			('pkg/lib', 1, 0, 0, '', 'sha-lib', 'libCore', '', '');
		`);
		db.close();

		// 1. All modules
		const resAll = await runMsjscat(['--db', dbName, '--lsmod']);
		assertStrictEquals(resAll.code, 0, resAll.stderr);
		assertMatch(resAll.stdout, /\* pkg\/app 1\.0\.0:/);
		assertMatch(resAll.stdout, /\* pkg\/app 1\.2\.0:/);
		assertMatch(resAll.stdout, /\* pkg\/app 2\.0\.0:/);
		assertMatch(resAll.stdout, /\* pkg\/lib 1\.0\.0:/);

		// 2. Prefix match
		const resPrefix = await runMsjscat(['--db', dbName, '--lsmod', '--mod', 'pkg/']);
		assertStrictEquals(resPrefix.code, 0, resPrefix.stderr);
		assertMatch(resPrefix.stdout, /\* pkg\/app 1\.0\.0:/);
		assertMatch(resPrefix.stdout, /\* pkg\/lib 1\.0\.0:/);

		// 3. Filter major version
		const resMajor = await runMsjscat(['--db', dbName, '--lsmod', '--mod', 'pkg/app@1']);
		assertStrictEquals(resMajor.code, 0, resMajor.stderr);
		assertMatch(resMajor.stdout, /\* pkg\/app 1\.0\.0:/);
		assertMatch(resMajor.stdout, /\* pkg\/app 1\.2\.0:/);
		assertStrictEquals(resMajor.stdout.includes('pkg/app 2.0.0'), false);
		assertStrictEquals(resMajor.stdout.includes('pkg/lib'), false);

		// 4. Filter minor version
		const resMinor = await runMsjscat(['--db', dbName, '--lsmod', '--mod', 'pkg/app@1.2']);
		assertStrictEquals(resMinor.code, 0, resMinor.stderr);
		assertMatch(resMinor.stdout, /\* pkg\/app 1\.2\.0:/);
		assertStrictEquals(resMinor.stdout.includes('pkg/app 1.0.0'), false);

		// 5. Filter exact patch version
		const resPatch = await runMsjscat(['--db', dbName, '--lsmod', '--mod', 'pkg/app@1.2.0']);
		assertStrictEquals(resPatch.code, 0, resPatch.stderr);
		assertMatch(resPatch.stdout, /\* pkg\/app 1\.2\.0:/);
		assertMatch(resPatch.stdout, /Features provided: appCore/);
		assertMatch(resPatch.stdout, /Features required: extra/);
		assertMatch(resPatch.stdout, /Modules required: corp\/util@1\.2\.0/);
	});

	describe('Cross-Engine Execution Matrix', () => {
		it('executes via MESGJS_ENGINE=deno', async () => {
			const hasDeno = await spawn('which', ['deno']).status.then((st) => st.success).catch(() => false);
			if (!hasDeno) {
				it.skip?.('Deno engine not found');
				return;
			}
			const dbName = path.join(tempDir, 'engine_deno');
			const res = await runMsjscat(['--db', dbName, '--lsmap'], { env: { MESGJS_ENGINE: 'deno' } });
			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /Path-map entries:/);
		});

		it('executes via MESGJS_ENGINE=bun', async () => {
			const hasBun = await spawn('which', ['bun']).status.then((st) => st.success).catch(() => false);
			const hasWicbun = await spawn('which', ['wicbun']).status.then((st) => st.success).catch(() => false);
			if (!hasBun || !hasWicbun) {
				it.skip?.('Bun or wicbun not found');
				return;
			}
			const dbName = path.join(tempDir, 'engine_bun');
			const res = await runMsjscat(['--db', dbName, '--lsmap'], { env: { MESGJS_ENGINE: 'bun' } });
			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /Path-map entries:/);
		});

		it('executes via MESGJS_ENGINE=node', async () => {
			const hasNode = await spawn('which', ['node']).status.then((st) => st.success).catch(() => false);
			const hasWicnode = await spawn('which', ['wicnode']).status.then((st) => st.success).catch(() => false);
			if (!hasNode || !hasWicnode) {
				it.skip?.('Node or wicnode not found');
				return;
			}
			const dbName = path.join(tempDir, 'engine_node');
			const res = await runMsjscat(['--db', dbName, '--lsmap'], { env: { MESGJS_ENGINE: 'node' } });
			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /Path-map entries:/);
		});
	});
});
