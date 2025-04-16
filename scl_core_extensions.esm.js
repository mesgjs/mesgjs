/*
 * SysCL Runtime Core-Extension Installer
 * (For guaranteed-load, @-interface extension modules)
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
import { install as installString } from 'syscl/scl_string.esm.js';
import { install as installTry } from 'syscl/scl_try.esm.js';
import { install as installUndefined } from 'syscl/scl_undefined.esm.js';

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
    installString();
    installTry('@try');
    installUndefined();
}

// END;
