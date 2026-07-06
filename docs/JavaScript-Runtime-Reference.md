# JavaScript Runtime Reference

This document provides a reference for the JavaScript functions exported from the Mesgjs runtime (`src/runtime/runtime.esm.js`). These functions are essential for bilingual (Mesgjs/JavaScript) interface development.

## Table of Contents

*   [V4 Messaging API Overview](#v4-messaging-api-overview)
*   [Receiver Singletons](#receiver-singletons)
*   [Core Functions](#core-functions)
*   [Cryptography and Integrity](#cryptography-and-integrity)
*   [Flow Control and Error Handling](#flow-control-and-error-handling)
*   [Introspection and Debugging](#introspection-and-debugging)
*   [Messaging Functions](#messaging-functions)
*   [Module and Feature Management](#module-and-feature-management)
*   [Storage and Data Functions](#storage-and-data-functions)
*   [Deprecated Functions](#deprecated-functions)

## V4 Messaging API Overview

Mesgjs v4 introduces a fundamental architectural change: all Mesgjs objects are now instances of the `MsjsObject` class rather than bound template functions. This enables significant performance improvements (typically at least double!) while maintaining full message-passing semantics.

### Key Changes from V3

1. **Object Model:** All Mesgjs objects are `MsjsObject` class instances with ES2022 private elements for state
2. **Messaging:** Messages are sent via `MsjsObject.sm(receiver, operation, params)` rather than direct function calls
3. **Receiver Singletons:** JavaScript primitives share singleton receiver objects (see [Receiver Singletons](#receiver-singletons))
4. **Core Access:** The `$c` singleton provides access to messaging via `$c.sm(receiver, operation, params)`

### Sending Messages in V4

```javascript
// Anonymous message (no sender attribution)
const result = $c.sm(receiver, 'operation', params);

// Attributed message (preserves sender context)
const result = d.sm(receiver, 'operation', params);

// Messaging JavaScript values (automatic conversion)
const result = $c.sm(42, 'add', [8]); // 42 is automatically boxed
```

The messaging API automatically handles conversion of JavaScript values to Mesgjs receivers via the internal `$msjsReceiver` function, creating receiver singletons for boxed primitives.

## Receiver Singletons

In v4, JavaScript primitive values (numbers, strings, booleans) and native types (Arrays, Maps, Sets, etc.) are represented by **singleton receiver objects** rather than unique `MsjsObject` instances per value.

### What This Means

- All numbers share the same `@number` receiver singleton
- All strings share the same `@string` receiver singleton
- All JS arrays share the same `@jsArray` receiver singleton
- And so on for other JavaScript primitive and native types

### Implications

1. **No Unique Wrappers:** There are no separate wrapper objects created for each JavaScript value
2. **Original Value Access:** The actual JavaScript value is available via `d.orr` (original receiver) in message handlers
3. **Identity Preservation:** JavaScript values maintain their native identity (e.g., `5 === 5` remains true)
4. **Performance:** Eliminates wrapper object allocation overhead for primitive values

### Instance Creation Changes

Interfaces that represent receiver singletons (like `@number`, `@string`, `@jsArray`, etc.) are **no longer instance factories** via `@init`. Most no longer even have an `@init` handler in order to reduce dispatch overhead during JavaScript value boxing.

That functionality has generally been moved to a `(new from=...)` message pattern:

```mesgjs
// Create a new Set from values
#(nset mySet=@c(get @set)(new from=[1 2 3]))
#mySet(add 4) // All Sets boxed by a cached receiver singleton
```

**Important:** `(new from=...)` returns an actual JavaScript Set, not a Mesgjs wrapper object.

For more details on singleton receivers and original value access, see [Mesgjs Messaging Overview](Mesgjs-Messaging-Overview.md).

## Core Functions

### `getInterface(name)`

Gets or creates an interface definition object. This is the entry point for defining the behavior of Mesgjs objects.

### `getInstance(type, params)`

Creates a new instance of a Mesgjs object. This is the factory function for all Mesgjs objects and replaces the `new` keyword.

All instances created by this function are `MsjsObject` class instances (not functions as in pre-v4 versions). The instance's behavior is determined by its interface type and the message handlers defined for that interface.

The optional `params` argument is passed to the object's `@init` handler. It can be any JavaScript value; Arrays, Sets, Maps, and plain Objects are assimilated into NANOS, while other types are added opaquely. See [Message Parameter Normalization](Message-Parameter-Normalization.md) for details.

FEEDBACK: If it's not alreayd in the plan, need to add a section here or elsewhere encapsulating:
- Interfaces that are now receiver singletons are no longer instance factories via (@init)
- Most no longer even have an (@init) function in order to reduce dispatch overhead during JS value boxing
- That functionality has generally been moved to a (new from=..) message
- Example:
```mesgjs
#(nset mySet=@c(get @set)(new from=[1 2 3]))
#mySet(add ...)
```
- `(new from=...)` returns an actual JS Set, not a Mesgjs wrapper object
- If this is already covered in the plan, we need to include a reference to that section here.

### `initialize()`

Initializes the Mesgjs runtime, setting up core interfaces and extensions. This function is normally called once from the main entry point module (`mesgjs.esm.js`) and does not typically need to be called by other modules.

## Cryptography and Integrity

### `async calcIntegrity(source)`

Calculates the SHA-512 integrity digest for a given source.

### `async fetchModule(host, path, options)`

Fetches a module's source code, with options for decoding and integrity verification.

## Flow Control and Error Handling

### `MsjsFlow`

A custom `Error` class used for non-local flow control, such as implementing `return` from a code block.

### `MsjsFlowError`

A custom `RangeError` class for errors related to `MsjsFlow`.

### `throwFlow(dispatch, type, interfaceName)`

Throws an `MsjsFlow` exception.

## Introspection and Debugging

### `debugConfig(settings)`

Configures and returns the current debugging settings for the runtime. When called with a settings object (plain object, `NANOS`, or other list-like structure), it updates the configuration. It always returns the current configuration as a `NANOS` instance.

#### Available Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `dispatch` | boolean | `false` | Logs each message dispatch with sender type, receiver type, and operation |
| `dispatchSource` | boolean | `false` | Includes source file, line, and column information in dispatch logs |
| `dispatchTypes` | boolean | `false` | Includes parameter type information in dispatch logs |
| `stack` | number | `0` | Number of stack frames to include in error stack traces (0 = disabled) |
| `stackSource` | boolean | `false` | Includes source file, line, and column information in stack traces |
| `stackTypes` | boolean | `false` | Includes parameter type information in stack traces |
| `handlerCache` | boolean | `false` | Logs handler-cache updates |

#### Examples

```javascript
// Enable dispatch logging with source information
debugConfig({ dispatch: true, dispatchSource: true });

// Enable stack traces with 10 frames
debugConfig({ stack: 10, stackTypes: true });

// Get current configuration
const currentConfig = debugConfig();
```

### `loggedType(value)`

Returns a string representing the Mesgjs or JavaScript type of a value for logging purposes.

### `logInterfaces()`

Logs the raw interface configuration data to the console.

### `senderFLC()`

Returns the file, line, and column of the sender of the current message.

### `typeAccepts(type, operation)`

Checks if a given Mesgjs type accepts a specific message operation.
- With two parameters, it returns `[type, 'specific' | 'default']` or `undefined`.
- With one parameter, it returns an array of directly-supported message operations for that type.

### `typeChains(subtype, supertype)`

Checks if `supertype` is in the inheritance chain of `subtype`.
- With two parameters, it returns a boolean.
- With one parameter (for `subtype`), it returns an array of its directly-chained types.

## Messaging Functions

### `MsjsObject` Class

The `MsjsObject` class is the foundation of Mesgjs v4 architecture. All Mesgjs objects are instances of this "chameleon" class, which uses ES2022 private elements for state encapsulation.

#### `MsjsObject.sm(receiver, operation, parameters)` (Static Method)

The core messaging API for sending messages to Mesgjs objects. This static method is the foundation of all message passing in v4.

**Parameters:**
- `receiver`: The recipient of the message (a `MsjsObject` instance or JavaScript value)
- `operation`: The message operation (typically a string, but can be a number or symbol)
- `parameters`: Message parameters (automatically normalized to NANOS)

**Behavior:**
- Automatically converts JavaScript values to Mesgjs receivers via `$msjsReceiver`
- Creates singleton receivers for boxed JavaScript primitives
- Returns the handler's result or throws if no handler found

**Usage:**
```javascript
// Direct usage (anonymous message)
const result = MsjsObject.sm(receiver, 'operation', params);

// Via $c binding (recommended)
const result = $c.sm(receiver, 'operation', params);

// Via dispatch context (attributed message)
const result = d.sm(receiver, 'operation', params);
```

**Note:** The `sm` method is also available as an instance method on `MsjsDispatch` objects. When called as an instance method (via `d.sm`), it creates an attributed message where the sender context is preserved.

#### Instance Methods

`MsjsObject` instances may have type-specific methods depending on their interface. For example, `@function` objects have `.call()`, `.fn()`, and `.jsfn()` methods, while `@code` objects have `.run()` and `.fn()` methods.

### `$msjsReceiver(value)` Function

**Status:** Internal utility function (v4+)

Converts JavaScript values to their corresponding Mesgjs receiver objects. This function is called automatically by `MsjsObject.sm` and is primarily intended for internal use and testing.

**Behavior:**
- Creates singleton `MsjsObject` receivers for JavaScript primitives and native types
- Returns existing `MsjsObject` instances unchanged
- Enables receiver singletons: all instances of the same JavaScript primitive type (e.g., all strings) share the same receiver

**Important:** In v4, receiver objects are singletons per type. The original JavaScript value is accessible via `d.orr` (original receiver) in message handlers.

**Note:** Direct use of `$msjsReceiver` is rarely needed. Prefer using `$c.sm(value, ...)` which handles conversion automatically.

### `runIfCode(value)`

If the provided `value` is a Mesgjs `@code` object, it will be executed and its return value will be returned. Otherwise, the `value` itself is returned. This is particularly useful for implementing lazy or repeated evaluation, such as for the condition and body of a loop, or for the branches of an if-then-else construct.

### `sendAnonMessage(receiver, operation, parameters)`

Sends an anonymous message to a Mesgjs object. This function is alias for `MsjsObject.sm` for backward compatibility. Its use in new code is discouraged.


## Module and Feature Management

### `fcheck(featureName)`

Checks if a feature is ready without blocking. Returns `true` if the feature is ready, `false` if it is not ready yet, and `undefined` if the feature is unknown or has been rejected due to a module loading failure.

### `fready(moduleId, featureName)`

Signals that a feature provided by a module is ready. The `moduleId` is a unique `Symbol` provided by the runtime to a module's `msjsLoad(mid)` export; this ensures that only an authorized module can ready a feature it claims to provide in its `featpro` configuration.

### `async fwait(featureName, ...)`

Asynchronously waits for one or more features to become ready. This function returns a `Promise` that resolves when all of the specified features have been signaled as ready via `fready`, and rejects if any of the features are rejected.

Based on the `featpro` entries in the module metadata (and the `featreq` entries that determine dependencies), the runtime will automatically initiate the loading of any deferred modules as they are needed for the requested features.

*The use of `fwait` is the recommended mechanism for loading deferred modules.*

### `getModMeta()`

Returns the normalized form of the metadata that was set by `setModMeta`:
- The data is always structured as nested `NANOS` instances.
- Module `featpro` strings are parsed into `NANOS` lists of strings.

### `loadModule(sourcePath)`

Loads a Mesgjs module from the given source path.

### `moduleScope()`

Returns an object with core module-level properties and functions. It is exposed globally as `globalThis.$modScope`.

Example: `const { d, m, ls, na } = $modScope();`

### `setModMeta(metadata)`

Sets the module metadata for the runtime, enabling features like verified module loading and the `fcheck`/`fready`/`fwait` feature system.

## Storage and Data Functions

### `listFromPairs(pairs)`

Creates a Mesgjs list (a `NANOS` instance) from a *flat* array of key-value pairs. It is commonly destructured from the module scope as `ls`.

Empty keys are assigned the next available integer index.

Examples:

- `ls(['key1', 'value1', , 'indexedValue'])` results in a list where `'value1'` is at key `'key1'` and `'indexedValue'` is at key `0`.
- `ls([, value1, , value2])` results in a list with two positional values, `value1` and `value2`. Auto-indexing fills the omitted (sparse) key positions with `0` and `1`, respectively.

### `NANOS.parseSLID(string)`

While Mesgjs does not automatically create a shortcut for this operation, it is often helpful to have one for testing (e.g. included as part of a standard setup process in a shared test harness) when (potentially complex structures of) static list data are required.

```javascript
const ps = (str) => NANOS.parseSLID(str);
// ...
takesAStaticListStructure(ps('[(value1 keyA=valueA value2 keyB=[value3 keyC=valueC] value4)]'));
```

### `namespaceAt(namespace, key, optional)`

Retrieves a value from a namespace (typically a `NANOS` instance). If the key is not found and `optional` is not true, a `ReferenceError` is thrown. This function is commonly destructured from the module scope as `na`.

When `key` is a `NANOS` instance, its positional values are used as a path of keys for deep access into nested structures. If the NANOS has a named parameter `else`, its value is used as the default return value when a key in the path is not found (instead of throwing a ReferenceError).

Examples:
```javascript
// Single-key access
na($gss, 'myKey');  // Returns $gss.at('myKey')

// Multi-level access via NANOS positional values
na($gss, ls([, 'nested', , 'deep', , 'value']));  // Returns $gss.at(['nested', 'deep', 'value'])

// With optional flag
na($gss, ls([, 'missing', , 'key']), 1);  // Returns undefined instead of throwing

// With else named parameter for default value
na($gss, ls([, 'missing', 'else', 'defaultVal']));  // Returns 'defaultVal' if path not found
```

### `setRO(object, key, value, enumerable = true)` or `setRO(object, { key: value, ... }, enumerable = true)`

A utility to create read-only properties on JavaScript objects.

## Deprecated Functions

### `$toMsjs(value)` ⚠️ DEPRECATED

**Status:** Deprecated in v4 (partial backward compatibility only)

In Mesgjs v3 and earlier, `$toMsjs` was used to explicitly convert JavaScript values to Mesgjs wrapper objects. In v4, this function has been deprecated due to the introduction of receiver singletons and automatic value conversion.

#### Why It's Deprecated

1. **Receiver Singletons:** V4 uses singleton receivers for JavaScript primitives, making unique wrapper objects unnecessary
2. **Automatic Conversion:** The messaging API (`MsjsObject.sm` / `$c.sm`) automatically converts JavaScript values via `$msjsReceiver`
3. **Identity Issues:** Pre-v4 pattern of creating separate wrapper objects led to confusing equality comparison issues

#### V4 Behavior

In v4, `$toMsjs` exists as a **function factory** that creates wrapper functions for partial backward compatibility. However, this approach has significant limitations:

- **Equality Fails:** Wrappers created by `$toMsjs(value)` don't compare equal, even for the same value
- **Performance Overhead:** Each call creates a new function wrapper
- **Not Recommended:** New code should not use this function

#### Migration Guide

**Instead of:**
```javascript
// V3 pattern (deprecated)
const msjsArray = $toMsjs(jsArray);
const result = msjsArray('map', someFunction);
```

**Use:**
```javascript
// V4 recommended pattern
const result = $c.sm(jsArray, 'map', someFunction);

// Or from within a handler (attributed message)
const result = d.sm(jsArray, 'map', someFunction);
```

#### When You Might Still Need It

In rare cases where v3 code is being gradually migrated and requires the old function-call syntax `wrapper('operation', params)`, `$toMsjs` may provide a temporary bridge. However, the preferred migration path is to replace such calls with `$c.sm(value, 'operation', params)`.

#### Internal Alternative

For internal runtime use and testing, `$msjsReceiver(value)` is available, but this is primarily intended for the messaging pipeline and is not recommended for general application code in most cases.

**Recommendation:** Migrate all `$toMsjs` usage to the v4 messaging API (`$c.sm` or `d.sm`) for better performance, clearer semantics, and future compatibility.

## See Also

- [Message Parameter Normalization](Message-Parameter-Normalization.md) - How JavaScript values are converted to message parameters
- [JavaScript Interface Development](JavaScript-Interface-Development.md) - Guide for creating interfaces
- [Mesgjs Messaging Overview](Mesgjs-Messaging-Overview.md) - Understanding the message passing system
- [Unified List Utilities](runtime/Unified-List-Utilities.md) - Internal utilities for runtime developers
