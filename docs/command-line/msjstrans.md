# msjstrans

## NAME

**msjstrans** — Mesgjs-to-JavaScript transpiler

## SYNOPSIS

```
msjstrans [--cat <catalog>] [--mod] [--ver] [--no-js] [--root <dir>] [--tokens] [--tree] *.msjs
```

## DESCRIPTION

The `msjstrans` tool transpiles Mesgjs source files (`.msjs`) to JavaScript, generating corresponding `.esm.js` files and source maps. It can also update a module catalog database and display lexical tokens or parse trees for debugging.

## OPTIONS

- `--cat <catalog>`  
  Specify the module catalog database file.

- `--mod`  
  Use the `modpath` from configSLID for output pathing.

- `--ver`  
  Use the `version` from configSLID for output pathing.

- `--no-js`  
  Do not generate JavaScript or source map.

- `--root <dir>`  
  Set the output root directory. In conjunction with `--mod` and `--ver`, transpiled output
  will be written to `${root}/${module}/${major}/${module}@${version}.esm.js`.

- `--tokens`  
  Display lexical tokens for each source file.

- `--tree`  
  Display the parse tree for each source file.

## ARGUMENTS

- `*.msjs`  
  One or more Mesgjs source files to transpile.

- `*.slid`  
  Optional: Matching extra meta-data files (e.g., for module requirements).

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
  msjstrans --cat mycat.msjcat --root build/ foo.msjs bar.msjs
  ```

## AUTHOR

Brian Katzung <briank@kappacs.com>  
Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung