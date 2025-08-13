# JavaScript Runtime Reference

This document provides a reference for the JavaScript functions exported from the Mesgjs runtime (`src/runtime/runtime.esm.js`). These functions are essential for bilingual (Mesgjs/JavaScript) interface development.

## Table of Contents

*   [Core Functions](#core-functions)
*   [Cryptography and Integrity](#cryptography-and-integrity)
*   [Flow Control and Error Handling](#flow-control-and-error-handling)
*   [Introspection and Debugging](#introspection-and-debugging)
*   [Messaging Functions](#messaging-functions)
*   [Module and Feature Management](#module-and-feature-management)
*   [Storage and Data Functions](#storage-and-data-functions)

## Core Functions

### `getInterface(name)`

Gets or creates an interface definition object. This is the entry point for defining the behavior of Mesgjs objects.

### `getInstance(type, params)`

Creates a new instance of a Mesgjs object. This is the factory function for all Mesgjs objects and replaces the `new` keyword. The optional `params` argument is passed to the object's `@init` handler. It can be any JavaScript value; Arrays, Sets, Maps, and plain Objects are assimilated, while other types are added opaquely.

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

Configures and returns the current debugging settings for the runtime.

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

### `runIfCode(value)`

If the provided `value` is a Mesgjs `@code` object, it will be executed and its return value will be returned. Otherwise, the `value` itself is returned. This is particularly useful for implementing lazy or repeated evaluation, such as for the condition and body of a loop, or for the branches of an if-then-else construct.

### `sendAnonMessage(receiver, operation, parameters)`

Sends an anonymous message to a Mesgjs object. The receiver will be automatically promoted to a Mesgjs object if it is a native JavaScript value.

## Module and Feature Management

### `fcheck(featureName)`

Checks if a feature is ready without blocking.

### `fready(moduleId, featureName)`

Signals that a feature provided by a module is ready. The `moduleId` is a unique `Symbol` provided by the runtime to a module's `msjsLoad(mid)` export; this ensures only an authorized module can ready a feature it claims to provide.

### `async fwait(featureName, ...)`

Asynchronously waits for one or more features to be ready. Returns a `Promise` that resolves when all specified features have been signaled as ready via `fready`.

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

Sets the module metadata for the runtime, enabling features like verified module loading.

## Storage and Data Functions

### `listFromPairs(pairs)`

Creates a Mesgjs list (a `NANOS` instance) from a *flat* array of key-value pairs. It is commonly destructured from the module scope as `ls`.

Empty keys are assigned the next available integer index.

Example: `ls(['key1', 'value1', , 'indexedValue'])` results in a list where `'value1'` is at key `'key1'` and `'indexedValue'` is at key `0`.

### `namespaceAt(namespace, key, optional)`

Retrieves a value from a namespace (typically a `NANOS` instance). If the key is not found and `optional` is not true, a `ReferenceError` is thrown. This function is commonly destructured from the module scope as `na`.

### `setRO(object, key, value, enumerable = true)` or `setRO(object, { key: value, ... }, enumerable = true)`

A utility to create read-only properties on JavaScript objects.
