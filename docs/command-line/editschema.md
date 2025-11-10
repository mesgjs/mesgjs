# `editschema`

The `editschema` tool applies schema edits to a Mesgjs module catalog database (`.msjcat` file) from a SLID input file.

## Usage

$$$
editschema <db-file> <slid-file>
$$$

-   `<db-file>`: Path to the SQLite module catalog database file.
-   `<slid-file>`: Path to the SLID file containing the schema edits.

## SLID File Format

The SLID file must contain a top-level list with one or both of the following keys: `add` and `remove`.

The values for `add` and `remove` are themselves lists where each key is a table name.

### Adding Columns

For the `add` list, the value for each table-name key is another list where each key is a new column name and the value is a string defining the column's full SQL type, constraints, and default value.

#### Example

This example adds a `moddefer` column to the `modules` table with a `TEXT` type, a `NOT NULL` constraint, and an empty string as its default value.

$$$
[(
  add=[
    modules=[
      moddefer='TEXT NOT NULL DEFAULT ""'
    ]
  ]
)]
$$$

### Removing Columns

For the `remove` list, the value for each table-name key is a list of column names to be dropped from that table.

**Note:** This feature requires SQLite version 3.35.0 or newer.

#### Example

This example removes the `featpro` and `featreq` columns from the `modules` table.

$$$
[(
  remove=[
    modules=[
      featpro
      featreq
    ]
  ]
)]
$$$