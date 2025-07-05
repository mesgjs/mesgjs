# msjsload

## NAME

**msjsload** — Mesgjs module linker/loader

## SYNOPSIS

```
msjsload [--cat <catalog>] [--html] [--out <output>] <entry>
```

## DESCRIPTION

The `msjsload` tool links and loads Mesgjs modules, resolving dependencies and generating import maps and metadata for use in JavaScript or HTML environments. It can output a script or wrap the result in a simple HTML page template.

The runtime will signal when all non-deferred modules have completed loading by making the special `@loaded` feature-promise ready. Mesgjs modules wanting to wait for loading to complete can use the `@c(fwait @loaded)(then { block })` pattern.

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
- If the entry point is of the form `file.msjs` or `file.esm.js`, the loader will look for a **JavaScript** file, `file.esm.js`. It's contents will be included in the resulting output file and executed after all non-deferred modules have loaded (as determined by an `fwait` (feature-wait) on the `@loaded` special feature-promise).
- If the entry point is of the form `file.msjs`, `file.esm.js`, or `file.slid`, the loader will look for an external, "companion" **SLID** file, `file.slid`. It it exists, it will be used to determine any required modules and acceptable versions, and any modules whose loading should be deferred.
- If the entry point is not of the form `file.msjs`, `file.esm.js`, or `file.slid`, the loader will look for a matching module in the module catalog. If found, the loader will generate output to load that module and its cataloged dependencies. One or more of the loaded modules should `fwait` on the `@loaded` special feature-promise and begin executing the application logic in its `then` handler.

## Module Configuration

Mesgjs modules can be configured in two ways: through an in-source SLID block within the `.msjs` file, or via an external `.slid` file. For detailed information on both methods, see the [Mesgjs Module Configuration](../Mesgjs-Module-Configuration.md) document.

## Forcing Module Versions

In advanced use cases, such as testing pre-release or specific-build versions, it may be necessary to bypass the normal dependency resolution process. This can be accomplished by adding a `modforce` key to the entry-point SLID file.

- `modforce`
  A space or comma-separated list of `modpath@version` strings that will be used instead of any version resolved from the module catalog.

When `modforce` is used, `msjsload` will print an informational message listing the modules being forcibly resolved.

If a forced module version falls outside the declared compatible version range required by another module in the final build, `msjsload` will print a warning to the console to alert the user of the potential incompatibility.

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