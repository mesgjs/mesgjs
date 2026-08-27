import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.152.0/testing/asserts.ts';

const MSJSTLR_BIN = new URL('../../bin/msjstlr', import.meta.url).pathname;
const MSJSTRANS_BIN = new URL('../../bin/msjstrans', import.meta.url).pathname;
const REPO_ROOT = new URL('../../', import.meta.url).pathname;

async function runCommand (cmd, args = [], options = {}) {
	const command = new Deno.Command(cmd, {
		args,
		stdout: 'piped',
		stderr: 'piped',
		cwd: options.cwd || REPO_ROOT,
		env: options.env,
	});
	const process = command.spawn();
	const { code, stdout, stderr } = await process.output();
	const outText = new TextDecoder().decode(stdout);
	const errText = new TextDecoder().decode(stderr);

	return { code, stdout: outText, stderr: errText };
}

Deno.test('Component 1: msjstrans --inc-slid', async (t) => {
	const tempDir = await Deno.makeTempDir();

	try {
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
		const msjsPath = `${tempDir}/testMod.msjs`;

		await Deno.writeTextFile(msjsPath, msjsWithComments);

		await t.step('transpiles with --inc-slid and strips comments in SLID header', async () => {
			const res = await runCommand(MSJSTRANS_BIN, ['--inc-slid', '--root', tempDir, msjsPath]);

			assertEquals(res.code, 0, res.stderr);

			const jsPath = `${tempDir}/testMod.esm.js`;
			const jsContent = await Deno.readTextFile(jsPath);

			assertStringIncludes(jsContent, '/*[(');
			assertStringIncludes(jsContent, 'modpath=testMod');
			assertStringIncludes(jsContent, "version='1.0.0'");
			// Comments inside the SLID should be stripped by toSLID()
			assertEquals(jsContent.includes('This is an inner comment'), false);
		});
	} finally {
		await Deno.remove(tempDir, { recursive: true });
	}
});

Deno.test('Metadata & SLID Extraction', async (t) => {
	const tempDir = await Deno.makeTempDir();

	try {
		const shebangMsjs = `#!/usr/bin/env msjstlr
[( featpro=[ shebangFeat ] )]
@js{ console.log("shebang run"); @}
`;
		const noSlidMsjs = `@js{ console.log("no slid"); @}`;
		const slidJs = `/*[( featpro=[ jsFeat ] )]*/\nconsole.log("js run");`;
		const padding = 'x'.repeat(5000);
		const largeSlidJs = `/*[( featpro=[ largeFeat ] comment='${padding}' )]*/\nconsole.log("large slid js");`;

		await Deno.writeTextFile(`${tempDir}/shebang.msjs`, shebangMsjs);
		await Deno.writeTextFile(`${tempDir}/noslid.msjs`, noSlidMsjs);
		await Deno.writeTextFile(`${tempDir}/module.js`, slidJs);
		await Deno.writeTextFile(`${tempDir}/large.js`, largeSlidJs);

		await t.step('extracts SLID from msjs with shebang', async () => {
			const res = await runCommand(MSJSTLR_BIN, ['--deps-only', `${tempDir}/shebang.msjs`]);

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, 'Provides: shebangFeat');
		});

		await t.step('extracts metadata when msjs has no SLID', async () => {
			const res = await runCommand(MSJSTLR_BIN, ['--deps-only', `${tempDir}/noslid.msjs`]);

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, 'Primary entrypoint:');
		});

		await t.step('extracts SLID from .js file in first 4KB', async () => {
			const res = await runCommand(MSJSTLR_BIN, ['--deps-only', `${tempDir}/module.js`]);

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, 'Provides: jsFeat');
		});

		await t.step('extracts SLID from .js file spanning >4KB', async () => {
			const res = await runCommand(MSJSTLR_BIN, ['--deps-only', `${tempDir}/large.js`]);

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, 'Provides: largeFeat');
		});
	} finally {
		await Deno.remove(tempDir, { recursive: true });
	}
});

Deno.test('Dependency Resolution Algorithm', async (t) => {
	const tempDir = await Deno.makeTempDir();

	try {
		// A -> B -> C
		await Deno.writeTextFile(`${tempDir}/a.msjs`, `[( featreq=[ bFeat ] )]\n@js{ console.log("A"); @}`);
		await Deno.writeTextFile(`${tempDir}/b.msjs`, `[( featpro=[ bFeat ] featreq=[ cFeat ] )]\n@js{ console.log("B"); @}`);
		await Deno.writeTextFile(`${tempDir}/c.msjs`, `[( featpro=[ cFeat ] )]\n@js{ console.log("C"); @}`);

		// Circular: c1 -> c2 -> c1
		await Deno.writeTextFile(`${tempDir}/c1.msjs`, `[( featpro=[ c1Feat ] featreq=[ c2Feat ] )]\n@js{ console.log("C1"); @}`);
		await Deno.writeTextFile(`${tempDir}/c2.msjs`, `[( featpro=[ c2Feat ] featreq=[ c1Feat ] )]\n@js{ console.log("C2"); @}`);

		// Diamond: dEntry -> d1, d2; d1 -> dBottom; d2 -> dBottom
		await Deno.writeTextFile(`${tempDir}/dEntry.msjs`, `[( featreq=[ d1Feat d2Feat ] )]\n@js{ console.log("DEntry"); @}`);
		await Deno.writeTextFile(`${tempDir}/d1.msjs`, `[( featpro=[ d1Feat ] featreq=[ dBottomFeat ] )]\n@js{ console.log("D1"); @}`);
		await Deno.writeTextFile(`${tempDir}/d2.msjs`, `[( featpro=[ d2Feat ] featreq=[ dBottomFeat ] )]\n@js{ console.log("D2"); @}`);
		await Deno.writeTextFile(`${tempDir}/dBottom.msjs`, `[( featpro=[ dBottomFeat ] )]\n@js{ console.log("DBottom"); @}`);

		// Duplicate provider
		await Deno.writeTextFile(`${tempDir}/dup1.msjs`, `[( featpro=[ sharedFeat ] )]\n`);
		await Deno.writeTextFile(`${tempDir}/dup2.msjs`, `[( featpro=[ sharedFeat ] )]\n`);
		await Deno.writeTextFile(`${tempDir}/dupEntry.msjs`, `[( featreq=[ sharedFeat ] )]\n`);

		// Missing provider
		await Deno.writeTextFile(`${tempDir}/missing.msjs`, `[( featreq=[ nonExistentFeat ] )]\n`);

		// Unused module
		await Deno.writeTextFile(`${tempDir}/unused.msjs`, `[( featpro=[ unusedFeat ] )]\n@js{ console.log("Unused"); @}`);

		await t.step('resolves linear dependency chain (A -> B -> C)', async () => {
			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				`${tempDir}/a.msjs`,
				`${tempDir}/b.msjs`,
				`${tempDir}/c.msjs`,
				`${tempDir}/unused.msjs`,
			]);

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, 'Resolved Files (3):');
			assertStringIncludes(res.stdout, 'a.msjs');
			assertStringIncludes(res.stdout, 'b.msjs');
			assertStringIncludes(res.stdout, 'c.msjs');
			assertEquals(res.stdout.includes('unused.msjs'), false);
		});

		await t.step('resolves circular dependencies gracefully', async () => {
			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				`${tempDir}/c1.msjs`,
				`${tempDir}/c2.msjs`,
			]);

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, 'Resolved Files (2):');
			assertStringIncludes(res.stdout, 'c1.msjs');
			assertStringIncludes(res.stdout, 'c2.msjs');
		});

		await t.step('resolves diamond dependency graphs', async () => {
			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				`${tempDir}/dEntry.msjs`,
				`${tempDir}/d1.msjs`,
				`${tempDir}/d2.msjs`,
				`${tempDir}/dBottom.msjs`,
			]);

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, 'Resolved Files (4):');
		});

		await t.step('reports error for unresolved feature requirement', async () => {
			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				`${tempDir}/missing.msjs`,
			]);

			assertEquals(res.code === 0, false);
			assertStringIncludes(res.stderr, 'Unresolved feature requirement: "nonExistentFeat"');
		});

		await t.step('reports error for duplicate feature provider', async () => {
			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				`${tempDir}/dupEntry.msjs`,
				`${tempDir}/dup1.msjs`,
				`${tempDir}/dup2.msjs`,
			]);

			assertEquals(res.code === 0, false);
			assertStringIncludes(res.stderr, 'Duplicate feature provider for "sharedFeat"');
		});

		await t.step('-a / --all flag includes all files', async () => {
			const res = await runCommand(MSJSTLR_BIN, [
				'-a',
				'--deps-only',
				`${tempDir}/a.msjs`,
				`${tempDir}/b.msjs`,
				`${tempDir}/c.msjs`,
				`${tempDir}/unused.msjs`,
			]);

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, 'Resolved Files (4):');
			assertStringIncludes(res.stdout, 'unused.msjs');
		});
	} finally {
		await Deno.remove(tempDir, { recursive: true });
	}
});

Deno.test('Execution & Integration', async (t) => {
	const tempDir = await Deno.makeTempDir();

	try {
		const mainMsjs = `[(
			featreq=[ calcFeat ]
		)]
		@js{
			console.log("Main executing with args:", JSON.stringify(Deno.args));
		@}
		`;
		const calcJs = `/*[( featpro=[ calcFeat ] )]*/\nconsole.log("Calc module initialized");`;

		await Deno.writeTextFile(`${tempDir}/main.msjs`, mainMsjs);
		await Deno.writeTextFile(`${tempDir}/calc.js`, calcJs);

		await t.step('executes multi-module program mixing .msjs and .js', async () => {
			const res = await runCommand(MSJSTLR_BIN, [
				`${tempDir}/main.msjs`,
				`${tempDir}/calc.js`,
			]);

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, 'Calc module initialized');
			assertStringIncludes(res.stdout, 'Main executing with args:');
		});

		await t.step('forwards script arguments after -- into Deno.args', async () => {
			const res = await runCommand(MSJSTLR_BIN, [
				`${tempDir}/main.msjs`,
				`${tempDir}/calc.js`,
				'--',
				'arg1',
				'arg 2',
			]);

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, '["arg1","arg 2"]');
		});

		await t.step('forwards Deno flags via -d ... --', async () => {
			const netMsjs = `@js{
				console.log("Deno permissions test");
			@}`;
			await Deno.writeTextFile(`${tempDir}/net.msjs`, netMsjs);

			const res = await runCommand(MSJSTLR_BIN, [
				'-d',
				'--allow-net',
				'--',
				`${tempDir}/net.msjs`,
			]);

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, 'Deno permissions test');
		});

		await t.step('executes from outside repository directory via symlink', async () => {
			const symlinkPath = `${tempDir}/sym_msjstlr`;

			await Deno.symlink(MSJSTLR_BIN, symlinkPath);

			const extWorkingDir = `${tempDir}/subwork`;

			await Deno.mkdir(extWorkingDir);

			const res = await runCommand(symlinkPath, [
				`${tempDir}/main.msjs`,
				`${tempDir}/calc.js`,
			], { cwd: extWorkingDir });

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, 'Calc module initialized');
		});

		await t.step('supports runtime path override via -r', async () => {
			const res = await runCommand(MSJSTLR_BIN, [
				'-r',
				REPO_ROOT,
				`${tempDir}/main.msjs`,
				`${tempDir}/calc.js`,
			]);

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, 'Calc module initialized');
		});

		await t.step('supports runtime path override via MESGJS_RUNTIME env var', async () => {
			const res = await runCommand(MSJSTLR_BIN, [
				`${tempDir}/main.msjs`,
				`${tempDir}/calc.js`,
			], { env: { MESGJS_RUNTIME: REPO_ROOT } });

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, 'Calc module initialized');
		});

		await t.step('executes directly with shebang when executable', async () => {
			const scriptPath = `${tempDir}/executable.msjs`;
			const scriptContent = `#!${MSJSTLR_BIN}
@js{
	console.log("Shebang executed successfully!");
@}
`;
			await Deno.writeTextFile(scriptPath, scriptContent);
			await Deno.chmod(scriptPath, 0o755);

			const res = await runCommand(scriptPath, []);

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, 'Shebang executed successfully!');
		});
	} finally {
		await Deno.remove(tempDir, { recursive: true });
	}
});

Deno.test('Transpiler Options & Flags', async (t) => {
	const tempDir = await Deno.makeTempDir();

	try {
		const debugScript = `@debug{
	@c(log 'DEBUG_ACTIVE')
}
@c(log 'MAIN_ACTIVE')
`;
		const jsScript = `@js{
	console.log("JS_ACTIVE");
@}
`;
		await Deno.writeTextFile(`${tempDir}/debug.msjs`, debugScript);
		await Deno.writeTextFile(`${tempDir}/js.msjs`, jsScript);

		await t.step('debug blocks enabled by default', async () => {
			const res = await runCommand(MSJSTLR_BIN, [`${tempDir}/debug.msjs`]);

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, 'DEBUG_ACTIVE');
			assertStringIncludes(res.stdout, 'MAIN_ACTIVE');
		});

		await t.step('--disable-debug disables debug blocks', async () => {
			const res = await runCommand(MSJSTLR_BIN, ['--disable-debug', `${tempDir}/debug.msjs`]);

			assertEquals(res.code, 0, res.stderr);
			assertEquals(res.stdout.includes('DEBUG_ACTIVE'), false);
			assertStringIncludes(res.stdout, 'MAIN_ACTIVE');
		});

		await t.step('MESGJS_DEFAULT_DEBUG=false disables debug blocks by default', async () => {
			const res = await runCommand(MSJSTLR_BIN, [`${tempDir}/debug.msjs`], {
				env: { MESGJS_DEFAULT_DEBUG: 'false' },
			});

			assertEquals(res.code, 0, res.stderr);
			assertEquals(res.stdout.includes('DEBUG_ACTIVE'), false);
			assertStringIncludes(res.stdout, 'MAIN_ACTIVE');
		});

		await t.step('--enable-debug overrides MESGJS_DEFAULT_DEBUG=false', async () => {
			const res = await runCommand(MSJSTLR_BIN, ['--enable-debug', `${tempDir}/debug.msjs`], {
				env: { MESGJS_DEFAULT_DEBUG: 'false' },
			});

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, 'DEBUG_ACTIVE');
			assertStringIncludes(res.stdout, 'MAIN_ACTIVE');
		});

		await t.step('--disable-js rejects @js blocks during transpilation', async () => {
			const res = await runCommand(MSJSTLR_BIN, ['--disable-js', `${tempDir}/js.msjs`]);

			assertEquals(res.code === 0, false);
			assertStringIncludes(res.stderr, 'Transpilation errors');
		});
	} finally {
		await Deno.remove(tempDir, { recursive: true });
	}
});

Deno.test('Module Deferred Loading & Voting (deferLoad)', async (t) => {
	const tempDir = await Deno.makeTempDir();

	try {
		// Entrypoint votes to defer modA, but not modB
		const mainMsjs = `[(
			modpath=main
			featreq=[ featA featB ]
			deferLoad=[ modA ]
		)]
		@c(log MAIN_START)
		@c(fwait featA)(then { @c(log MAIN_END) })
		`;

		// modA provides featA
		const modAMsjs = `[(
			modpath=modA
			featpro=[ featA ]
		)]
		@c(log MODA_LOADED)
		@c(fready featA)
		`;

		// modB provides featB
		const modBMsjs = `[(
			modpath=modB
			featpro=[ featB ]
		)]
		@c(log MODB_LOADED)
		`;

		await Deno.writeTextFile(`${tempDir}/main.msjs`, mainMsjs);
		await Deno.writeTextFile(`${tempDir}/modA.msjs`, modAMsjs);
		await Deno.writeTextFile(`${tempDir}/modB.msjs`, modBMsjs);

		await t.step('--deps-only reports (deferred) for modA and not for modB', async () => {
			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				`${tempDir}/main.msjs`,
				`${tempDir}/modA.msjs`,
				`${tempDir}/modB.msjs`,
			]);

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, 'modA.msjs [modpath: modA] (deferred)');
			assertStringIncludes(res.stdout, 'modB.msjs [modpath: modB]');
			assertEquals(res.stdout.includes('modB.msjs [modpath: modB] (deferred)'), false);
		});

		await t.step('deferred module loads on demand via fwait at runtime', async () => {
			const res = await runCommand(MSJSTLR_BIN, [
				`${tempDir}/main.msjs`,
				`${tempDir}/modA.msjs`,
				`${tempDir}/modB.msjs`,
			]);

			assertEquals(res.code, 0, res.stderr);
			// main and modB are eager (relative loading order is undefined)
			// modA is deferred, so it loads when main executes @c(fwait featA)
			const modBIndex = res.stdout.indexOf('MODB_LOADED');
			const mainStartIndex = res.stdout.indexOf('MAIN_START');
			const modAIndex = res.stdout.indexOf('MODA_LOADED');
			const mainEndIndex = res.stdout.indexOf('MAIN_END');

			assertEquals(mainStartIndex < modAIndex, true);
			assertEquals(modAIndex < mainEndIndex, true);
			assertEquals(modBIndex < mainEndIndex, true);
		});

		// Test multi-dependent voting
		const voteMainMsjs = `[(
			modpath=voteMain
			featreq=[ featHelper featUtil ]
			deferLoad=[ util ]
		)]
		@c(log 'VOTE_MAIN')
		`;

		// helper requires featUtil and also votes to defer util
		const helperDeferMsjs = `[(
			modpath=helper
			featpro=[ featHelper ]
			featreq=[ featUtil ]
			deferLoad=[ util ]
		)]
		@c(log 'HELPER')
		`;

		// helper requires featUtil but does NOT vote to defer util
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

		await Deno.writeTextFile(`${tempDir}/voteMain.msjs`, voteMainMsjs);
		await Deno.writeTextFile(`${tempDir}/helperDefer.msjs`, helperDeferMsjs);
		await Deno.writeTextFile(`${tempDir}/helperEager.msjs`, helperEagerMsjs);
		await Deno.writeTextFile(`${tempDir}/util.msjs`, utilMsjs);

		await t.step('util is deferred when all requirers vote to defer', async () => {
			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				`${tempDir}/voteMain.msjs`,
				`${tempDir}/helperDefer.msjs`,
				`${tempDir}/util.msjs`,
			]);

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, 'util.msjs [modpath: util] (deferred)');
		});

		await t.step('util is eager when any requirer does not vote to defer', async () => {
			const res = await runCommand(MSJSTLR_BIN, [
				'--deps-only',
				`${tempDir}/voteMain.msjs`,
				`${tempDir}/helperEager.msjs`,
				`${tempDir}/util.msjs`,
			]);

			assertEquals(res.code, 0, res.stderr);
			assertStringIncludes(res.stdout, 'util.msjs [modpath: util]');
			assertEquals(res.stdout.includes('util.msjs [modpath: util] (deferred)'), false);
		});
	} finally {
		await Deno.remove(tempDir, { recursive: true });
	}
});
