# msjstlr

## NAME

**msjstlr** — Mesgjs Transpile-Load-Run (ad-hoc execution launcher)

## SYNOPSIS

```
msjstlr [-r <path> | --runtime <path>] [-d <deno-flags...> -- | --deno <deno-flags...> --]
        [-a | --all] [--deps-only] [--disable-js] [--disable-debug] [--enable-debug]
        <files...> [-- <script-args...>]
```

## DESCRIPTION

The `msjstlr` tool transpiles, links, and runs Mesgjs programs in a single command, without requiring a separate transpile/load pipeline or module catalog database. It is intended for ad-hoc scripts, examples, quick testing, and local CLI tools.

`msjstlr` accepts any combination of `.msjs` and `.js` files on the command line. It extracts in-file [SLID configuration](../Mesgjs-Module-Configuration.md) from each file, resolves dependencies between the provided files (starting from the first file's requirements), transpiles any needed `.msjs` sources in memory, dynamically registers the resulting module metadata with the runtime, and then executes the program.

Dependency resolution performed by `msjstlr` is **non-versioned** — there is no module catalog and no semver matching. The caller is responsible for supplying a compatible set of files.

`msjstlr` is implemented as two parts:

- [`bin/msjstlr`](../../bin/msjstlr) — a shell launcher that resolves the runtime location, builds an import map, and invokes Deno.
- [`cli/msjstlr-startup.esm.js`](../../cli/msjstlr-startup.esm.js) — the Deno/Mesgjs startup engine that performs metadata extraction, dependency resolution, in-memory transpilation, and execution.

## OPTIONS

- `-a`, `--all`
  Bypass dependency-tree pruning and transpile/load **every** file supplied on the command line, regardless of whether it is reachable from the entrypoint's `featreq`. Duplicate `featpro` providers are still reported as errors.

- `-d <deno-flags...> --`, `--deno <deno-flags...> --`
  Pass additional flags directly to the underlying `deno run` invocation (e.g., extra permissions). All arguments between `-d`/`--deno` and the terminating `--` are forwarded verbatim to Deno. By default, `msjstlr` runs Deno with `--allow-read --allow-env`; use this option to add permissions such as `--allow-net`. See [Default Permissions](#default-permissions) below for how these defaults interact with permissions you specify explicitly.

- `--deps-only`
  Run metadata extraction and dependency resolution only; print the primary entrypoint, the resolved file list (with each file's `Provides:`/`Requires:` features), and any diagnostics, then exit without transpiling or running the program. Exits `0` on success or `1` if any dependency errors were found.

- `--disable-debug`
  Disable code generation for `@debug{...}` blocks for this run, overriding the default (and overriding `MESGJS_DEFAULT_DEBUG` if it is unset or `true`).

- `--disable-js`
  Disable `@js{...@}` embedded-JavaScript blocks during transpilation. Encountering one will produce a transpilation error.

- `--enable-debug`
  Force-enable `@debug{...}` block code generation, overriding `MESGJS_DEFAULT_DEBUG=false`.

- `-r <path>`, `--runtime <path>`
  Specify the Mesgjs runtime root directory (the directory containing `src/lexparse.esm.js`, `src/transpile.esm.js`, and `src/runtime/`). See [Runtime Resolution](#runtime-resolution) below.

## ARGUMENTS

- `<files...>`
  One or more `.msjs` and/or `.js` files to consider for the program. The **first** file listed is the primary entrypoint; its `featreq` seeds dependency resolution (unless `-a`/`--all` is given).

- `-- <script-args...>`
  Everything following a bare `--` (that is not part of a `-d`/`--deno ... --` block) is forwarded to the running program and is accessible via `Deno.args`.

## DEFAULT PERMISSIONS

By default, [`bin/msjstlr`](../../bin/msjstlr) runs Deno with `--allow-read --allow-env`. These defaults are applied intelligently alongside any flags supplied via `-d`/`--deno`:

- If `-A`/`--allow-all` is present among the `-d`/`--deno` flags, **neither** default (`--allow-read` nor `--allow-env`) is added — `--allow-all` already grants every permission, so the defaults would be redundant (and would cause Deno to abort with an error).
- Otherwise, each default is added **unless** the caller has already specified that same permission explicitly (scoped or unscoped) via `-d`/`--deno`. For example, supplying `--allow-read=./data` suppresses the default unscoped `--allow-read`, but the default `--allow-env` is still added. Supplying `--allow-env` (in any form) suppresses the default `--allow-env` but not `--allow-read`.

This avoids conflicting or redundant duplicate permission flags being passed to `deno run` when the caller wants to scope down (or otherwise customize) one of the default permissions.

## RUNTIME RESOLUTION

The Mesgjs runtime root directory is resolved in the following order of precedence:

1. `-r <path>` / `--runtime <path>` command-line option.
2. `MESGJS_RUNTIME` environment variable.
3. The parent directory of the resolved (symlink-following) location of the `msjstlr` launcher script itself.

Because [`bin/msjstlr`](../../bin/msjstlr) resolves its own canonical location before computing the default runtime directory, it can be safely invoked via a symlink placed anywhere on `$PATH` (e.g. `ln -s /path/to/mesgjs/bin/msjstlr ~/bin/msjstlr`) and will still locate the correct runtime sources, even when run from an unrelated working directory.

## ENVIRONMENT

- `MESGJS_RUNTIME`
  Default runtime root directory, used when `-r`/`--runtime` is not given. See [Runtime Resolution](#runtime-resolution).

- `MESGJS_DEFAULT_DEBUG`
  When set to `false`, disables `@debug{...}` block code generation by default for this run (equivalent to `--disable-debug`). Any other value (or unset) leaves debug blocks enabled by default. `--enable-debug` and `--disable-debug` on the command line always take precedence over this variable.

## MODULE METADATA & DEPENDENCY RESOLUTION

For each `.msjs` or `.js` file provided, `msjstlr` extracts an in-file configuration [SLID](../Mesgjs-Module-Configuration.md) block, if present:

- For `.msjs` files, the config SLID is extracted directly from the lexer's shebang-aware source scan.
- For `.js` files, `msjstlr` scans the beginning of the file for a `/*[( ... )]*/`-style boundary and parses it if found (reading additional 4KB chunks as needed for large SLID blocks). Files without a leading SLID comment run with no extracted configuration.

From the config SLID (when present), `msjstlr` reads:

- `modpath` — the module's registered path/name. If absent, it is derived from the filename by stripping any directory prefix, `@version` suffix, and the `.msjs`, `.esm.js`, or `.js` extension.
- `featpro` — space/comma-separated (or list) feature(s) this file provides.
- `featreq` — space/comma-separated (or list) feature(s) this file requires.
- `modcaps` — space/comma-separated (or list) module capabilities.
- `deferLoad` — space/comma-separated (or list) module paths this file votes to allow deferred loading for.

**Default mode** starts from the first file's `featreq` and recursively resolves each required feature against `featpro` declarations across all provided files, pulling in providers (and their own transitive `featreq`) as needed. Files not reachable from the entrypoint are excluded from the run. `-a`/`--all` skips this pruning step and includes every provided file.

In both modes, the following conditions are reported as errors (causing a non-zero exit before anything runs):

- A required feature (`featreq`) has no provider among the included files (default mode) or among all provided files (`--all` mode).
- A feature is provided (`featpro`) by more than one included file.

Resolved (or all, with `-a`) files are then transpiled in memory as needed and registered with the runtime via dynamically constructed module metadata (with `integrity: 'DISABLED'`, since ad-hoc files are not catalog-verified), before the primary entrypoint runs and `msjstlr` awaits the `@loaded` feature-promise to let asynchronous startup activity settle before exiting.

## TRANSPILATION DEFAULTS

In-memory transpilation of `.msjs` files defaults to `enableJS: true` (embedded `@js{...@}` blocks allowed) and debug-block generation controlled per [Environment](#environment) and the `--enable-debug`/`--disable-debug`/`--disable-js` flags above. Plain `.js` files are used as-is and are not transpiled.

## SHEBANG USAGE

Because `msjstlr` accepts an ordinary file path as its first non-option argument, `.msjs` files can be made directly executable:

```
#!/usr/bin/env msjstlr
@c(log 'Hello from a Mesgjs script!')
```

```
chmod +x myscript.msjs
./myscript.msjs some args
```

## USAGE

- To run a standalone Mesgjs program:
  ```
  msjstlr example.msjs
  ```

- To run a multi-file program mixing `.msjs` and `.js` sources:
  ```
  msjstlr main.msjs helper.msjs util.js
  ```

- To check dependency resolution without running the program:
  ```
  msjstlr --deps-only main.msjs helper.msjs util.js
  ```

- To include every provided file, bypassing dependency pruning:
  ```
  msjstlr -a main.msjs helper.msjs unused.msjs
  ```

- To grant additional Deno permissions:
  ```
  msjstlr -d --allow-net -- main.msjs
  ```

- To scope the default `--allow-read` permission instead of using the unscoped default:
  ```
  msjstlr -d --allow-read=./data -- main.msjs
  ```

- To grant all permissions (suppresses the `--allow-read`/`--allow-env` defaults entirely):
  ```
  msjstlr -d --allow-all -- main.msjs
  ```

- To forward arguments to the running script:
  ```
  msjstlr main.msjs -- --verbose input.txt
  ```

- To override the runtime location:
  ```
  msjstlr -r /path/to/mesgjs main.msjs
  MESGJS_RUNTIME=/path/to/mesgjs msjstlr main.msjs
  ```

## EXAMPLES

- Run an example script directly from the repository:
  ```
  msjstlr examples/fizz-buzz.msjs
  ```

- Run a program split across two modules, with the second providing a feature the first requires:
  ```
  msjstlr app.msjs lib.msjs
  ```

- Disable debug blocks and embedded JavaScript for a stricter run:
  ```
  msjstlr --disable-debug --disable-js app.msjs
  ```

- Inspect resolved dependencies for a program without executing it:
  ```
  msjstlr --deps-only app.msjs lib.msjs extra.msjs
  ```

## SEE ALSO

- [msjstrans](msjstrans.md) — Mesgjs-to-JavaScript transpiler (production transpilation and catalog registration)
- [msjsload](msjsload.md) — Mesgjs module linker/loader (production dependency resolution and loading)
- [Mesgjs Module Configuration](../Mesgjs-Module-Configuration.md)

## AUTHOR

Brian Katzung <briank@kappacs.com>
Copyright 2026 by Kappa Computer Solutions, LLC and Brian Katzung
