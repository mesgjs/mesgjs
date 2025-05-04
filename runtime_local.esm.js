/*
 * SysCL Runtime Local Configuration
 *
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

// Post-@core foundation-class installers
import { install as installBoolean } from 'syscl/scl_boolean.esm.js';
import { install as installCore } from 'syscl/scl_core.esm.js';
import { install as installJSArray } from 'syscl/js_array.esm.js';
import { install as installList } from 'syscl/scl_list.esm.js';
import { install as installListIter } from 'syscl/scl_list_iter.esm.js';
import { install as installLoop } from 'syscl/scl_loop.esm.js';
import { install as installNull } from 'syscl/scl_null.esm.js';
import { install as installNumber } from 'syscl/scl_number.esm.js';
import { install as installPromise } from 'syscl/scl_promise.esm.js';
import { install as installReactive } from 'syscl/scl_reactive.esm.js';
import { install as installRegex } from 'syscl/scl_regex.esm.js';
import { install as installString } from 'syscl/scl_string.esm.js';
import { install as installTry } from 'syscl/scl_try.esm.js';
import { install as installUndefined } from 'syscl/scl_undefined.esm.js';

// Guaranteed-load, @-interface extension modules
export function installCoreExtensions () {
    installCore('@core');		// SHOULD ALWAYS BE FIRST

    installBoolean();
    installJSArray('@jsArray');
    installList('@list');
    installListIter('@listIter');
    installLoop('@loop');
    installNull();
    installNumber();
    installPromise('@promise');
    installReactive('@reactive');
    installRegex();
    installString();
    installTry('@try');
    installUndefined();
}

import { getInstance, NANOS } from 'syscl/runtime.esm.js';

// Promote a JS object to a SCL object for messaging
export const sclInstance = Symbol.for('sclInstance');
export function jsToSCL (jsv) {
    if (jsv?.sclType) return jsv;
    switch (typeof jsv) {
    case 'boolean':
	return getInstance(jsv ? '@true' : '@false');
    case 'bigint':
    case 'number':
	return getInstance('@number', jsv);
    case 'object':
	if (jsv === null) return getInstance('@null');
	if (jsv[sclInstance]) return jsv[sclInstance];
	if (jsv instanceof NANOS) return getInstance('@list', [jsv]);
	if (jsv instanceof RegExp) return getInstance('@regex', jsv);
	// Not sure if we'll see many of these "in the wild"
	// if (jsv?.$reactive) return getInstance('@reactive', jsv);
	if (Array.isArray(jsv)) return getInstance('@jsArray', [jsv]);
	return getInstance('@undefined');
    case 'string':
	return getInstance('@string', jsv);
    default:
	return getInstance('@undefined');
    }
}

// END;
