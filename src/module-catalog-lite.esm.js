/*
 * SQLite Module Catalog Utilities
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 */

import { parseModVer } from './semver.esm.js';

const _modCache = {}, _versions = {};
const _pathMap = {}, _pathPreMap = [];
let pathMapLoaded = false;

export const catalogExt = s => s.endsWith('.msjcat') ? s : (s + '.msjcat');
export const escapeLike = s => s.replace(/[%_\\]/g, '\\$1');

// Verify path_map and modules tables are present in the database
export function checkTables (db, file) {
    const maps = db.query("select name from sqlite_master where type='table' and name='path_map'");
    const mods = db.query("select name from sqlite_master where type='table' and name='modules'");
    if (!maps.length || !mods.length) throw new Error(`No path map and/or modules in ${file}`);
}

// Add a module to the catalog
export function addModule (db, mod, { integrity, featpro, featreq, modreq, moddefer }) {
    const { path, major, minor, patch, extver } = parseModVer(mod);
    db.query('insert or replace into modules (path, major, minor, patch, extver, integrity, featpro, featreq, modreq, moddefer) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [ path, major, minor, patch, extver ?? '', integrity, featpro, featreq, modreq, moddefer ]);
}

// Return module record (modreq-only or detailed)
export function getModule (db, mod, detail = false) {
    const cached = _modCache[mod];
    if (cached && (cached.integ || !detail)) return cached;

    const { path, major, minor, patch, extver } = parseModVer(mod);
    if (major === undefined) return;

    const [ row ] = db.query('select ' + (detail ? 'modreq, integ, featpro, featreq, moddefer' : 'modreq') + ' from modules where major = ? and minor = ? and patch = ? and extver = ?', [ major, minor, patch, extver ?? '' ]);
    if (row) {
	const [ modreq, integrity, featpro, featreq, moddefer ] = row;
	return (_modCache[mod] = { path, major, minor, patch, extver, integrity, modreq, featpro, featreq, moddefer });
    };
}

// Return the available versions for a module path and major version.
export function getVersions (db, path, major, extra = false) {
    const pathMajor = `${path}@${major}`, cached = _versions[pathMajor];
    if (cached) return cached;

    const versions = [];
    for (const [minor, patch, extver] of db.query('select minor, patch, extver from modules where path = ? and major = ?', [path, major])) {
	if (!extver || extra) versions.push(`${major}.${minor}.${patch}${extver}`);
    }
    return (_versions[pathMajor] = versions);
}

// Create path_map and modules tables in an empty database.
export function initTables (db) {
    db.execute(`
create table if not exists path_map (
input TEXT NOT NULL PRIMARY KEY,
output TEXT NOT NULL
);

create table if not exists modules (
path TEXT NOT NULL,
major INT NOT NULL,
minor INT NOT NULL,
patch INT NOT NULL,
extver TEXT NOT NULL,
integ TEXT NOT NULL,
featpro TEXT NOT NULL,
featreq TEXT NOT NULL,
modreq TEXT NOT NULL,
moddefer TEXT NOT NULL,
PRIMARY KEY (path, major, minor, patch, extver)
);
    `);
}

// Map a path according to the path_map table
export function mapPath (db, path, { version, detail } = {}) {
    if (!pathMapLoaded) {
	pathMapLoaded = true;
	for (const row of db.query('select input, output from path_map')) {
	    const [ input, output ] = row;
	    if (input.slice(-1) === '/') _pathPreMap.push([ input, output, input.length ]);
	    else _pathMap[input] = output;
	}
    }

    const full = (version && _pathMap[path + version]) || _pathMap[path];
    if (full) return (detail ? [ full ] : full);

    let best = [ '', '', 0 ];
    for (const en of _pathPreMap) if (en[2] > best[2] && path.startsWith(en[0]))best = en;
    const result = best[1] + path.substring(best[2]);
    return (detail ? [ result, best ] : result);
}

// END
