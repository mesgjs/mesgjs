# msjscat

## NAME

**msjscat** — Mesgjs catalog database utility

## SYNOPSIS

```
msjscat [--db <database>] [--lsmap] [--lsmod] [--mapin <input>] [--mapout <output>] [--mod <module>] [--rmmap]
```

## DESCRIPTION

The `msjscat` tool provides utilities for managing and querying the Mesgjs module catalog database. It supports listing and manipulating path-map entries and module entries, as well as mapping paths and managing module metadata.

## OPTIONS

- `--db <database>`  
  Specify the database file name (default: `modules`).

- `--lsmap`  
  List all path-map entries in the database.

- `--lsmod`  
  List all module entries in the database. Can be filtered with `--mod`. This will display all fields for each module, including `featpro`, `featreq`, `modreq`, `moddefer`, and `modcaps`.

- `--mapin <input>`  
  Specify the input path for path-map operations.

- `--mapout <output>`  
  Specify the output path for path-map operations (used with `--mapin`).

- `--mod <module>`  
  Filter module entries by path/prefix and optional version (used with `--lsmod`).

- `--rmmap`  
  Remove the path-map entry associated with the given `--mapin`.

## USAGE

- To list all path-map entries:
  ```
  msjscat --lsmap
  ```

- To list all module entries:
  ```
  msjscat --lsmod
  ```

- To filter module entries by path and version:
  ```
  msjscat --lsmod --mod mymodule@1.2.3
  ```

- To add a path-map entry:
  ```
  msjscat --mapin src/path --mapout dest/path
  ```

- To remove a path-map entry:
  ```
  msjscat --mapin src/path --rmmap
  ```

- To map a path:
  ```
  msjscat --map src/path
  ```

## EXAMPLES

- List all modules in the default database:
  ```
  msjscat --lsmod
  ```

- Add new path mappings:
  ```
  msjscat --mapin mesgjs/runtime/ --mapout https://cdn.jsdelivr.net/gh/mesgjs/mesgjs@0.2.11/dist/runtime-min/
  msjscat --mapin mwi/ --mapout https://cdn.jsdelivr.net/gh/mesgjs/mesgjs-web@0.5.9/dist/msjs/mwi/
  ```

- Remove a path mapping:
  ```
  msjscat --mapin mesgjs/runtime/ --rmmap
  ```

- List all path mappings:
  ```
  msjscat --lsmap
  ```

## AUTHOR

Brian Katzung <briank@kappacs.com>  
Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung