import { lex, parse } from "mesgjs/src/lexparse.esm.js";
import { transpileTree } from "mesgjs/src/transpile.esm.js";

// Set up the Mesgjs runtime. May only be called once per process.
// Previously transpiled modules will be loaded normally by the runtime.
// Mesgjs source modules will be transpiled and side-loaded.
export async function setupRuntime ({ modules } = {}) {
	await import('./runtime-loader.esm.js');
	const { fwait, getModMeta, setModMeta } = globalThis.$c;
	if (getModMeta()) throw new Error('setupRuntime: The Mesgjs runtime is not reconfigurable');
	const modMeta = {
		testMode: true,
		modules
	};
	const mesgjsModURLs = {};

	for (const [modPath, modInfo] of Object.entries(modules || {})) {
		const url = modInfo.url;
		if (url?.endsWith('.msjs')) {
			// Not JS - the runtime can't load this directly.
			modInfo.deferLoad = true;
			modInfo.integrity = 'DISABLED';
			mesgjsModURLs[modPath] = url;
		}
	}

	setModMeta(modMeta);

	// Transpile and load any Mesgjs modules we found.
	const loaders = [];
	for (const [modPath, url] of Object.entries(mesgjsModURLs)) {
		loaders.push(loadMesgjsModulePath(url, modPath));
	}
	if (loaders.length) await Promise.all(loaders);

	// Make sure any modules auto-loaded per modMeta are also ready.
	await fwait('@loaded');
}

// Transpile a Mesgjs source file, returning the generated JavaScript code string.
// (The config SLID is never returned.)
export function transpileMesgjs (source, module = 'anonymous') {
	const { tree, errors: parseErrs } = parse(lex(source).tokens);
	if (parseErrs.length) throw new Error(`${module}: Mesgjs parsing failed`);
	const { code, errors: transpErrs, fatal } = transpileTree(tree, { debugBlocks: true, enableJS: true });
	if (transpErrs.length) throw new Error(`${module}: Mesgjs transpilation failed`);
	if (fatal) throw new Error(`${module}: Mesgjs transpilation fatal error`);
	return code;
}

// Dynamically load a Mesgjs module's transpiled JavaScript code.
export async function loadMesgjsModuleJS (code) {
	const mod = await import(`data:application/javascript;base64,${btoa(code)}`);
	if (typeof mod?.loadMsjs === 'function') {
		await mod.loadMsjs('test'); // Call the module's loadMsjs function
	}
	return mod;
}

// Load a module supplied as Mesgjs source code.
export async function loadMesgjsModuleSource (source, module = 'anonymous') {
	const code = transpileMesgjs(source, module);
	return loadMesgjsModuleJS(code);
}

// Load a Mesgjs module from an actual .msjs file.
// (Any internal or external SLID configuration is ignored.)
export async function loadMesgjsModulePath (path, module = path) {
	const source = await Deno.readTextFile(path);
	return loadMesgjsModuleSource(source, module);
}

let module;

export async function codeBlock (code) {
	if (!module) {
		await import('./runtime-loader.esm.js');
		module = $modScope();
	}
	return module.d.b({ cd: code });
}