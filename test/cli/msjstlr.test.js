import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const MSJSTLR_BIN = path.join(REPO_ROOT, 'bin/msjstlr');
const MSJSTRANS_BIN = path.join(REPO_ROOT, 'bin/msjstrans');

let currentTempDir = null;

async function runCommand (cmd, args = [], options = {}) {
	try {
		const { stdout, stderr } = await execFileAsync(cmd, args, {
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

describe('msjstlr CLI Portability Suite', () => {
	let tempDir;

	test.beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'msjstlr-test-'));
		currentTempDir = tempDir;
	});

	test.afterEach(async () => {
		currentTempDir = null;
		if (tempDir) {
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	});

	describe('Component 1: msjstrans --inc-slid', () => {
		it('transpiles with --inc-slid and strips comments in SLID header', async () => {
			const msjsWithComments = `[(
				/* This is an inner comment */
				modpath=testMod
				version='1.0.0'
				featpro=[ alpha beta ]
			)]
			@debug{
				@c(log 'debug active')
			}
			`;
			const msjsPath = path.join(tempDir, 'testMod.msjs');
			await fs.writeFile(msjsPath, msjsWithComments, 'utf8');

			const res = await runCommand(MSJSTRANS_BIN, ['--inc-slid', '--root', tempDir, msjsPath]);
			assert.strictEqual(res.code, 0, res.stderr);

			const jsPath = path.join(tempDir, 'testMod.esm.js');
			const jsContent = await fs.readFile(jsPath, 'utf8');

			assert.match(jsContent, /\/\*\[\(/);
			assert.match(jsContent, /modpath=testMod/);
			assert.match(jsContent, /version='1.0.0'/);
			assert.strictEqual(jsContent.includes('This is an inner comment'), false);
		});
	});

	describe('Metadata & SLID Extraction', () => {
		it('extracts SLID from msjs with shebang', async () => {
			const shebangMsjs = `#!/usr/bin/env msjstlr
[( featpro=[ shebangFeat ] )]
@js{ console.log("shebang run"); @}
`;
			const shebangPath = path.join(tempDir, 'shebang.msjs');
			await fs.writeFile(shebangPath, shebangMsjs, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, ['--deps-only', shebangPath]);
			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /Provides: shebangFeat/);
		});

		it('extracts metadata when msjs has no SLID', async () => {
			const noSlidMsjs = `@js{ console.log("no slid"); @}`;
			const noSlidPath = path.join(tempDir, 'noslid.msjs');
			await fs.writeFile(noSlidPath, noSlidMsjs, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, ['--deps-only', noSlidPath]);
			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /Primary entrypoint:/);
		});

		it('extracts SLID from .js file in first 4KB', async () => {
			const slidJs = `/*[( featpro=[ jsFeat ] )]*/\nconsole.log("js run");`;
			const jsPath = path.join(tempDir, 'module.js');
			await fs.writeFile(jsPath, slidJs, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, ['--deps-only', jsPath]);
			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /Provides: jsFeat/);
		});

		it('extracts SLID from .js file spanning >4KB', async () => {
			const padding = 'x'.repeat(5000);
			const largeSlidJs = `/*[( featpro=[ largeFeat ] comment='${padding}' )]*/\nconsole.log("large slid js");`;
			const largePath = path.join(tempDir, 'large.js');
			await fs.writeFile(largePath, largeSlidJs, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, ['--deps-only', largePath]);
			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /Provides: largeFeat/);
		});
	});

	describe('Dependency Resolution Algorithm', () => {
		it('resolves linear dependency chain (A -> B -> C)', async () => {
			await fs.writeFile(path.join(tempDir, 'a.msjs'), `[( featreq=[ bFeat ] )]\n@js{ console.log("A"); @}`, 'utf8');
			await fs.writeFile(path.join(tempDir, 'b.msjs'), `[( featpro=[ bFeat ] featreq=[ cFeat ] )]\n@js{ console.log("B"); @}`, 'utf8');
			await fs.writeFile(path.join(tempDir, 'c.msjs'), `[( featpro=[ cFeat ] )]\n@js{ console.log("C"); @}`, 'utf8');
			await fs.writeFile(path.join(tempDir, 'unused.msjs'), `[( featpro=[ unusedFeat ] )]\n@js{ console.log("Unused"); @}`, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				path.join(tempDir, 'a.msjs'),
				path.join(tempDir, 'b.msjs'),
				path.join(tempDir, 'c.msjs'),
				path.join(tempDir, 'unused.msjs'),
			]);

			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /Resolved Files \(3\):/);
			assert.match(res.stdout, /a\.msjs/);
			assert.match(res.stdout, /b\.msjs/);
			assert.match(res.stdout, /c\.msjs/);
			assert.strictEqual(res.stdout.includes('unused.msjs'), false);
		});

		it('resolves circular dependencies gracefully', async () => {
			await fs.writeFile(path.join(tempDir, 'c1.msjs'), `[( featpro=[ c1Feat ] featreq=[ c2Feat ] )]\n@js{ console.log("C1"); @}`, 'utf8');
			await fs.writeFile(path.join(tempDir, 'c2.msjs'), `[( featpro=[ c2Feat ] featreq=[ c1Feat ] )]\n@js{ console.log("C2"); @}`, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				path.join(tempDir, 'c1.msjs'),
				path.join(tempDir, 'c2.msjs'),
			]);

			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /Resolved Files \(2\):/);
			assert.match(res.stdout, /c1\.msjs/);
			assert.match(res.stdout, /c2\.msjs/);
		});

		it('resolves diamond dependency graphs', async () => {
			await fs.writeFile(path.join(tempDir, 'dEntry.msjs'), `[( featreq=[ d1Feat d2Feat ] )]\n@js{ console.log("DEntry"); @}`, 'utf8');
			await fs.writeFile(path.join(tempDir, 'd1.msjs'), `[( featpro=[ d1Feat ] featreq=[ dBottomFeat ] )]\n@js{ console.log("D1"); @}`, 'utf8');
			await fs.writeFile(path.join(tempDir, 'd2.msjs'), `[( featpro=[ d2Feat ] featreq=[ dBottomFeat ] )]\n@js{ console.log("D2"); @}`, 'utf8');
			await fs.writeFile(path.join(tempDir, 'dBottom.msjs'), `[( featpro=[ dBottomFeat ] )]\n@js{ console.log("DBottom"); @}`, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				path.join(tempDir, 'dEntry.msjs'),
				path.join(tempDir, 'd1.msjs'),
				path.join(tempDir, 'd2.msjs'),
				path.join(tempDir, 'dBottom.msjs'),
			]);

			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /Resolved Files \(4\):/);
		});

		it('reports error for unresolved feature requirement', async () => {
			await fs.writeFile(path.join(tempDir, 'missing.msjs'), `[( featreq=[ nonExistentFeat ] )]\n`, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				path.join(tempDir, 'missing.msjs'),
			]);

			assert.notStrictEqual(res.code, 0);
			assert.match(res.stderr, /Unresolved feature requirement: "nonExistentFeat"/);
		});

		it('reports error for duplicate feature provider', async () => {
			await fs.writeFile(path.join(tempDir, 'dup1.msjs'), `[( featpro=[ sharedFeat ] )]\n`, 'utf8');
			await fs.writeFile(path.join(tempDir, 'dup2.msjs'), `[( featpro=[ sharedFeat ] )]\n`, 'utf8');
			await fs.writeFile(path.join(tempDir, 'dupEntry.msjs'), `[( featreq=[ sharedFeat ] )]\n`, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				path.join(tempDir, 'dupEntry.msjs'),
				path.join(tempDir, 'dup1.msjs'),
				path.join(tempDir, 'dup2.msjs'),
			]);

			assert.notStrictEqual(res.code, 0);
			assert.match(res.stderr, /Duplicate feature provider for "sharedFeat"/);
		});

		it('-a / --all flag includes all files', async () => {
			await fs.writeFile(path.join(tempDir, 'a.msjs'), `[( featreq=[ bFeat ] )]\n@js{ console.log("A"); @}`, 'utf8');
			await fs.writeFile(path.join(tempDir, 'b.msjs'), `[( featpro=[ bFeat ] featreq=[ cFeat ] )]\n@js{ console.log("B"); @}`, 'utf8');
			await fs.writeFile(path.join(tempDir, 'c.msjs'), `[( featpro=[ cFeat ] )]\n@js{ console.log("C"); @}`, 'utf8');
			await fs.writeFile(path.join(tempDir, 'unused.msjs'), `[( featpro=[ unusedFeat ] )]\n@js{ console.log("Unused"); @}`, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [
				'-a',
				'--deps-only',
				path.join(tempDir, 'a.msjs'),
				path.join(tempDir, 'b.msjs'),
				path.join(tempDir, 'c.msjs'),
				path.join(tempDir, 'unused.msjs'),
			]);

			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /Resolved Files \(4\):/);
			assert.match(res.stdout, /unused\.msjs/);
		});
	});

	describe('Execution & Integration', () => {
		it('executes multi-module program mixing .msjs and .js', async () => {
			const mainMsjs = `[(
				featreq=[ calcFeat ]
			)]
			@js{
				console.log("Main executing with args:", JSON.stringify(globalThis.Deno ? Deno.args : (process.argv.slice(2))));
			@}
			`;
			const calcJs = `/*[( featpro=[ calcFeat ] )]*/\nconsole.log("Calc module initialized");`;

			await fs.writeFile(path.join(tempDir, 'main.msjs'), mainMsjs, 'utf8');
			await fs.writeFile(path.join(tempDir, 'calc.js'), calcJs, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [
				path.join(tempDir, 'main.msjs'),
				path.join(tempDir, 'calc.js'),
			]);

			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /Calc module initialized/);
			assert.match(res.stdout, /Main executing with args:/);
		});

		it('forwards script arguments after -- into process/runtime args', async () => {
			const mainMsjs = `[(
				featreq=[ calcFeat ]
			)]
			@js{
				console.log("SCRIPT_ARGS:" + JSON.stringify(globalThis.Deno ? Deno.args : process.argv.slice(2)));
			@}
			`;
			const calcJs = `/*[( featpro=[ calcFeat ] )]*/\nconsole.log("Calc module initialized");`;

			await fs.writeFile(path.join(tempDir, 'main.msjs'), mainMsjs, 'utf8');
			await fs.writeFile(path.join(tempDir, 'calc.js'), calcJs, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [
				path.join(tempDir, 'main.msjs'),
				path.join(tempDir, 'calc.js'),
				'--',
				'arg1',
				'arg 2',
			]);

			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /SCRIPT_ARGS:\["arg1","arg 2"\]/);
		});

		it('forwards Deno flags via -d ... --', async () => {
			const netMsjs = `@js{
				console.log("Deno permissions test");
			@}`;
			const netPath = path.join(tempDir, 'net.msjs');
			await fs.writeFile(netPath, netMsjs, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [
				'-d',
				'--allow-net',
				'--',
				netPath,
			]);

			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /Deno permissions test/);
		});

		it('executes from outside repository directory via symlink', async () => {
			const symlinkPath = path.join(tempDir, 'sym_msjstlr');
			await fs.symlink(MSJSTLR_BIN, symlinkPath);

			const extWorkingDir = path.join(tempDir, 'subwork');
			await fs.mkdir(extWorkingDir);

			const mainPath = path.join(tempDir, 'main.msjs');
			const calcPath = path.join(tempDir, 'calc.js');
			await fs.writeFile(mainPath, `[( featreq=[ calcFeat ] )]\n@js{ console.log("Main run"); @}`, 'utf8');
			await fs.writeFile(calcPath, `/*[( featpro=[ calcFeat ] )]*/\nconsole.log("Calc module initialized");`, 'utf8');

			const res = await runCommand(symlinkPath, [
				mainPath,
				calcPath,
			], { cwd: extWorkingDir });

			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /Calc module initialized/);
		});

		it('supports runtime path override via -r', async () => {
			const mainPath = path.join(tempDir, 'main.msjs');
			const calcPath = path.join(tempDir, 'calc.js');
			await fs.writeFile(mainPath, `[( featreq=[ calcFeat ] )]\n@js{ console.log("Main run"); @}`, 'utf8');
			await fs.writeFile(calcPath, `/*[( featpro=[ calcFeat ] )]*/\nconsole.log("Calc module initialized");`, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [
				'-r',
				REPO_ROOT,
				mainPath,
				calcPath,
			]);

			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /Calc module initialized/);
		});

		it('supports runtime path override via MESGJS_RUNTIME env var', async () => {
			const mainPath = path.join(tempDir, 'main.msjs');
			const calcPath = path.join(tempDir, 'calc.js');
			await fs.writeFile(mainPath, `[( featreq=[ calcFeat ] )]\n@js{ console.log("Main run"); @}`, 'utf8');
			await fs.writeFile(calcPath, `/*[( featpro=[ calcFeat ] )]*/\nconsole.log("Calc module initialized");`, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [
				mainPath,
				calcPath,
			], { env: { MESGJS_RUNTIME: REPO_ROOT } });

			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /Calc module initialized/);
		});

		it('supports config path override via -c and --config', async () => {
			const mainPath = path.join(tempDir, 'main.msjs');
			const configPath = path.join(REPO_ROOT, 'webload.json');
			await fs.writeFile(mainPath, '@js{ console.log("Config override run"); @}', 'utf8');

			const resShort = await runCommand(MSJSTLR_BIN, [
				'-c',
				configPath,
				mainPath,
			]);
			assert.strictEqual(resShort.code, 0, resShort.stderr);
			assert.match(resShort.stdout, /Config override run/);

			const resLong = await runCommand(MSJSTLR_BIN, [
				`--config=${configPath}`,
				mainPath,
			]);
			assert.strictEqual(resLong.code, 0, resLong.stderr);
			assert.match(resLong.stdout, /Config override run/);
		});

		it('executes directly with shebang when executable', async () => {
			const scriptPath = path.join(tempDir, 'executable.msjs');
			const scriptContent = `#!${MSJSTLR_BIN}
@js{
	console.log("Shebang executed successfully!");
@}
`;
			await fs.writeFile(scriptPath, scriptContent, 'utf8');
			await fs.chmod(scriptPath, 0o755);

			const res = await runCommand(scriptPath, []);

			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /Shebang executed successfully!/);
		});
	});

	describe('Transpiler Options & Flags', () => {
		it('debug blocks enabled by default', async () => {
			const debugScript = `@debug{
	@c(log 'DEBUG_ACTIVE')
}
@c(log 'MAIN_ACTIVE')
`;
			const debugPath = path.join(tempDir, 'debug.msjs');
			await fs.writeFile(debugPath, debugScript, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [debugPath]);

			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /DEBUG_ACTIVE/);
			assert.match(res.stdout, /MAIN_ACTIVE/);
		});

		it('--disable-debug disables debug blocks', async () => {
			const debugScript = `@debug{
	@c(log 'DEBUG_ACTIVE')
}
@c(log 'MAIN_ACTIVE')
`;
			const debugPath = path.join(tempDir, 'debug.msjs');
			await fs.writeFile(debugPath, debugScript, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, ['--disable-debug', debugPath]);

			assert.strictEqual(res.code, 0, res.stderr);
			assert.strictEqual(res.stdout.includes('DEBUG_ACTIVE'), false);
			assert.match(res.stdout, /MAIN_ACTIVE/);
		});

		it('MESGJS_DEFAULT_DEBUG=false disables debug blocks by default', async () => {
			const debugScript = `@debug{
	@c(log 'DEBUG_ACTIVE')
}
@c(log 'MAIN_ACTIVE')
`;
			const debugPath = path.join(tempDir, 'debug.msjs');
			await fs.writeFile(debugPath, debugScript, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [debugPath], {
				env: { MESGJS_DEFAULT_DEBUG: 'false' },
			});

			assert.strictEqual(res.code, 0, res.stderr);
			assert.strictEqual(res.stdout.includes('DEBUG_ACTIVE'), false);
			assert.match(res.stdout, /MAIN_ACTIVE/);
		});

		it('--enable-debug overrides MESGJS_DEFAULT_DEBUG=false', async () => {
			const debugScript = `@debug{
	@c(log 'DEBUG_ACTIVE')
}
@c(log 'MAIN_ACTIVE')
`;
			const debugPath = path.join(tempDir, 'debug.msjs');
			await fs.writeFile(debugPath, debugScript, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, ['--enable-debug', debugPath], {
				env: { MESGJS_DEFAULT_DEBUG: 'false' },
			});

			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /DEBUG_ACTIVE/);
			assert.match(res.stdout, /MAIN_ACTIVE/);
		});

		it('--disable-js rejects @js blocks during transpilation', async () => {
			const jsScript = `@js{
	console.log("JS_ACTIVE");
@}
`;
			const jsPath = path.join(tempDir, 'js.msjs');
			await fs.writeFile(jsPath, jsScript, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, ['--disable-js', jsPath]);

			assert.notStrictEqual(res.code, 0);
			assert.match(res.stderr, /Transpilation errors/);
		});
	});

	describe('Module Deferred Loading & Voting (deferLoad)', () => {
		it('--deps-only reports (deferred) for modA and not for modB', async () => {
			const mainMsjs = `[(
				modpath=main
				featreq=[ featA featB ]
				deferLoad=[ modA ]
			)]
			@c(log MAIN_START)
			@c(fwait featA)(then { @c(log MAIN_END) })
			`;
			const modAMsjs = `[(
				modpath=modA
				featpro=[ featA ]
			)]
			@c(log MODA_LOADED)
			@c(fready featA)
			`;
			const modBMsjs = `[(
				modpath=modB
				featpro=[ featB ]
			)]
			@c(log MODB_LOADED)
			`;

			const mainPath = path.join(tempDir, 'main.msjs');
			const modAPath = path.join(tempDir, 'modA.msjs');
			const modBPath = path.join(tempDir, 'modB.msjs');

			await fs.writeFile(mainPath, mainMsjs, 'utf8');
			await fs.writeFile(modAPath, modAMsjs, 'utf8');
			await fs.writeFile(modBPath, modBMsjs, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				mainPath,
				modAPath,
				modBPath,
			]);

			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /modA\.msjs \[modpath: modA\] \(deferred\)/);
			assert.match(res.stdout, /modB\.msjs \[modpath: modB\]/);
			assert.strictEqual(res.stdout.includes('modB.msjs [modpath: modB] (deferred)'), false);
		});

		it('deferred module loads on demand via fwait at runtime', async () => {
			const mainMsjs = `[(
				modpath=main
				featreq=[ featA featB ]
				deferLoad=[ modA ]
			)]
			@c(log MAIN_START)
			@c(fwait featA)(then { @c(log MAIN_END) })
			`;
			const modAMsjs = `[(
				modpath=modA
				featpro=[ featA ]
			)]
			@c(log MODA_LOADED)
			@c(fready featA)
			`;
			const modBMsjs = `[(
				modpath=modB
				featpro=[ featB ]
			)]
			@c(log MODB_LOADED)
			`;

			const mainPath = path.join(tempDir, 'main.msjs');
			const modAPath = path.join(tempDir, 'modA.msjs');
			const modBPath = path.join(tempDir, 'modB.msjs');

			await fs.writeFile(mainPath, mainMsjs, 'utf8');
			await fs.writeFile(modAPath, modAMsjs, 'utf8');
			await fs.writeFile(modBPath, modBMsjs, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [
				mainPath,
				modAPath,
				modBPath,
			]);

			assert.strictEqual(res.code, 0, res.stderr);
			const modBIndex = res.stdout.indexOf('MODB_LOADED');
			const mainStartIndex = res.stdout.indexOf('MAIN_START');
			const modAIndex = res.stdout.indexOf('MODA_LOADED');
			const mainEndIndex = res.stdout.indexOf('MAIN_END');

			assert.strictEqual(mainStartIndex < modAIndex, true);
			assert.strictEqual(modAIndex < mainEndIndex, true);
			assert.strictEqual(modBIndex < mainEndIndex, true);
		});

		it('util is deferred when all requirers vote to defer', async () => {
			const voteMainMsjs = `[(
				modpath=voteMain
				featreq=[ featHelper featUtil ]
				deferLoad=[ util ]
			)]
			@c(log 'VOTE_MAIN')
			`;
			const helperDeferMsjs = `[(
				modpath=helper
				featpro=[ featHelper ]
				featreq=[ featUtil ]
				deferLoad=[ util ]
			)]
			@c(log 'HELPER')
			`;
			const utilMsjs = `[(
				modpath=util
				featpro=[ featUtil ]
			)]
			@c(log 'UTIL')
			`;

			const mainPath = path.join(tempDir, 'voteMain.msjs');
			const helperPath = path.join(tempDir, 'helperDefer.msjs');
			const utilPath = path.join(tempDir, 'util.msjs');

			await fs.writeFile(mainPath, voteMainMsjs, 'utf8');
			await fs.writeFile(helperPath, helperDeferMsjs, 'utf8');
			await fs.writeFile(utilPath, utilMsjs, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				mainPath,
				helperPath,
				utilPath,
			]);

			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /util\.msjs \[modpath: util\] \(deferred\)/);
		});

		it('util is eager when any requirer does not vote to defer', async () => {
			const voteMainMsjs = `[(
				modpath=voteMain
				featreq=[ featHelper featUtil ]
				deferLoad=[ util ]
			)]
			@c(log 'VOTE_MAIN')
			`;
			const helperEagerMsjs = `[(
				modpath=helper
				featpro=[ featHelper ]
				featreq=[ featUtil ]
			)]
			@c(log 'HELPER')
			`;
			const utilMsjs = `[(
				modpath=util
				featpro=[ featUtil ]
			)]
			@c(log 'UTIL')
			`;

			const mainPath = path.join(tempDir, 'voteMain.msjs');
			const helperPath = path.join(tempDir, 'helperEager.msjs');
			const utilPath = path.join(tempDir, 'util.msjs');

			await fs.writeFile(mainPath, voteMainMsjs, 'utf8');
			await fs.writeFile(helperPath, helperEagerMsjs, 'utf8');
			await fs.writeFile(utilPath, utilMsjs, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				mainPath,
				helperPath,
				utilPath,
			]);

			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /util\.msjs \[modpath: util\]/);
			assert.strictEqual(res.stdout.includes('util.msjs [modpath: util] (deferred)'), false);
		});
	});

	describe('Cross-Engine Execution Matrix', () => {
		it('executes via MESGJS_ENGINE=deno', async (t) => {
			const hasDeno = await execFileAsync('which', ['deno']).then(() => true).catch(() => false);
			if (!hasDeno) {
				t?.skip?.('Deno engine not found');
				return;
			}
			const scriptPath = path.join(tempDir, 'engine_deno.msjs');
			await fs.writeFile(scriptPath, `@c(log "ENGINE_DENO_OK")\n`, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [scriptPath], {
				env: { MESGJS_ENGINE: 'deno' }
			});
			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /ENGINE_DENO_OK/);
		});

		it('executes via MESGJS_ENGINE=bun', async (t) => {
			const hasBun = await execFileAsync('which', ['bun']).then(() => true).catch(() => false);
			const hasWicbun = await execFileAsync('which', ['wicbun']).then(() => true).catch(() => false);
			if (!hasBun || !hasWicbun) {
				t?.skip?.('Bun or wicbun not found');
				return;
			}
			const scriptPath = path.join(tempDir, 'engine_bun.msjs');
			await fs.writeFile(scriptPath, `@c(log "ENGINE_BUN_OK")\n`, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [scriptPath], {
				env: { MESGJS_ENGINE: 'bun' }
			});
			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /ENGINE_BUN_OK/);
		});

		it('executes via MESGJS_ENGINE=node', async (t) => {
			const hasNode = await execFileAsync('which', ['node']).then(() => true).catch(() => false);
			const hasWicnode = await execFileAsync('which', ['wicnode']).then(() => true).catch(() => false);
			if (!hasNode || !hasWicnode) {
				t?.skip?.('Node or wicnode not found');
				return;
			}
			const scriptPath = path.join(tempDir, 'engine_node.msjs');
			await fs.writeFile(scriptPath, `@c(log "ENGINE_NODE_OK")\n`, 'utf8');

			const res = await runCommand(MSJSTLR_BIN, [scriptPath], {
				env: { MESGJS_ENGINE: 'node' }
			});
			assert.strictEqual(res.code, 0, res.stderr);
			assert.match(res.stdout, /ENGINE_NODE_OK/);
		});
	});
});
