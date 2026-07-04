/*
 * Mesgjs Entry-Point Module And Runtime Local Configuration
 *
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
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
import { install as installTimestamp } from './msjs-timestamp.esm.js';
import { install as installTry } from './msjs-try.esm.js';
import { install as installUndefined } from './js-undefined.esm.js';

import { getInstance, initialize, setModMeta, setRO } from './runtime.esm.js';
import { NANOS } from '@nanos';
import { reactive } from '@reactive';

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
	installTimestamp('@timestamp');
	installTry('@try');
	installUndefined();
}

let arrayBox;
let falseBox;
let mapBox;
let nullBox;
let numberBox;
let objectBox;
let reactiveBox;
let regExpBox;
let setBox;
let stringBox;
let trueBox;
let undefBox;

/**
 * Returns the Mesgjs receiver for a non-Mesgjs object.
 * IMPORTANT:
 *   This function is only meant for internal use by the messaging system. The
 *   same exact (JS ===) receiver object may be used for a range of inputs, so
 *   the return value by itself does not necessarily distinctly represent the input.
 *   For example, one singleton receives messages for all numbers, and another
 *   singleton receives messages for all strings. In such cases, distinctiveness is
 *   part of dispatch state ("original receiver"), not a property of the receiver.
 *   
 * @param {*} jsv - JS value
 * @returns {MsjsObj} - The Mesgjs receiver object
 */
function msjsReceiver (jsv) {
	let instance;

	if (!nullBox) { // Preload key types
		falseBox = getInstance('@false');
		nullBox = getInstance('@null');
		numberBox = getInstance('@number');
		reactiveBox = getInstance('@reactive');
		stringBox = getInstance('@string');
		trueBox = getInstance('@true');
		undefBox = getInstance('@undefined');
	}
	switch (typeof jsv) {
	case 'boolean':
		return jsv ? trueBox : falseBox;
	case 'bigint':
	case 'number':
		return numberBox;
	case 'object':
		if (jsv === null) return nullBox;
		if (jsv.msjsType) return jsv;
		instance = jsv[instanceSym] || instances.get(jsv);
		if (!instance) {
			if (jsv[convertSym]) instance = jsv[convertSym]();
			else if (Array.isArray(jsv)) {
				arrayBox ||= getInstance('@jsArray');
				instance = arrayBox;
			}
			else if (jsv.$reactive === reactive.type) {
				reactiveBox ||= getInstance('@reactive');
				instance = reactiveBox;
			}
			else if ((jsv.constructor?.name ?? 'Object') === 'Object') {
				objectBox ||= getInstance('@jsObject');
				instance = objectBox;
			}
			else if (jsv instanceof RegExp) {
				regExpBox ||= getInstance('@regex');
				instance = regExpBox;
			}
			else if (jsv instanceof Map) {
				mapBox ||= getInstance('@map');
				instance = mapBox;
			}
			else if (jsv instanceof Set) {
				setBox ||= getInstance('@set');
				instance = setBox;
			}
			if (instance) instances.set(jsv, instance);
		}
		return instance;
	case 'string':
		return stringBox;
	case 'undefined':
		return undefBox;
	}
	// No compatible instance available
}

// ($)toMsjs backwards-compatibility function
// (deprecated - use $c.sm (sendAnonMessage) in new code)
function toMsjs (rr) {
	const rfn = (op, mp) => $c.sm(rr, op, mp);

	rfn.msjsType = rr?.msjsType;
	rfn.jsv = rr;
	rfn.valueOf = () => rr;
	return rfn;
}

setRO(globalThis, {
	$msjsReceiver: msjsReceiver,
	$toMsjs: toMsjs,
});
initialize(installCoreExtensions);

// END
