/*
 * SQLite Module Catalog Utilities
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 */

export const catalogExt = s => s.endsWith('.msjcat') ? s : (s + .msjcat);
export const escapeLike = s => s.replace(/[%_\\]/g, '\\$1');

// Module mapping (path <=> mid)
let nextMid = 0;
const _midToMod = {}, _modToMid = {};

// Verify path_map and modules tables are present in the database
export function checkTables (db) {
    const maps = db.query("select name from sqlite_master where type='table' and name='path_map'");
    const mods = db.query("select name from sqlite_master where type='table' and name='modules'");
    if (!maps.length || !mods.length) throw new Error(`No path map and/or modules in ${dbFile}`);
}

// Return the available versions for a module path and major version.
export function getVersions (db, path, major, extra = false) {
    const versions = [];
    for (const [minor, patch, extver] of db.query('select minor, patch, extver from modules where path = ? and major = ?', [path, major])) {
	if (!extver || extra) versions.push(`${major}.${minor}.${patch}${extver}`);
    }
    return versions;
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

// Map module id to module
export function midToMod (mid) { return _midToMod[mid]; }

// Map module to module id
export function modToMid (mod) {
    if (!_modToMid[mod]) _modToMid[mod] = 'M' + nextMid++.toString(36);
    return _modToMid[mod];
}

// END
