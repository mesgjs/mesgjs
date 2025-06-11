# msjserrmap

## NAME

**msjserrmap** — Map JavaScript error locations back to Mesgjs source

## SYNOPSIS

```
msjserrmap <source-map.json> [line:col ...] [--dump]
```

## DESCRIPTION

The `msjserrmap` tool helps map JavaScript error locations (line and column numbers) back to the original Mesgjs source locations using a source map. This is useful for debugging transpiled Mesgjs code.

## OPTIONS & ARGUMENTS

- `<source-map.json>`  
  Path to the source map file (in JSON format).

- `line:col`  
  One or more colon-separated, line-and-column pairs (e.g., `12:34`) to map from the generated code back to the source.

- `--dump`  
  Dump the decoded mapping segments for inspection.

## USAGE

- To map a generated code location to the original source:
  ```
  msjserrmap dist/main.esm.js.map 12:34
  ```

- To map multiple locations:
  ```
  msjserrmap dist/main.esm.js.map 12:34 56:78
  ```

- To dump the decoded mapping segments:
  ```
  msjserrmap dist/main.esm.js.map --dump
  ```

## EXAMPLES

- Map a single error location:
  ```
  msjserrmap build/app.js.map 45:10
  ```

- Dump all mapping segments for inspection:
  ```
  msjserrmap build/app.js.map --dump
  ```

## AUTHOR

Brian Katzung <briank@kappacs.com>  
Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung