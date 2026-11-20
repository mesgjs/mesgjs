/*
 * msjstlr-startup - Mesgjs TLR (Transpile-Load-Run) Startup Engine
 * Copyright 2026 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 */

import { exit, getEnv } from '@compat/runtime';
import { args as getArgs } from '@compat/cli';
import { readTextFileSync, statSync } from '@compat/file';
import { parseArgs } from '@parseargs';

import { lex, parse } from 'mesgjs/src/lexparse.esm.js';
import { transpileTree } from 'mesgjs/src/transpile.esm.js';
import { NANOS, parseSLID } from '@nanos';
import 'mesgjs/src/runtime/mesgjs.esm.js';

const env = getEnv();
const rawArgs = getArgs();

let scriptArgs = [];
let tlrArgs = rawArgs;
const doubleDashIdx = rawArgs.indexOf('--');
if (doubleDashIdx !== -1) {
	scriptArgs = rawArgs.slice(doubleDashIdx + 1);
	tlrArgs = rawArgs.slice(0, doubleDashIdx);
}

const { values: flags, positionals } = parseArgs({
	args: tlrArgs,
	options: {
		'all': { type: 'boolean', short: 'a', default: false },
		'deps-only': { type: 'boolean', default: false },
		'disable-debug': { type: 'boolean', default: false },
		'disable-js': { type: 'boolean', default: false },
		'enable-debug': { type: 'boolean', default: false },
	},
	allowPositionals: true,
	strict: false,
});

if (!positionals.length) {
	console.error('Usage: msjstlr [options] <files...> [-- <script-args...>]');
	exit(1);
}

const envDebug = env?.MESGJS_DEFAULT_DEBUG;
const defaultDebug = envDebug !== 'false';
let debugBlocks = defaultDebug;
if (flags['enable-debug']) debugBlocks = true;
else if (flags['disable-debug']) debugBlocks = false;

const txpOpts = {
	enableJS: !flags['disable-js'],
	debugBlocks,
};

function extractJsSLID (filePath) {
	const text = readTextFileSync(filePath);

	return parseSLID(text);
}

function extractValues (val) {
	if (!val) return [];
	if (typeof val === 'string') return val.split(/[,\s]+/).filter(Boolean);
	if (Array.isArray(val)) return val.map(String).filter(Boolean);
	if (val instanceof NANOS || (typeof val === 'object' && typeof val?.values === 'function')) {
		return Array.from(val.values()).map(String).filter(Boolean);
	}
	if (typeof val === 'object') {
		return Object.values(val).map(String).filter(Boolean);
	}
	return [String(val)];
}

function extractMetadata (filePath) {
	try {
		const stat = statSync(filePath);

		if (!stat.isFile) {
			console.error(`Error: "${filePath}" is not a regular file`);
			exit(1);
		}
	} catch (_err) {
		console.error(`Error: File not found: "${filePath}"`);
		exit(1);
	}

	const isMsjs = filePath.endsWith('.msjs');
	let config = null;
	let tokens = null;

	if (isMsjs) {
		const source = readTextFileSync(filePath);
		const lexResult = lex(source, { src: filePath });

		tokens = lexResult.tokens;
		if (lexResult.configSLID) {
			try {
				config = parseSLID(lexResult.configSLID);
			} catch (err) {
				console.error(`Error: Failed to parse configuration SLID in "${filePath}": ${err.message}`);
				exit(1);
			}
		}
	} else {
		config = extractJsSLID(filePath);
	}

	const baseNameMatch = filePath.match(/(?:.*\/)?([^@\/]+)(?:@.*)?\.(?:msjs|esm\.js|js)$/);
	const fallbackModPath = baseNameMatch ? baseNameMatch[1] : filePath.split('/').pop().replace(/\.(msjs|esm\.js|js)$/, '');
	const modPath = config?.at('modpath') || fallbackModPath;

	const featpro = extractValues(config?.at('featpro'));
	const featreq = extractValues(config?.at('featreq'));
	const modcaps = extractValues(config?.at('modcaps'));
	const deferLoad = extractValues(config?.at('deferLoad'));

	return {
		path: filePath,
		isMsjs,
		tokens,
		config,
		modPath,
		featpro,
		featreq,
		modcaps,
		deferLoad,
	};
}

const allFileMetas = positionals.map(extractMetadata);
const entrypoint = allFileMetas[0];

// Map feature -> array of provider files
const providersByFeature = new Map();
for (const fileMeta of allFileMetas) {
	for (const feat of fileMeta.featpro) {
		if (!providersByFeature.has(feat)) providersByFeature.set(feat, []);
		providersByFeature.get(feat).push(fileMeta);
	}
}

let includedFiles;
const errors = [];

if (flags.all) {
	includedFiles = new Set(allFileMetas);
	for (const [feat, providers] of providersByFeature.entries()) {
		if (providers.length > 1) {
			errors.push(`Duplicate feature provider for "${feat}": found in ${providers.map(p => `"${p.path}"`).join(', ')}`);
		}
	}
} else {
	includedFiles = new Set([entrypoint]);
	const queue = [...entrypoint.featreq];
	const resolvedFeatures = new Set();

	while (queue.length > 0) {
		const feat = queue.shift();

		if (resolvedFeatures.has(feat)) continue;
		resolvedFeatures.add(feat);

		const providers = providersByFeature.get(feat) || [];

		if (providers.length === 0) {
			errors.push(`Unresolved feature requirement: "${feat}" required by dependency traversal`);
		} else if (providers.length > 1) {
			errors.push(`Duplicate feature provider for "${feat}": found in ${providers.map(p => `"${p.path}"`).join(', ')}`);
		} else {
			const providerFile = providers[0];

			if (!includedFiles.has(providerFile)) {
				includedFiles.add(providerFile);
				for (const req of providerFile.featreq) {
					queue.push(req);
				}
			}
		}
	}

	// Verify no duplicate providers across all included files
	const includedProviders = new Map();

	for (const fileMeta of includedFiles) {
		for (const feat of fileMeta.featpro) {
			if (!includedProviders.has(feat)) includedProviders.set(feat, []);
			includedProviders.get(feat).push(fileMeta);
		}
	}
	for (const [feat, providers] of includedProviders.entries()) {
		if (providers.length > 1 && !errors.some(e => e.includes(`Duplicate feature provider for "${feat}"`))) {
			errors.push(`Duplicate feature provider for "${feat}": found in ${providers.map(p => `"${p.path}"`).join(', ')}`);
		}
	}
}

// Determine eager vs deferred modules
const eager = new Set([entrypoint.modPath]);

for (const fileMeta of includedFiles) {
	const deferSet = new Set(fileMeta.deferLoad);

	for (const reqFeat of fileMeta.featreq) {
		const providers = providersByFeature.get(reqFeat);

		if (providers?.length) {
			const providerModPath = providers[0].modPath;

			if (!deferSet.has(providerModPath)) {
				eager.add(providerModPath);
			}
		}
	}
}

if (flags['deps-only']) {
	console.log(`Primary entrypoint: ${entrypoint.path} (modpath: ${entrypoint.modPath})`);
	console.log(`Resolved Files (${includedFiles.size}):`);
	for (const f of includedFiles) {
		const deferredStr = eager.has(f.modPath) ? '' : ' (deferred)';

		console.log(`  - ${f.path} [modpath: ${f.modPath}]${deferredStr}`);
		if (f.featpro.length) console.log(`      Provides: ${f.featpro.join(', ')}`);
		if (f.featreq.length) console.log(`      Requires: ${f.featreq.join(', ')}`);
	}
	if (errors.length) {
		console.error('\nDependency Errors:');
		for (const err of errors) console.error(`  - ${err}`);
		exit(1);
	} else {
		console.log('\nDependencies successfully resolved.');
		exit(0);
	}
}

if (errors.length) {
	console.error('Dependency resolution failed:');
	for (const err of errors) console.error(`  - ${err}`);
	exit(1);
}

// In-memory transpilation
for (const fileMeta of includedFiles) {
	if (fileMeta.isMsjs) {
		const { tree, errors: parseErrors } = parse(fileMeta.tokens);

		if (parseErrors?.length) {
			console.error(`Parse errors in "${fileMeta.path}":\n${parseErrors.join('\n')}`);
			exit(1);
		}

		const { code, errors: txpErrors, fatal } = transpileTree(tree, txpOpts);

		if (txpErrors?.length) console.error(`Transpilation errors in "${fileMeta.path}":\n${txpErrors.join('\n')}`);
		if (fatal) console.error(`Transpilation fatal error in "${fileMeta.path}": ${fatal}`);
		if (txpErrors?.length || fatal) exit(1);

		const b64Code = new TextEncoder().encode(code).toBase64();

		fileMeta.url = `data:application/javascript;base64,${b64Code}`;
	} else {
		const jsCode = readTextFileSync(fileMeta.path);
		const b64Code = new TextEncoder().encode(jsCode).toBase64();
		fileMeta.url = `data:application/javascript;base64,${b64Code}`;
	}
}

// Assemble modMeta
const modMeta = {
	testMode: true,
	suppressUnverifiedModuleWarning: true,
	modules: {},
};

for (const fileMeta of includedFiles) {
	const modEntry = {
		url: fileMeta.url,
		integrity: 'DISABLED',
		deferLoad: !eager.has(fileMeta.modPath),
	};

	if (fileMeta.featpro.length) modEntry.featpro = fileMeta.featpro;
	if (fileMeta.featreq.length) modEntry.featreq = fileMeta.featreq;
	if (fileMeta.modcaps.length) modEntry.modcaps = fileMeta.modcaps;
	modMeta.modules[fileMeta.modPath] = modEntry;
}

if (doubleDashIdx !== -1) {
	if (globalThis.Deno) {
		Object.defineProperty(globalThis.Deno, 'args', {
			value: scriptArgs,
			configurable: true,
			writable: true,
			enumerable: true,
		});
	}
	if (globalThis.process?.argv) {
		process.argv = [process.argv[0], positionals[0] || '', ...scriptArgs];
	}
}

const { setModMeta, fwait } = globalThis.$c;

setModMeta(modMeta);
await fwait('@loaded');
