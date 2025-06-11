# msjsload

## NAME

**msjsload** — Mesgjs module linker/loader

## SYNOPSIS

```
msjsload [--cat <catalog>] [--html] [--out <output>] <entry>
```

## DESCRIPTION

The `msjsload` tool links and loads Mesgjs modules, resolving dependencies and generating import maps and metadata for use in JavaScript or HTML environments. It can output a script or wrap the result in a simple HTML page template.

## OPTIONS

- `--cat <catalog>`  
  Specify the module catalog database file (default: `modules.msjcat`).

- `--html`  
  Wrap the output in a simple HTML page template.

- `--out <output>`  
  Write the output to the specified file instead of standard output.

## ARGUMENTS

- `<entry>`  
  The entry point module or file. This can be a `.msjs`, `.esm.js`, or `.slid` file, or a module name.

## USAGE

- To link a module and output the import map and metadata:
  ```
  msjsload mymodule.msjs
  ```

- To wrap the output in an HTML template:
  ```
  msjsload --html mymodule.msjs
  ```

- To specify a custom module catalog:
  ```
  msjsload --cat custom.msjcat mymodule.msjs
  ```

- To write the output to a file:
  ```
  msjsload --out bundle.html --html mymodule.msjs
  ```

## EXAMPLES

- Link and load a module, outputting to standard output:
  ```
  msjsload app.msjs
  ```

- Link and load, wrapping in HTML and writing to a file:
  ```
  msjsload --html --out index.html app.msjs
  ```

## AUTHOR

Brian Katzung <briank@kappacs.com>  
Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung