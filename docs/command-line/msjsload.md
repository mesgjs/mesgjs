# msjsload

## NAME

**msjsload** — Mesgjs module linker/loader

## SYNOPSIS

```
msjsload [--cat <catalog>] [--html] [--out <output>] <entry> [<entry-client>]
```

## DESCRIPTION

The `msjsload` tool links and loads Mesgjs modules, resolving dependencies and generating import maps and metadata for use in JavaScript or HTML environments. It can output a script or wrap the result in a simple HTML page template.

`msjsload` optionally supports a two-phase module resolution process, allowing for separate dependency trees for server-side and client-side execution contexts.

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
  The primary entry point. This can be a `.msjs`, `.esm.js`, or `.slid` file, or a module path and version spec.

- `<entry-client>` (Optional)
  The client entry point. If two entry points are provided, the first (primary) entry point is used for server-side resolution, and this second entry point is used for client-side resolution. This must be a `.slid` file or a module path and version spec.

### Single Entry Point Behavior

- If `<entry>` is of the form `file.msjs` or `file.esm.js`, the loader will look for a **JavaScript** file, `file.esm.js`. Its contents will be included in the resulting output file and executed after all non-deferred modules have loaded.
- If `<entry>` is a file, the loader will look for an external, "companion" **SLID** file (`.slid`). If it exists, it will be used to determine module requirements.
- If `<entry>` is not a file, it is treated as a module name to be resolved from the catalog.

### Dual Entry Point Behavior

When both `<entry>` and `<entry-client>` are provided, `msjsload` performs a two-phase resolution. It generates output intended for a server environment, which is then responsible for Server-Side Rendering (SSR) of the client application.

1.  **Server Phase**: Resolves dependencies based on `<entry>`. If `<entry>` is a `.msjs` or `.esm.js` file, its JavaScript content will be included directly in the output.
2.  **Client Phase**: Resolves dependencies based on `<entry-client>`. The `<entry-client>` **cannot** be a `.msjs` or `.esm.js` file; it must be a `.slid` file or a module path.

The resulting metadata will contain a top-level `client` key with the metadata for the client-side modules, which the server can use during SSR.

## Module Configuration

Mesgjs modules can be configured in two ways: through an in-source SLID block within the `.msjs` file, or via an external `.slid` file.

### Two-Phase Configuration with `.slid` Files

For two-phase resolution using a single `.slid` file, the file can contain `server` and/or `client` sections.

- The root of the `.slid` file is treated as the **common** configuration, shared by both server and client.
- A `server` key can hold server-specific overrides.
- A `client` key can hold client-specific overrides.

The final configuration for each environment is the result of merging the common configuration with the environment-specific configuration (`final = common + specific`).

For detailed information on module configuration, see the [Mesgjs Module Configuration](../Mesgjs-Module-Configuration.md) document.

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