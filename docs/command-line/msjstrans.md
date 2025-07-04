# msjstrans

## NAME

**msjstrans** — Mesgjs-to-JavaScript transpiler

## SYNOPSIS

```
msjstrans [--cat <catalog>] [--mod] [--no-js] [--tokens] [--tree] [--root <dir>] [--upcat] [--ver] *.msjs
```

## DESCRIPTION

The `msjstrans` tool transpiles Mesgjs source files (`.msjs`) to JavaScript, generating corresponding `.esm.js` files and source maps. It can also update a module catalog database, and display lexical tokens or parse trees for debugging.

## OPTIONS

- `--cat <catalog>`  
  Specify the module catalog database file.

- `--mod`  
  Use the `modpath` from configSLID for output pathing.

- `--no-js`  
  Do not generate JavaScript or a source map.

- `--root <dir>`  
  Set the output root directory. In conjunction with `--mod` and `--ver`, transpiled output
  will be written to `${root}/${module}/${major}/${module}@${version}.esm.js`.

- `--tokens`  
  Display lexical tokens for each source file.

- `--tree`  
  Display the parse tree for each source file.

- `--upcat`  
  Update the existing module catalog entry without re-transpiling the module. Use this if the external `.slid` configuration file changes. See [Mesgjs Module Configuration](../Mesgjs-Module-Configuration.md) for more details. Currently, only the `modreq` (modules required) field is updated.

- `--ver`  
  Use the `version` from configSLID for output pathing.

## ARGUMENTS

- `*.msjs`  
  One or more Mesgjs source files to transpile.

- `*.slid` (calculated, not supplied)
  Optional: Matching extra meta-data files (e.g., for module requirements). See [Mesgjs Module Configuration](../Mesgjs-Module-Configuration.md) for more details.

## USAGE

- To transpile a Mesgjs file to JavaScript:
  ```
  msjstrans mymodule.msjs
  ```

- To specify a module catalog and output directory:
  ```
  msjstrans --cat modules.msjcat --root dist/ mymodule.msjs
  ```

- To display tokens and parse tree for debugging:
  ```
  msjstrans --tokens --tree mymodule.msjs
  ```

- To skip JavaScript generation (e.g., for analysis only):
  ```
  msjstrans --no-js mymodule.msjs
  ```

## EXAMPLES

- Transpile all `.msjs` files in the current directory:
  ```
  msjstrans *.msjs
  ```

- Transpile with module catalog and output to a custom directory:
  ```
  msjstrans --cat mycat.msjcat --mod --ver --root build/ foo.msjs bar.msjs
  ```

## AUTHOR

Brian Katzung <briank@kappacs.com>  
Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung