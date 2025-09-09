# Mesgjs Module Configuration

Mesgjs modules utilize two primary (and complementary) methods for configuration: in-source configuration within the `.msjs` file itself, and an optional external `.slid` file for defining runtime dependencies. This document details both methods.

## In-Source Configuration

In-source configuration is embedded directly within a `.msjs` source file using a Mesgjs SLID (Static List Data) block. This block defines the module's core properties and is used by the `msjstrans` transpiler to correctly catalog and path the module.

This configuration block must appear at the beginning of the file, optionally preceded by a "shebang" (`#!`) line.

### Common Keys

| Key | Description | Example |
|---|---|---|
| `modpath` | A unique string identifier for the module, used for pathing and cataloging. | `myapp/components/dataTable` |
| `version` | The semantic version of the module. | `1.2.3` |
| `featpro` | A space- or comma-separated list of "features" this module provides to the runtime environment. | `"caching dataTransform"` |
| `featreq` | A space- or comma-separated list of "features" this module requires from other modules in the runtime environment. | `"authUserInfo"` |
| `modcaps` | A space- or comma-separated list of "capabilities" this module provides. | `"file-access network-io"` |

### Example `.msjs` File

```mesgjs
[(
  modpath = myModule/main
  version = 1.0.0
  featpro = 'featureOne featureTwo'
  featreq = 'baseFeature'
)]

@c(log 'Hello, from my-module!')
```

### Feature Management (`featpro` and `featreq`)

The `featpro` and `featreq` settings are the foundation of Mesgjs's feature-based dependency management system. They allow modules to declare the features they provide and require, enabling the runtime to manage loading and initialization.

-   **`featpro`**: A module lists the features it provides in this setting. Once the module is loaded and initialized, it should signal to the runtime that its features are ready by using the `@c(fready)` message from Mesgjs, or the `fready()` JavaScript function.

-   **`featreq`**: A module lists the features it requires from other modules in this setting. The runtime ensures that a module's code is not executed until all of its required features are ready. A module can wait for a feature to be ready using the `@c(fwait feature-name)` message from Mesgjs, or the `fwait('feature-name')` function from JavaScript.

This system is what makes deferred loading possible. When `msjsload` determines that a module can be deferred, it is the `fwait` mechanism that triggers its loading at runtime.

## External `.slid` Configuration

An external configuration file, with a `.slid` extension, can be provided alongside any `.msjs` or `.esm.js` file. This "companion" file is used by the `msjstrans` and `msjsload` tools to define runtime dependencies and other metadata.

The external SLID file has the same base name as its corresponding module file (e.g., `my-module.msjs` and `my-module.slid`).

### Common Keys

| Key | Description |
|---|---|
| `modreq` | A semicolon-separated list of modules required by this module. |
| `deferLoad` | A space- or comma-separated list of modules from the `modreq` list that this module is willing to have loaded lazily. |

### `modreq` Syntax

A `modreq` string consists of one or more module specifications separated by semicolons. Each specification has the format:

`module-path version-specifier`

- **`module-path`**: The `modpath` of the required module.
- **`version-specifier`**: A rule to select compatible versions. It can be:
    - A single version (e.g., `2.1.0`), which implies a range from that version up to, but not including, the next major version (`<3.0.0`).
    - An explicit range (e.g., `2.1.0<3.0.0`), which behaves identically to the single-version format. It can be used for clarity.
    - Multiple ranges separated by commas (e.g., `1.2.3<1.3.0, 1.4.0<1.5.0`).
    - Extended versions (e.g., `1.2.3-alpha+001`) must match exactly and cannot be used in ranges.

### Example `.slid` File

For an entry point `app.msjs`, the `app.slid` file might look like this:

```slid
[(
    modreq = '
        myModule/main 1.0.0;
        shared/utils 2.1.0;
        reporting/largeReports 3.0.0<4.0.0
    '
    
    deferLoad = 'reporting/largeReports'
)]
```

This file tells `msjsload` that the application requires:
- `myModule/main` at version `1.0.0` or any later `1.x` version.
- `shared/utils` at any version from `2.1.0` up to (but not including) `3.0.0`.
- `reporting/largeReports` at any version from `3.0.0` up to (but not including) `4.0.0`.

When `msjsload` resolves all dependencies for an application, it performs a "survey" to determine which modules can be deferred. A module will only be deferred if *every single module* that depends on it (including the application entry point itself) has it listed in its `deferLoad` property. If even one dependent does not agree to defer, the module will be loaded eagerly.