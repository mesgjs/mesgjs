import { describe, it, beforeEach, afterEach } from '@compat/test';
import { assertMatch, assertNotStrictEquals, assertStrictEquals } from '@std/assert';
import { fromFileUrl, makeTempDir, removeDir, writeTextFile } from '@compat/file';
import { spawn } from '@compat/subprocess';
import * as path from '@compat/path';

const __filename = fromFileUrl(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const MSJSERRMAP_BIN = path.join(REPO_ROOT, 'bin/msjserrmap');
const MSJSTRANS_BIN = path.join(REPO_ROOT, 'bin/msjstrans');

let currentTempDir = null;

async function runMsjserrmap (args = [], options = {}) {
	try {
		const proc = spawn(MSJSERRMAP_BIN, args, {
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

async function runTranspiler (args = []) {
	const proc = spawn(MSJSTRANS_BIN, args, {
		cwd: currentTempDir || REPO_ROOT,
	});
	return await proc.text();
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

describe('msjserrmap CLI Portability Suite', () => {
	let tempDir;

	beforeEach(async () => {
		tempDir = await makeTempDir({ prefix: 'msjserrmap-test-' });
		currentTempDir = tempDir;
	});

	afterEach(async () => {
		currentTempDir = null;
		if (tempDir) {
			await removeDir(tempDir, { recursive: true, force: true });
		}
	});

	it('maps JavaScript generated error location to Mesgjs source', async () => {
		const srcPath = path.join(tempDir, 'sample.msjs');
		await writeTextFile(srcPath, '@c(throw "an error")\n');

		const transRes = await runTranspiler([srcPath]);
		assertStrictEquals(transRes.code, 0, transRes.stderr);

		const mapPath = path.join(tempDir, 'sample.esm.js.map');
		const res = await runMsjserrmap([mapPath, '2:3']);
		assertStrictEquals(res.code, 0, res.stderr);
		assertMatch(res.stdout, /2:3 => Gen 2:\d+ \/ Src 1:\d+ in \d+: sample\.msjs/);
	});

	it('supports batch querying of multiple coordinates in a single invocation', async () => {
		const srcPath = path.join(tempDir, 'batch.msjs');
		await writeTextFile(srcPath, '@e "err1"\n@e "err2"\n');

		const transRes = await runTranspiler([srcPath]);
		assertStrictEquals(transRes.code, 0, transRes.stderr);

		const mapPath = path.join(tempDir, 'batch.esm.js.map');
		const res = await runMsjserrmap([mapPath, '2:45', '999:999']);
		assertStrictEquals(res.code, 0, res.stderr);
		assertMatch(res.stdout, /2:45 =>/);
		assertMatch(res.stdout, /999:999 => No source found/);
	});

	it('dumps decoded sourcemap segments with --dump', async () => {
		const srcPath = path.join(tempDir, 'dump.msjs');
		await writeTextFile(srcPath, '@c(throw "dump test")\n');

		const transRes = await runTranspiler([srcPath]);
		assertStrictEquals(transRes.code, 0, transRes.stderr);

		const mapPath = path.join(tempDir, 'dump.esm.js.map');
		const res = await runMsjserrmap([mapPath, '--dump']);
		assertStrictEquals(res.code, 0, res.stderr);
		assertMatch(res.stdout, /gc:/);
		assertMatch(res.stdout, /sl:/);
		assertMatch(res.stdout, /sc:/);
	});

	it('reports "No source found" for coordinates with no source mapping', async () => {
		const srcPath = path.join(tempDir, 'unmapped.msjs');
		await writeTextFile(srcPath, '@c(log "unmapped")\n');

		const transRes = await runTranspiler([srcPath]);
		assertStrictEquals(transRes.code, 0, transRes.stderr);

		const mapPath = path.join(tempDir, 'unmapped.esm.js.map');
		const res = await runMsjserrmap([mapPath, '999:999']);
		assertStrictEquals(res.code, 0, res.stderr);
		assertMatch(res.stdout, /999:999 => No source found/);
	});

	it('fails gracefully on non-existent sourcemap file', async () => {
		const nonExistentMap = path.join(tempDir, 'does-not-exist.map');
		const res = await runMsjserrmap([nonExistentMap, '1:1']);
		assertNotStrictEquals(res.code, 0);
		assertMatch(res.stderr, /Error:/);
	});

	describe('Cross-Engine Execution Matrix', () => {
		it({
			name: denoIgnore ? 'Deno not found for MESGJS_ENGINE=deno' : 'executes via MESGJS_ENGINE=deno',
			ignore: denoIgnore,
			fn: async () => {
				const srcPath = path.join(tempDir, 'eng_deno.msjs');
				await writeTextFile(srcPath, '@e "engine deno"\n');
				await runTranspiler([srcPath]);

				const mapPath = path.join(tempDir, 'eng_deno.esm.js.map');
				const res = await runMsjserrmap([mapPath, '2:45'], { env: { MESGJS_ENGINE: 'deno' } });
				assertStrictEquals(res.code, 0, res.stderr);
				assertMatch(res.stdout, /2:45 =>/);
			}
		});

		it({
			name: bunIgnore ? 'Bun or wicbun not found for MESGJS_ENGINE=bun' : 'executes via MESGJS_ENGINE=bun',
			ignore: bunIgnore,
			fn: async () => {
				const srcPath = path.join(tempDir, 'eng_bun.msjs');
				await writeTextFile(srcPath, '@e "engine bun"\n');
				await runTranspiler([srcPath]);

				const mapPath = path.join(tempDir, 'eng_bun.esm.js.map');
				const res = await runMsjserrmap([mapPath, '2:45'], { env: { MESGJS_ENGINE: 'bun' } });
				assertStrictEquals(res.code, 0, res.stderr);
				assertMatch(res.stdout, /2:45 =>/);
			}
		});

		it({
			name: nodeIgnore ? 'Node or wicnode not found for MESGJS_ENGINE=node' : 'executes via MESGJS_ENGINE=node',
			ignore: nodeIgnore,
			fn: async () => {
				const srcPath = path.join(tempDir, 'eng_node.msjs');
				await writeTextFile(srcPath, '@e "engine node"\n');
				await runTranspiler([srcPath]);

				const mapPath = path.join(tempDir, 'eng_node.esm.js.map');
				const res = await runMsjserrmap([mapPath, '2:45'], { env: { MESGJS_ENGINE: 'node' } });
				assertStrictEquals(res.code, 0, res.stderr);
				assertMatch(res.stdout, /2:45 =>/);
			}
		});
	});
});
