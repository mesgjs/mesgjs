import { describe, it, beforeEach, afterEach } from '@compat/test';
import { assertMatch, assertNotStrictEquals, assertStrictEquals } from '@std/assert';
import { fromFileUrl, makeTempDir, removeDir, writeTextFile } from '@compat/file';
import { openDatabase } from '@compat/sqlite';
import { spawn } from '@compat/subprocess';
import * as path from '@compat/path';

const __filename = fromFileUrl(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const EDITSCHEMA_BIN = path.join(REPO_ROOT, 'bin/editschema');

let currentTempDir = null;

async function runEditschema (args = [], options = {}) {
	try {
		const proc = spawn(EDITSCHEMA_BIN, args, {
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

async function getColumns (dbPath, tableName) {
	const db = await openDatabase(dbPath);
	const rows = db.query('SELECT name FROM pragma_table_info(?)', [tableName]);
	db.close();
	return rows.flat();
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

describe('editschema CLI Portability Suite', () => {
	let tempDir;

	beforeEach(async () => {
		tempDir = await makeTempDir({ prefix: 'editschema-test-' });
		currentTempDir = tempDir;
	});

	afterEach(async () => {
		currentTempDir = null;
		if (tempDir) {
			await removeDir(tempDir, { recursive: true, force: true });
		}
	});

	it('displays help and exits with 0 when no arguments are provided', async () => {
		const res = await runEditschema([]);
		assertStrictEquals(res.code, 0, res.stderr);
		assertMatch(res.stdout, /Usage:/);
		assertMatch(res.stdout, /editschema <db-file> <slid-file>/);
	});

	it('displays help and exits with 1 when single argument is provided', async () => {
		const res = await runEditschema(['dummy.db']);
		assertStrictEquals(res.code, 1, res.stderr);
		assertMatch(res.stdout, /Usage:/);
	});

	it('applies column additions via SLID add block', async () => {
		const dbPath = path.join(tempDir, 'test.db');
		const db = await openDatabase(dbPath, { create: true });
		db.exec('CREATE TABLE users (id INT PRIMARY KEY, name TEXT);');
		db.close();

		const slidPath = path.join(tempDir, 'add.slid');
		await writeTextFile(slidPath, `[(
			add=[
				users=[
					email='TEXT DEFAULT ""'
					age='INT'
				]
			]
		)]`);

		const res = await runEditschema([dbPath, slidPath]);
		assertStrictEquals(res.code, 0, res.stderr);
		assertMatch(res.stdout, /Adding column email to table users/);
		assertMatch(res.stdout, /Adding column age to table users/);
		assertMatch(res.stdout, /Schema update complete/);

		const cols = await getColumns(dbPath, 'users');
		assertStrictEquals(cols.includes('id'), true);
		assertStrictEquals(cols.includes('name'), true);
		assertStrictEquals(cols.includes('email'), true);
		assertStrictEquals(cols.includes('age'), true);
	});

	it('applies column removals via SLID remove block', async () => {
		const dbPath = path.join(tempDir, 'test.db');
		const db = await openDatabase(dbPath, { create: true });
		db.exec('CREATE TABLE users (id INT PRIMARY KEY, name TEXT, email TEXT, age INT);');
		db.close();

		const slidPath = path.join(tempDir, 'remove.slid');
		await writeTextFile(slidPath, `[(
			remove=[
				users=[ age ]
			]
		)]`);

		const res = await runEditschema([dbPath, slidPath]);
		assertStrictEquals(res.code, 0, res.stderr);
		assertMatch(res.stdout, /Removing column age from table users/);
		assertMatch(res.stdout, /Schema update complete/);

		const cols = await getColumns(dbPath, 'users');
		assertStrictEquals(cols.includes('id'), true);
		assertStrictEquals(cols.includes('name'), true);
		assertStrictEquals(cols.includes('email'), true);
		assertStrictEquals(cols.includes('age'), false);
	});

	it('skips existing columns on add and missing columns on remove gracefully', async () => {
		const dbPath = path.join(tempDir, 'test.db');
		const db = await openDatabase(dbPath, { create: true });
		db.exec('CREATE TABLE users (id INT PRIMARY KEY, name TEXT);');
		db.close();

		const slidPath = path.join(tempDir, 'noop.slid');
		await writeTextFile(slidPath, `[(
			add=[
				users=[ name='TEXT' ]
			]
			remove=[
				users=[ non_existent_col ]
			]
		)]`);

		const res = await runEditschema([dbPath, slidPath]);
		assertStrictEquals(res.code, 0, res.stderr);
		assertMatch(res.stderr, /Column name already exists/);
		assertMatch(res.stderr, /Column non_existent_col not found/);
	});

	it('rejects invalid table or column identifiers to prevent SQL injection', async () => {
		const dbPath = path.join(tempDir, 'test.db');
		const db = await openDatabase(dbPath, { create: true });
		db.exec('CREATE TABLE users (id INT PRIMARY KEY, name TEXT);');
		db.close();

		const slidPath = path.join(tempDir, 'invalid_ident.slid');
		await writeTextFile(slidPath, `[(
			add=[
				'users; DROP TABLE users;'=[ evil='TEXT' ]
			]
		)]`);

		const res = await runEditschema([dbPath, slidPath]);
		assertNotStrictEquals(res.code, 0);
		assertMatch(res.stderr, /Invalid identifier/);
	});

	it('rejects field specifications with semicolons', async () => {
		const dbPath = path.join(tempDir, 'test.db');
		const db = await openDatabase(dbPath, { create: true });
		db.exec('CREATE TABLE users (id INT PRIMARY KEY, name TEXT);');
		db.close();

		const slidPath = path.join(tempDir, 'semicolon.slid');
		await writeTextFile(slidPath, `[(
			add=[
				users=[ bad_col='TEXT; DROP TABLE users' ]
			]
		)]`);

		const res = await runEditschema([dbPath, slidPath]);
		assertNotStrictEquals(res.code, 0);
		assertMatch(res.stderr, /Invalid characters in field spec/);
	});

	describe('Cross-Engine Execution Matrix', () => {
		it({
			name: denoIgnore ? 'Deno not found for MESGJS_ENGINE=deno' : 'executes via MESGJS_ENGINE=deno',
			ignore: denoIgnore,
			fn: async () => {
				const res = await runEditschema([], { env: { MESGJS_ENGINE: 'deno' } });
				assertStrictEquals(res.code, 0, res.stderr);
				assertMatch(res.stdout, /Usage:/);
			}
		});

		it({
			name: bunIgnore ? 'Bun or wicbun not found for MESGJS_ENGINE=bun' : 'executes via MESGJS_ENGINE=bun',
			ignore: bunIgnore,
			fn: async () => {
				const res = await runEditschema([], { env: { MESGJS_ENGINE: 'bun' } });
				assertStrictEquals(res.code, 0, res.stderr);
				assertMatch(res.stdout, /Usage:/);
			}
		});

		it({
			name: nodeIgnore ? 'Node or wicnode not found for MESGJS_ENGINE=node' : 'executes via MESGJS_ENGINE=node',
			ignore: nodeIgnore,
			fn: async () => {
				const res = await runEditschema([], { env: { MESGJS_ENGINE: 'node' } });
				assertStrictEquals(res.code, 0, res.stderr);
				assertMatch(res.stdout, /Usage:/);
			}
		});
	});
});
