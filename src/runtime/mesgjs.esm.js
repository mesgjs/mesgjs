/*
 * Mesgjs Entry-Point Module And Runtime Local Configuration
 *
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

// @core and post-@core foundation-class installers
import { install as installCore } from './msjs-core.esm.js';
import { install as installBoolean } from './js-boolean.esm.js';
import { install as installJSArray } from './js-array.esm.js';
import { install as installJSObject } from './js-object.esm.js';
import { install as installList } from './msjs-list.esm.js';
import { install as installKVIter } from './msjs-kv-iter.esm.js';
import { install as installLoop } from './msjs-loop.esm.js';
import { install as installMap } from './js-map.esm.js';
import { install as installNull } from './js-null.esm.js';
import { install as installNumber } from './js-number.esm.js';
import { install as installPromise } from './js-promise.esm.js';
import { install as installReactive } from './msjs-reactive.esm.js';
import { install as installRegex } from './js-regex.esm.js';
import { install as installSet } from './js-set.esm.js';
import { install as installString } from './js-string.esm.js';
import { install as installTry } from './msjs-try.esm.js';
import { install as installUndefined } from './js-undefined.esm.js';

import { getInstance, initialize, setModMeta, setRO } from './runtime.esm.js';
import { NANOS } from './vendor.esm.js';
import { isPlainObject } from './unified-list.esm.js';

// The minimum "main program":
// import { setModMeta } from '.../mesgjs.esm.js';
// setModMeta({ config });
export { setModMeta };

const instanceSym = Symbol.for('msjsInstance');
const convertSym = Symbol.for('toMsjs');
const instances = new WeakMap();

// Guaranteed-load, @-interface extension modules
function installCoreExtensions () {
	/*
	 * This JavaScript class is foundational to the language.
	 * Help lots of modules (especially JavaScript-based loadable
	 * interface modules) avoid dealing with import-vendoring it.
	 */
	globalThis.NANOS = NANOS;

	// @core should always be installed first
	installCore('@core');
	if (!globalThis.$c) throw new Error('@core installation incomplete');

	// Attach some additional runtime-related properties, then lock it
	setRO($c, 'symbols', {
		convert: convertSym,
		instance: instanceSym,
	});
	Object.freeze($c.symbols);
	Object.freeze($c);

	installBoolean();
	installJSArray('@jsArray');
	installJSObject('@jsObject');
	installKVIter('@kvIter');
	installList('@list');
	// Teach toMsjs how to convert NANOS to a Msjs @list
	NANOS.prototype[convertSym] = function () {
		return getInstance('@list', [this]);
	}
	installLoop('@loop');
	installMap('@map');
	installNull();
	installNumber();
	installPromise('@promise');
	installReactive('@reactive');
	installRegex();
	installSet('@set');
	installString();
	installTry('@try');
	installUndefined();
}

// Promote a JS object to a Msjs object for messaging
function toMsjs (jsv) {
	if (jsv?.msjsType) return jsv;
	let instance;
	switch (typeof jsv) {
	case 'boolean':
		return getInstance(jsv ? '@true' : '@false');
	case 'bigint':
	case 'number':
		return getInstance('@number', [jsv]);
	case 'object':
		if (jsv === null) return getInstance('@null');
		instance = jsv[instanceSym] || instances.get(jsv);
		if (!instance) {
			if (jsv[convertSym]) instance = jsv[convertSym]();
			else if (jsv instanceof RegExp) instance = getInstance('@regex', [jsv]);
			else if (Array.isArray(jsv)) instance = getInstance('@jsArray', [jsv]);
			else if (jsv instanceof Map) instance = getInstance('@map', [jsv]);
			else if (jsv instanceof Set) instance = getInstance('@set', [jsv]);
			else if (isPlainObject(jsv)) instance = getInstance('@jsObject', [jsv]);
			if (instance) instances.set(jsv, instance);
		}
		if (instance) return instance;
		return getInstance('@undefined');
	case 'string':
		return getInstance('@string', [jsv]);
	default:
		return getInstance('@undefined');
	}
}

setRO(globalThis, '$toMsjs', toMsjs);
initialize(installCoreExtensions);

// END
