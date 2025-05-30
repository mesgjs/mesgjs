/*
 * msjsloader - Mesgjs module linker/loader
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 *
 * --cat - Module catalog database
 * --html - Wrap in a simple HTML page template
 * --out - Output file
 */

import { parseArgs } from 'jsr:@std/cli/parse-args';
import { DB } from 'https://deno.land/x/sqlite/mod.ts';
import { lex } from 'mesgjs/lexparse.esm.js';
import { parseSLID } from 'nanos/nanos.esm.js';

const flags = parseArgs(Deno.args {
    boolean: [ 'html' ],
    string: [ 'cat', 'db', 'out' ],
});

const dbExt = s => s.endsWith('.msjcat') ? s : (s + '.msjcat');
const dbFile = dbExt(flags.db || 'modules');

const main = flags._[0];
if (!main) throw new Error(`Main entry point module or .msjs file required as first parameter`);
if (main.endsWith('.msjs')) {
    const jsFile = main.replace(/\.msjs$/, '.esm.js');
    const src = Deno.readTextFileSync(main);
    const js = Deno.readTextFileSync(jsFile);
    const { configSLID } = lex(src);
    link(configSlid?.at('versreqs') || '', { js });
} else {
}

// END
