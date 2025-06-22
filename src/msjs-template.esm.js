/*
 * Mesgjs Interface Template
 * Author: Brian Katzung <briank@kappacs.com>
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

// deno-lint-ignore-file

import { getInterface, jsToMsjs, NANOS, runIfCode, setRO } from 'mesgjs/runtime.esm.js';

function opF (d) {
    const { mp } = d;
}

const opAF = d => { };

export function installIF () {
    const ix = getInterface('@template');
    ix.set({
	final: true, lock: true, pristine: true, // singleton: true,
	handlers: {
	    f: opF,
	    af: opAF,
	},
    });
}

// END
