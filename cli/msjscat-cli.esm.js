/*
 * msjscat - Mesgjs catalog database utility
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 *
 * --db - database file name (default is "modules")
 * --lsmap - list path-map entries
 * --lsmod - list module entries
 * --mapin - path-map input path
 * --mapout - path-map output path
 * --mod - module path/prefix, optional (partial?) version (lsmod filter)
 * --rmmap - remove path-map associated with --mapin
 */

import { parseArgs } from 'jsr:@std/cli/parse-args';
import { DB } from 'https://deno.land/x/sqlite/mod.ts';
import { catalogExt, escapeLike, initTables } from 'mesgjs/msjs-catalog-lite.esm.js';

const flags = parseArgs(Deno.args, {
    boolean: [ 'lsmap', 'lsmod', 'rmmap' ],
    string: [ 'db', 'mapin', 'mapout', 'mod' ],
});
const dbFile = catalogExt(flags.db || 'modules');
const db = new DB(dbFile);

initTables(db);

if (flags.mapin) {
    if (flags.rmmap) db.query('delete from path_map where input = ?', [flags.mapin]);
    else if (flags.mapout) db.query('insert into path_map (input, output) values (?, ?)', [flags.mapin, flags.mapout]);
    else {
	const [rows] = db.query('select output from path_map where input = ?', [flags.mapin]);
	if (rows) console.log(flags.mapin + ':', rows[0]);
	else console.log(`Path-map entry "${flags.mapin}" not found`);
    }
}

if (flags.lsmap) {
    console.log('Path-map entries:');
    for (const [input, output] of db.query('select input, output from path_map')) console.log(input + ':', output);
}

if (flags.lsmod) {
    const [ , path, major, minor, patch ] = (flags.mod || '').match(/^(.*?)(?:@(\d+)(?:\.(\d+))?(?:\.(\d+))?)?$/) || [];
    console.log('Module entries:');
    const where = [], params = [];
    const addCond = (label, value) => {
	where.push(`${label} = ?`);
	params.push(value);
    };
    if (path?.slice(-1) === '/') {
	where.push("path like ? escape '\\'");
	params.push(escapeLike(path) + '%');
    } else if (path) addCond('path', path);
    if (major !== undefined) addCond('major', major);
    if (minor !== undefined) addCond('minor', minor);
    if (patch !== undefined) addCond('patch', patch);
    const query = 'select path, major, minor, patch, extver, integ, featpro, featreq, modreq from modules' + (where.length ? (' where ' + where.join(' and ')) : '');
    for (const [path, major, minor, patch, extver, integ, featpro, featreq, modreq] of db.query(query, params)) {
	console.log('*', path, `${major}.${minor}.${patch}${extver}:`);
	console.log('Integrity:', integ);
	if (featpro) console.log('Features provided:', featpro);
	if (featreq) console.log('Features required:', featreq);
	if (modreq) console.log('Modules required:', modreq);
	console.log('---');
    }
}
