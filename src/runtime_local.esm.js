/*
 * Mesgjs Runtime Local Configuration
 *
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

// Post-@core foundation-class installers
import { install as installBoolean } from 'mesgjs/msjs_boolean.esm.js';
import { install as installCore } from 'mesgjs/msjs_core.esm.js';
import { install as installJSArray } from 'mesgjs/js_array.esm.js';
import { install as installList } from 'mesgjs/msjs_list.esm.js';
import { install as installKVIter } from 'mesgjs/msjs_kv_iter.esm.js';
import { install as installLoop } from 'mesgjs/msjs_loop.esm.js';
import { install as installMap } from 'mesgjs/msjs_map.esm.js';
import { install as installNull } from 'mesgjs/msjs_null.esm.js';
import { install as installNumber } from 'mesgjs/msjs_number.esm.js';
import { install as installPromise } from 'mesgjs/msjs_promise.esm.js';
import { install as installReactive } from 'mesgjs/msjs_reactive.esm.js';
import { install as installRegex } from 'mesgjs/msjs_regex.esm.js';
import { install as installSet } from 'mesgjs/msjs_set.esm.js';
import { install as installString } from 'mesgjs/msjs_string.esm.js';
import { install as installTry } from 'mesgjs/msjs_try.esm.js';
import { install as installUndefined } from 'mesgjs/msjs_undefined.esm.js';

// Guaranteed-load, @-interface extension modules
export function installCoreExtensions () {
    installCore('@core');		// SHOULD ALWAYS BE FIRST

    installBoolean();
    installJSArray('@jsArray');
    installKVIter('@kvIter');
    installList('@list');
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

import { getInstance, NANOS } from 'mesgjs/runtime.esm.js';

// Promote a JS object to a MSJS object for messaging
export const msjsInstance = Symbol.for('msjsInstance');
export function jsToMSJS (jsv) {
    if (jsv?.msjsType) return jsv;
    switch (typeof jsv) {
    case 'boolean':
	return getInstance(jsv ? '@true' : '@false');
    case 'bigint':
    case 'number':
	return getInstance('@number', jsv);
    case 'object':
	if (jsv === null) return getInstance('@null');
	if (jsv[msjsInstance]) return jsv[msjsInstance];
	if (jsv instanceof NANOS) return getInstance('@list', [jsv]);
	if (jsv instanceof RegExp) return getInstance('@regex', jsv);
	// Not sure if we'll see many of these "in the wild"
	// if (jsv?.$reactive) return getInstance('@reactive', jsv);
	if (Array.isArray(jsv)) return getInstance('@jsArray', [jsv]);
	if (jsv instanceof Map) return getInstance('@map', [jsv]);
	if (jsv instanceof Set) return getInstance('@set', [jsv]);
	return getInstance('@undefined');
    case 'string':
	return getInstance('@string', jsv);
    default:
	return getInstance('@undefined');
    }
}

// END;
