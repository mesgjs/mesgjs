import { describe, it, beforeEach, afterEach } from '@compat/test';
import { assertMatch, assertNotStrictEquals, assertStrictEquals } from '@std/assert';
import { chmod, fromFileUrl, makeDir, makeTempDir, readTextFile, removeDir, symlink, writeTextFile } from '@compat/file';
import { spawn } from '@compat/subprocess';
import * as path from '@compat/path';

const __filename = fromFileUrl(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const MSJSTLR_BIN = path.join(REPO_ROOT, 'bin/msjstlr');
const MSJSTRANS_BIN = path.join(REPO_ROOT, 'bin/msjstrans');

let currentTempDir = null;

async function runCommand (cmd, args = [], options = {}) {
	try {
		const proc = spawn(cmd, args, {
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

describe('msjstlr CLI Portability Suite', () => {
	let tempDir;

	beforeEach(async () => {
		tempDir = await makeTempDir({ prefix:'msjstlr-test-' });
		currentTempDir = tempDir;
	});

	afterEach(async () => {
		currentTempDir = null;
		if (tempDir) {
			await removeDir(tempDir, { recursive: true, force: true });
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
			await writeTextFile(msjsPath, msjsWithComments);

			const res = await runCommand(MSJSTRANS_BIN, ['--inc-slid', '--root', tempDir, msjsPath]);
			assertStrictEquals(res.code, 0, res.stderr);

			const jsPath = path.join(tempDir, 'testMod.esm.js');
			const jsContent = await readTextFile(jsPath);

			assertMatch(jsContent, /\/\*\[\(/);
			assertMatch(jsContent, /modpath=testMod/);
			assertMatch(jsContent, /version='1.0.0'/);
			assertStrictEquals(jsContent.includes('This is an inner comment'), false);
		});
	});

	describe('Metadata & SLID Extraction', () => {
		it('extracts SLID from msjs with shebang', async () => {
			const shebangMsjs = `#!/usr/bin/env msjstlr
[( featpro=[ shebangFeat ] )]
@js{ console.log("shebang run"); @}
`;
			const shebangPath = path.join(tempDir, 'shebang.msjs');
			await writeTextFile(shebangPath, shebangMsjs);

			const res = await runCommand(MSJSTLR_BIN, ['--deps-only', shebangPath]);
			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /Provides: shebangFeat/);
		});

		it('extracts metadata when msjs has no SLID', async () => {
			const noSlidMsjs = `@js{ console.log("no slid"); @}`;
			const noSlidPath = path.join(tempDir, 'noslid.msjs');
			await writeTextFile(noSlidPath, noSlidMsjs);

			const res = await runCommand(MSJSTLR_BIN, ['--deps-only', noSlidPath]);
			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /Primary entrypoint:/);
		});

		it('extracts SLID from .js file in first 4KB', async () => {
			const slidJs = `/*[( featpro=[ jsFeat ] )]*/\nconsole.log("js run");`;
			const jsPath = path.join(tempDir, 'module.js');
			await writeTextFile(jsPath, slidJs);

			const res = await runCommand(MSJSTLR_BIN, ['--deps-only', jsPath]);
			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /Provides: jsFeat/);
		});

		it('extracts SLID from .js file spanning >4KB', async () => {
			const padding = 'x'.repeat(5000);
			const largeSlidJs = `/*[( featpro=[ largeFeat ] comment='${padding}' )]*/\nconsole.log("large slid js");`;
			const largePath = path.join(tempDir, 'large.js');
			await writeTextFile(largePath, largeSlidJs);

			const res = await runCommand(MSJSTLR_BIN, ['--deps-only', largePath]);
			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /Provides: largeFeat/);
		});
	});

	describe('Dependency Resolution Algorithm', () => {
		it('resolves linear dependency chain (A -> B -> C)', async () => {
			await writeTextFile(path.join(tempDir, 'a.msjs'), `[( featreq=[ bFeat ] )]\n@js{ console.log("A"); @}`);
			await writeTextFile(path.join(tempDir, 'b.msjs'), `[( featpro=[ bFeat ] featreq=[ cFeat ] )]\n@js{ console.log("B"); @}`);
			await writeTextFile(path.join(tempDir, 'c.msjs'), `[( featpro=[ cFeat ] )]\n@js{ console.log("C"); @}`);
			await writeTextFile(path.join(tempDir, 'unused.msjs'), `[( featpro=[ unusedFeat ] )]\n@js{ console.log("Unused"); @}`);

			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				path.join(tempDir, 'a.msjs'),
				path.join(tempDir, 'b.msjs'),
				path.join(tempDir, 'c.msjs'),
				path.join(tempDir, 'unused.msjs'),
			]);

			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /Resolved Files \(3\):/);
			assertMatch(res.stdout, /a\.msjs/);
			assertMatch(res.stdout, /b\.msjs/);
			assertMatch(res.stdout, /c\.msjs/);
			assertStrictEquals(res.stdout.includes('unused.msjs'), false);
		});

		it('resolves circular dependencies gracefully', async () => {
			await writeTextFile(path.join(tempDir, 'c1.msjs'), `[( featpro=[ c1Feat ] featreq=[ c2Feat ] )]\n@js{ console.log("C1"); @}`);
			await writeTextFile(path.join(tempDir, 'c2.msjs'), `[( featpro=[ c2Feat ] featreq=[ c1Feat ] )]\n@js{ console.log("C2"); @}`);

			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				path.join(tempDir, 'c1.msjs'),
				path.join(tempDir, 'c2.msjs'),
			]);

			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /Resolved Files \(2\):/);
			assertMatch(res.stdout, /c1\.msjs/);
			assertMatch(res.stdout, /c2\.msjs/);
		});

		it('resolves diamond dependency graphs', async () => {
			await writeTextFile(path.join(tempDir, 'dEntry.msjs'), `[( featreq=[ d1Feat d2Feat ] )]\n@js{ console.log("DEntry"); @}`);
			await writeTextFile(path.join(tempDir, 'd1.msjs'), `[( featpro=[ d1Feat ] featreq=[ dBottomFeat ] )]\n@js{ console.log("D1"); @}`);
			await writeTextFile(path.join(tempDir, 'd2.msjs'), `[( featpro=[ d2Feat ] featreq=[ dBottomFeat ] )]\n@js{ console.log("D2"); @}`);
			await writeTextFile(path.join(tempDir, 'dBottom.msjs'), `[( featpro=[ dBottomFeat ] )]\n@js{ console.log("DBottom"); @}`);

			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				path.join(tempDir, 'dEntry.msjs'),
				path.join(tempDir, 'd1.msjs'),
				path.join(tempDir, 'd2.msjs'),
				path.join(tempDir, 'dBottom.msjs'),
			]);

			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /Resolved Files \(4\):/);
		});

		it('reports error for unresolved feature requirement', async () => {
			await writeTextFile(path.join(tempDir, 'missing.msjs'), `[( featreq=[ nonExistentFeat ] )]\n`);

			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				path.join(tempDir, 'missing.msjs'),
			]);

			assertNotStrictEquals(res.code, 0);
			assertMatch(res.stderr, /Unresolved feature requirement: "nonExistentFeat"/);
		});

		it('reports error for duplicate feature provider', async () => {
			await writeTextFile(path.join(tempDir, 'dup1.msjs'), `[( featpro=[ sharedFeat ] )]\n`);
			await writeTextFile(path.join(tempDir, 'dup2.msjs'), `[( featpro=[ sharedFeat ] )]\n`);
			await writeTextFile(path.join(tempDir, 'dupEntry.msjs'), `[( featreq=[ sharedFeat ] )]\n`);

			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				path.join(tempDir, 'dupEntry.msjs'),
				path.join(tempDir, 'dup1.msjs'),
				path.join(tempDir, 'dup2.msjs'),
			]);

			assertNotStrictEquals(res.code, 0);
			assertMatch(res.stderr, /Duplicate feature provider for "sharedFeat"/);
		});

		it('-a / --all flag includes all files', async () => {
			await writeTextFile(path.join(tempDir, 'a.msjs'), `[( featreq=[ bFeat ] )]\n@js{ console.log("A"); @}`);
			await writeTextFile(path.join(tempDir, 'b.msjs'), `[( featpro=[ bFeat ] featreq=[ cFeat ] )]\n@js{ console.log("B"); @}`);
			await writeTextFile(path.join(tempDir, 'c.msjs'), `[( featpro=[ cFeat ] )]\n@js{ console.log("C"); @}`);
			await writeTextFile(path.join(tempDir, 'unused.msjs'), `[( featpro=[ unusedFeat ] )]\n@js{ console.log("Unused"); @}`);

			const res = await runCommand(MSJSTLR_BIN, [
				'-a',
				'--deps-only',
				path.join(tempDir, 'a.msjs'),
				path.join(tempDir, 'b.msjs'),
				path.join(tempDir, 'c.msjs'),
				path.join(tempDir, 'unused.msjs'),
			]);

			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /Resolved Files \(4\):/);
			assertMatch(res.stdout, /unused\.msjs/);
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

			await writeTextFile(path.join(tempDir, 'main.msjs'), mainMsjs);
			await writeTextFile(path.join(tempDir, 'calc.js'), calcJs);

			const res = await runCommand(MSJSTLR_BIN, [
				path.join(tempDir, 'main.msjs'),
				path.join(tempDir, 'calc.js'),
			]);

			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /Calc module initialized/);
			assertMatch(res.stdout, /Main executing with args:/);
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

			await writeTextFile(path.join(tempDir, 'main.msjs'), mainMsjs);
			await writeTextFile(path.join(tempDir, 'calc.js'), calcJs);

			const res = await runCommand(MSJSTLR_BIN, [
				path.join(tempDir, 'main.msjs'),
				path.join(tempDir, 'calc.js'),
				'--',
				'arg1',
				'arg 2',
			]);

			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /SCRIPT_ARGS:\["arg1","arg 2"\]/);
		});

		it('forwards Deno flags via -d ... --', async () => {
			const netMsjs = `@js{
				console.log("Deno permissions test");
			@}`;
			const netPath = path.join(tempDir, 'net.msjs');
			await writeTextFile(netPath, netMsjs);

			const res = await runCommand(MSJSTLR_BIN, [
				'-d',
				'--allow-net',
				'--',
				netPath,
			]);

			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /Deno permissions test/);
		});

		it('executes from outside repository directory via symlink', async () => {
			const symlinkPath = path.join(tempDir, 'sym_msjstlr');
			await symlink(MSJSTLR_BIN, symlinkPath);

			const extWorkingDir = path.join(tempDir, 'subwork');
			await makeDir(extWorkingDir);

			const mainPath = path.join(tempDir, 'main.msjs');
			const calcPath = path.join(tempDir, 'calc.js');
			await writeTextFile(mainPath, `[( featreq=[ calcFeat ] )]\n@js{ console.log("Main run"); @}`);
			await writeTextFile(calcPath, `/*[( featpro=[ calcFeat ] )]*/\nconsole.log("Calc module initialized");`);

			const res = await runCommand(symlinkPath, [
				mainPath,
				calcPath,
			], { cwd: extWorkingDir });

			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /Calc module initialized/);
		});

		it('supports runtime path override via -r', async () => {
			const mainPath = path.join(tempDir, 'main.msjs');
			const calcPath = path.join(tempDir, 'calc.js');
			await writeTextFile(mainPath, `[( featreq=[ calcFeat ] )]\n@js{ console.log("Main run"); @}`);
			await writeTextFile(calcPath, `/*[( featpro=[ calcFeat ] )]*/\nconsole.log("Calc module initialized");`);

			const res = await runCommand(MSJSTLR_BIN, [
				'-r',
				REPO_ROOT,
				mainPath,
				calcPath,
			]);

			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /Calc module initialized/);
		});

		it('supports runtime path override via MESGJS_RUNTIME env var', async () => {
			const mainPath = path.join(tempDir, 'main.msjs');
			const calcPath = path.join(tempDir, 'calc.js');
			await writeTextFile(mainPath, `[( featreq=[ calcFeat ] )]\n@js{ console.log("Main run"); @}`);
			await writeTextFile(calcPath, `/*[( featpro=[ calcFeat ] )]*/\nconsole.log("Calc module initialized");`);

			const res = await runCommand(MSJSTLR_BIN, [
				mainPath,
				calcPath,
			], { env: { MESGJS_RUNTIME: REPO_ROOT } });

			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /Calc module initialized/);
		});

		it('supports config path override via -c and --config', async () => {
			const mainPath = path.join(tempDir, 'main.msjs');
			const configPath = path.join(REPO_ROOT, 'webload.json');
			await writeTextFile(mainPath, '@js{ console.log("Config override run"); @}');

			const resShort = await runCommand(MSJSTLR_BIN, [
				'-c',
				configPath,
				mainPath,
			]);
			assertStrictEquals(resShort.code, 0, resShort.stderr);
			assertMatch(resShort.stdout, /Config override run/);

			const resLong = await runCommand(MSJSTLR_BIN, [
				`--config=${configPath}`,
				mainPath,
			]);
			assertStrictEquals(resLong.code, 0, resLong.stderr);
			assertMatch(resLong.stdout, /Config override run/);
		});

		it('executes directly with shebang when executable', async () => {
			const scriptPath = path.join(tempDir, 'executable.msjs');
			const scriptContent = `#!${MSJSTLR_BIN}
@js{
	console.log("Shebang executed successfully!");
@}
`;
			await writeTextFile(scriptPath, scriptContent);
			await chmod(scriptPath, 0o755);

			const res = await runCommand(scriptPath, []);

			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /Shebang executed successfully!/);
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
			await writeTextFile(debugPath, debugScript);

			const res = await runCommand(MSJSTLR_BIN, [debugPath]);

			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /DEBUG_ACTIVE/);
			assertMatch(res.stdout, /MAIN_ACTIVE/);
		});

		it('--disable-debug disables debug blocks', async () => {
			const debugScript = `@debug{
	@c(log 'DEBUG_ACTIVE')
}
@c(log 'MAIN_ACTIVE')
`;
			const debugPath = path.join(tempDir, 'debug.msjs');
			await writeTextFile(debugPath, debugScript);

			const res = await runCommand(MSJSTLR_BIN, ['--disable-debug', debugPath]);

			assertStrictEquals(res.code, 0, res.stderr);
			assertStrictEquals(res.stdout.includes('DEBUG_ACTIVE'), false);
			assertMatch(res.stdout, /MAIN_ACTIVE/);
		});

		it('MESGJS_DEFAULT_DEBUG=false disables debug blocks by default', async () => {
			const debugScript = `@debug{
	@c(log 'DEBUG_ACTIVE')
}
@c(log 'MAIN_ACTIVE')
`;
			const debugPath = path.join(tempDir, 'debug.msjs');
			await writeTextFile(debugPath, debugScript);

			const res = await runCommand(MSJSTLR_BIN, [debugPath], {
				env: { MESGJS_DEFAULT_DEBUG: 'false' },
			});

			assertStrictEquals(res.code, 0, res.stderr);
			assertStrictEquals(res.stdout.includes('DEBUG_ACTIVE'), false);
			assertMatch(res.stdout, /MAIN_ACTIVE/);
		});

		it('--enable-debug overrides MESGJS_DEFAULT_DEBUG=false', async () => {
			const debugScript = `@debug{
	@c(log 'DEBUG_ACTIVE')
}
@c(log 'MAIN_ACTIVE')
`;
			const debugPath = path.join(tempDir, 'debug.msjs');
			await writeTextFile(debugPath, debugScript);

			const res = await runCommand(MSJSTLR_BIN, ['--enable-debug', debugPath], {
				env: { MESGJS_DEFAULT_DEBUG: 'false' },
			});

			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /DEBUG_ACTIVE/);
			assertMatch(res.stdout, /MAIN_ACTIVE/);
		});

		it('--disable-js rejects @js blocks during transpilation', async () => {
			const jsScript = `@js{
	console.log("JS_ACTIVE");
@}
`;
			const jsPath = path.join(tempDir, 'js.msjs');
			await writeTextFile(jsPath, jsScript);

			const res = await runCommand(MSJSTLR_BIN, ['--disable-js', jsPath]);

			assertNotStrictEquals(res.code, 0);
			assertMatch(res.stderr, /Transpilation errors/);
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

			await writeTextFile(mainPath, mainMsjs);
			await writeTextFile(modAPath, modAMsjs);
			await writeTextFile(modBPath, modBMsjs);

			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				mainPath,
				modAPath,
				modBPath,
			]);

			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /modA\.msjs \[modpath: modA\] \(deferred\)/);
			assertMatch(res.stdout, /modB\.msjs \[modpath: modB\]/);
			assertStrictEquals(res.stdout.includes('modB.msjs [modpath: modB] (deferred)'), false);
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

			await writeTextFile(mainPath, mainMsjs);
			await writeTextFile(modAPath, modAMsjs);
			await writeTextFile(modBPath, modBMsjs);

			const res = await runCommand(MSJSTLR_BIN, [
				mainPath,
				modAPath,
				modBPath,
			]);

			assertStrictEquals(res.code, 0, res.stderr);
			const modBIndex = res.stdout.indexOf('MODB_LOADED');
			const mainStartIndex = res.stdout.indexOf('MAIN_START');
			const modAIndex = res.stdout.indexOf('MODA_LOADED');
			const mainEndIndex = res.stdout.indexOf('MAIN_END');

			assertStrictEquals(mainStartIndex < modAIndex, true);
			assertStrictEquals(modAIndex < mainEndIndex, true);
			assertStrictEquals(modBIndex < mainEndIndex, true);
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

			await writeTextFile(mainPath, voteMainMsjs);
			await writeTextFile(helperPath, helperDeferMsjs);
			await writeTextFile(utilPath, utilMsjs);

			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				mainPath,
				helperPath,
				utilPath,
			]);

			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /util\.msjs \[modpath: util\] \(deferred\)/);
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

			await writeTextFile(mainPath, voteMainMsjs);
			await writeTextFile(helperPath, helperEagerMsjs);
			await writeTextFile(utilPath, utilMsjs);

			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				mainPath,
				helperPath,
				utilPath,
			]);

			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /util\.msjs \[modpath: util\]/);
			assertStrictEquals(res.stdout.includes('util.msjs [modpath: util] (deferred)'), false);
		});
	});

	describe('Cross-Engine Execution Matrix', () => {
		it('executes via MESGJS_ENGINE=deno', async () => {
			const hasDeno = await spawn('which', ['deno']).status.then((st) => st.success).catch(() => false);
			if (!hasDeno) {
				it.skip?.('Deno engine not found');
				return;
			}
			const scriptPath = path.join(tempDir, 'engine_deno.msjs');
			await writeTextFile(scriptPath, `@c(log "ENGINE_DENO_OK")\n`);

			const res = await runCommand(MSJSTLR_BIN, [scriptPath], {
				env: { MESGJS_ENGINE: 'deno' }
			});
			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /ENGINE_DENO_OK/);
		});

		it('executes via MESGJS_ENGINE=bun', async () => {
			const hasBun = await spawn('which', ['bun']).status.then((st) => st.success).catch(() => false);
			const hasWicbun = await spawn('which', ['wicbun']).status.then((st) => st.success).catch(() => false);
			if (!hasBun || !hasWicbun) {
				it.skip?.('Bun or wicbun not found');
				return;
			}
			const scriptPath = path.join(tempDir, 'engine_bun.msjs');
			await writeTextFile(scriptPath, `@c(log "ENGINE_BUN_OK")\n`);

			const res = await runCommand(MSJSTLR_BIN, [scriptPath], {
				env: { MESGJS_ENGINE: 'bun' }
			});
			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /ENGINE_BUN_OK/);
		});

		it('executes via MESGJS_ENGINE=node', async () => {
			const hasNode = await spawn('which', ['node']).status.then((st) => st.success).catch(() => false);
			const hasWicnode = await spawn('which', ['wicnode']).status.then((st) => st.success).catch(() => false);
			if (!hasNode || !hasWicnode) {
				it.skip?.('Node or wicnode not found');
				return;
			}
			const scriptPath = path.join(tempDir, 'engine_node.msjs');
			await writeTextFile(scriptPath, `@c(log "ENGINE_NODE_OK")\n`);

			const res = await runCommand(MSJSTLR_BIN, [scriptPath], {
				env: { MESGJS_ENGINE: 'node' }
			});
			assertStrictEquals(res.code, 0, res.stderr);
			assertMatch(res.stdout, /ENGINE_NODE_OK/);
		});
	});
});
