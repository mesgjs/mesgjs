/*
 * SQLite Module Catalog Utilities
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 */

import { parseModVer } from 'mesgjs/semver.esm.js';

const _modCache = {}, _versions = {};

export const catalogExt = s => s.endsWith('.msjcat') ? s : (s + '.msjcat');
export const escapeLike = s => s.replace(/[%_\\]/g, '\\$1');

// Verify path_map and modules tables are present in the database
export function checkTables (db) {
    const maps = db.query("select name from sqlite_master where type='table' and name='path_map'");
    const mods = db.query("select name from sqlite_master where type='table' and name='modules'");
    if (!maps.length || !mods.length) throw new Error(`No path map and/or modules in ${dbFile}`);
}

// Return module record (modreq-only or detailed)
export function getModule (db, mod, detail = false) {
    console.log('getModule', mod);
    const cached = _modCache[mod];
    if (cached && (cached.integ || !detail)) return cached;
    const { path, major, minor, patch, extver } = parseModVer(mod);
    console.log(path, major, minor, patch, extver);
    if (major === undefined) return;
    const [ row ] = db.query('select ' + (detail ? 'modreq, integ, featpro, featreq' : 'modreq') + ' from modules where major = ? and minor = ? and patch = ? and extver = ?', [ major, minor, patch, extver ?? '' ]);
    if (row) {
	const [ modreq, integ, featpro, featreq ] = row;
	return (_modCache[mod] = { path, major, minor, patch, extver, integ, modreq, featpro, featreq });
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
PRIMARY KEY (path, major, minor, patch, extver)
);
    `);
}

// END
