# JavaScript Runtime Reference

This document provides a reference for the JavaScript functions exported from the Mesgjs runtime (`src/runtime/runtime.esm.js`). These functions are essential for bilingual (Mesgjs/JavaScript) interface development.

## Core Functions

### `initialize()`

Initializes the Mesgjs runtime, setting up core interfaces and extensions. This function is normally called once from the main entry point module (`mesgjs.esm.js`) and does not typically need to be called by other modules.

### `getInterface(name)`

Gets or creates an interface definition object. This is the entry point for defining the behavior of Mesgjs objects.

### `getInstance(type, params)`

Creates a new instance of a Mesgjs object. This is the factory function for all Mesgjs objects and replaces the `new` keyword.

## Messaging Functions

### `sendAnonMessage(receiver, operation, parameters)`

Sends an anonymous message to a Mesgjs object. The receiver will be automatically promoted to a Mesgjs object if it is a native JavaScript value.

### `runIfCode(value)`

If the provided `value` is a Mesgjs `@code` object, it will be executed and its return value will be returned. Otherwise, the `value` itself is returned. This is particularly useful for implementing lazy or repeated evaluation, such as for the condition and body of a loop, or for the branches of an if-then-else construct.

## Storage and Data Functions

### `listFromPairs(pairs)`

Creates a Mesgjs list (a `NANOS` instance) from a *flat* array of key-value pairs. It is commonly destructured from the module scope as `ls`.

Empty keys are assigned the next available integer index.

Example: `ls(['key1', 'value1', , 'indexedValue'])` results in a list where `'value1'` is at key `'key1'` and `'indexedValue'` is at key `0`.

### `namespaceAt(namespace, key, optional)`

Retrieves a value from a namespace (typically a `NANOS` instance). If the key is not found and `optional` is not true, a `ReferenceError` is thrown. This function is commonly destructured from the module scope as `na`.

### `setRO(object, key, value)` or `setRO(object, keyValueObject)`

A utility to create read-only properties on JavaScript objects.

## Flow Control and Error Handling

### `MSJSFlow`

A custom `Error` class used for non-local flow control, such as implementing `return` from a code block.

### `MSJSFlowError`

A custom `RangeError` class for errors related to `MSJSFlow`.

### `throwFlow(dispatch, type, interfaceName)`

Throws an `MSJSFlow` exception.

## Module and Feature Management

### `loadModule(sourcePath)`

Loads a Mesgjs module from the given source path.

### `setModMeta(metadata)`

Sets the module metadata for the runtime, enabling features like verified module loading.

### `moduleScope()`

Returns a module dispatch object for use in module-level code. It is exposed globally as `globalThis.$modScope`.

Example: `const {d, ls, m, na} = $modScope(), {mp, sm} = d;`

### `fcheck(featureName)`

Checks if a feature is ready without blocking.

### `fready(moduleId, featureName)`

Signals that a feature provided by a module is ready.

### `fwait(featureName, ...)`

Returns a promise that resolves when the specified feature(s) are ready.

## Introspection and Debugging

### `loggedType(value)`

Returns a string representing the Mesgjs or JavaScript type of a value for logging purposes.

### `senderFLC()`

Returns the file, line, and column of the sender of the current message.

### `typeAccepts(type, operation)`

Checks if a given Mesgjs type accepts a specific message operation.
- With two parameters, it returns `[type, 'specific' | 'default']` or `undefined`.
- With one parameter, it returns an array of directly-supported message operations for that type.

### `typeChains(type1, type2)`

Checks if one Mesgjs type is in the inheritance chain of another.
- With two parameters, it returns a boolean.
- With one parameter, it returns an array of directly-chained types.

### `debugConfig(settings)`

Configures and returns the current debugging settings for the runtime.

### `logInterfaces()`

Logs the raw interface configuration data to the console.

## Cryptography and Integrity

### `calcIntegrity(source)`

Calculates the SHA-512 integrity digest for a given source.

### `fetchModule(host, path, options)`

Fetches a module's source code, with options for decoding and integrity verification.