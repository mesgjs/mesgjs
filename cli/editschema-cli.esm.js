/*
 * editschema - Mesgjs SQLite schema editor
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 */

import { parseArgs } from 'jsr:@std/cli/parse-args';
import { DB } from 'https://deno.land/x/sqlite/mod.ts';
import { parseSLID } from 'nanos/src/nanos.esm.js';

// --- Main ---

const flags = parseArgs(Deno.args, {});

// Show help if no arguments are provided.
if (flags._.length < 2) {
  showHelp();
  Deno.exit(flags._.length ? 1 : 0);
}

// Get the database and SLID file paths from the command-line arguments.
const [dbPath, slidPath] = flags._;

try {
  // Read and parse the SLID file.
  const slidContent = await Deno.readTextFileSync(slidPath);
  const edits = parseSLID(slidContent);

  // Open the database.
  const db = new DB(dbPath);

  // Process the schema edits.
  processEdits(db, edits);

  // Close the database.
  db.close();

  console.log('Schema update complete.');
} catch (err) {
  if (Deno.env.has('DEBUG')) throw err;
  console.error(`Error: ${err.message}`);
  Deno.exit(1);
}

// --- Functions ---

/**
 * Displays the help message for the utility.
 */
function showHelp() {
  console.log(`
Usage:
  editschema <db-file> <slid-file>

Arguments:
  <db-file>    : Path to the SQLite database file.
  <slid-file>  : Path to the SLID file with schema edits.
  `);
}

/**
 * Processes the schema edits from the SLID file.
 *
 * @param {DB} db The database instance.
 * @param {NANOS} edits The parsed SLID file content.
 */
function processEdits(db, edits) {
  // The SLID file is a list with one item, a NANOS with 'add' and/or 'remove' lists.
  const editSet = edits.at(0);
  const identRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

  const validateIdentifier = (ident) => {
    if (!identRegex.test(ident)) throw new Error(`Invalid identifier: ${ident}`);
  };

  const removals = editSet.get('remove');
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

  const additions = editSet.get('add');
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
 * @param {DB} db The database instance.
 * @param {string} tableName The name of the table.
 * @returns {string[]} A list of column names in the table.
 */
function getTableSchema(db, tableName) {
  // Use the table-valued function pragma_table_info for bindings
  const query = 'SELECT name FROM pragma_table_info(?)';
  const results = db.query(query, [tableName]);

  // The column name is the first element of each result row
  return results.flat();
}

// END
