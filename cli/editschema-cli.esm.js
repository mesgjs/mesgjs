/*
 * editschema - Mesgjs SQLite schema editor
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 */

import { exit, getEnv } from '@compat/runtime';
import { args as getArgs } from '@compat/cli';
import { parseArgs } from '@parseargs';
import { readTextFileSync } from '@compat/file';
import { openDatabase } from '@compat/sqlite';
import { parseSLID } from '@nanos';

// --- Main ---

const rawArgs = getArgs();
const { positionals } = parseArgs({ args: rawArgs, allowPositionals: true });

// Show help if no arguments are provided.
if (positionals.length < 2) {
	showHelp();
	exit(positionals.length ? 1 : 0);
}

// Get the database and SLID file paths from the command-line arguments.
const [dbPath, slidPath] = positionals;

try {
	// Read and parse the SLID file.
	const slidContent = readTextFileSync(slidPath);
	const edits = parseSLID(slidContent);

	// Open the database.
	const db = await openDatabase(dbPath);

	// Process the schema edits.
	processEdits(db, edits);

	// Close the database.
	db.close();

	console.log('Schema update complete.');
} catch (err) {
	let debug = false;
	try {
		debug = Boolean(getEnv()?.DEBUG);
	} catch {
		// Ignore if env permission is not granted
	}

	if (debug) throw err;
	console.error(`Error: ${err.message}`);
	exit(1);
}

// --- Functions ---

/**
 * Displays the help message for the utility.
 */
function showHelp () {
	console.log(`
Usage:
  editschema <db-file> <slid-file>

Arguments:
  <db-file>	   : Path to the SQLite database file.
  <slid-file>  : Path to the SLID file with schema edits.
  `);
}

/**
 * Processes the schema edits from the SLID file.
 *
 * @param {object} db The database instance.
 * @param {object} edits The parsed SLID file content.
 */
function processEdits (db, edits) {
	// The SLID file is a list with one item or directly a NANOS with 'add' and/or 'remove' lists.
	const editSet = edits.at?.(0) ?? edits;
	const identRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

	const validateIdentifier = (ident) => {
		if (!identRegex.test(ident)) throw new Error(`Invalid identifier: ${ident}`);
	};

	const removals = editSet.get?.('remove') ?? editSet.at?.('remove');
	if (removals) {
		for (const [tableName, fields] of removals.entries()) {
			validateIdentifier(tableName);
			const schema = getTableSchema(db, tableName);
			for (const fieldName of fields.values()) {
				validateIdentifier(fieldName);
				if (schema.includes(fieldName)) {
					console.log(`Removing column ${fieldName} from table ${tableName}...`);
					// NOTE: ALTER TABLE ... DROP COLUMN requires SQLite 3.35.0+
					db.query(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${fieldName}\``);
				} else {
					console.warn(`Warning: Column ${fieldName} not found in table ${tableName}; skipping removal.`);
				}
			}
		}
	}

	const additions = editSet.get?.('add') ?? editSet.at?.('add');
	if (additions) {
		for (const [tableName, fields] of additions.entries()) {
			validateIdentifier(tableName);
			const schema = getTableSchema(db, tableName);
			for (const [fieldName, fieldSpec] of fields.entries()) {
				validateIdentifier(fieldName);
				if (fieldSpec.includes(';')) {
					throw new Error(`Invalid characters in field spec: ${fieldSpec}`);
				}
				if (!schema.includes(fieldName)) {
					console.log(`Adding column ${fieldName} to table ${tableName}...`);
					db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${fieldName}\` ${fieldSpec}`);
				} else {
					console.warn(`Warning: Column ${fieldName} already exists in table ${tableName}; skipping addition.`);
				}
			}
		}
	}
}

/**
 * Retrieves the schema for a given table.
 *
 * @param {object} db The database instance.
 * @param {string} tableName The name of the table.
 * @returns {string[]} A list of column names in the table.
 */
function getTableSchema (db, tableName) {
	// Use the table-valued function pragma_table_info for bindings
	const query = 'SELECT name FROM pragma_table_info(?)';
	const results = db.query(query, [tableName]);

	// The column name is the first element of each result row
	return results.flat();
}

// END
