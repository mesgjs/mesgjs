# Test Migration Plan

This document outlines the plan for migrating the existing test suite to the new Deno-native test framework.

## 1. Audit and Analysis

The audit of the existing tests and the analysis of the source code are complete. The findings are documented in [`test-audit.md`](test-audit.md:0), and have revealed significant gaps in test coverage, particularly around the core toolchain (`lexparse.esm.js` and `transpile.esm.js`) and the runtime interfaces.

## 2. New Test Structure

The new test suite will be located in the `test-new/` directory and will use a hierarchical structure that mirrors the `src/` directory.

### Proposed Structure

```
test-new/
├── cli/
│   ├── lexer.test.js
│   ├── parser.test.js
│   └── transpiler.test.js
├── interfaces/
│   ├── boolean.test.js
│   ├── core.test.js
│   ├── js-array.test.js
│   ├── kv-iter.test.js
│   ├── list.test.js
│   ├── loop.test.js
│   ├── map.test.js
│   ├── null.test.js
│   ├── number.test.js
│   ├── promise.test.js
│   ├── reactive.test.js
│   ├── regex.test.js
│   ├── set.test.js
│   ├── string.test.js
│   ├── try.test.js
│   └── undefined.test.js
└── runtime/
    ├── dispatch.test.js
    ├── runtime.test.js
    └── storage.test.js
```

### Naming Convention

Each test file will be named after the feature or category it covers, followed by `.test.js`.

## 3. Test Coverage

The new test suite will cover all the functionality of the existing tests, as well as the gaps that were identified in the audit. This will include new tests for:

-   The lexer and parser (`lexparse.esm.js`)
-   The transpiler (`transpile.esm.js`)
-   All runtime interfaces in `src/runtime/`

## 4. Migration Process

The migration will be done in the following phases:

1.  **Create the new test structure**: The new directories and empty test files will be created.
2.  **Replicate existing tests**: The existing test cases will be replicated in the new Deno-native test framework.
3.  **Write new tests**: New tests will be written to address the coverage gaps.
4.  **Deprecate old tests**: Once the new test suite is complete and passing, the old `test/` directory will be removed.

## 5. Runtime Module Test Plan
This section details the specific test plan for the exported functions and classes from the Mesgjs runtime module (`src/runtime/runtime.esm.js`).

### General Approach
- Tests will be created in the `test-new/runtime/` directory.
- Each major exported symbol or group of related symbols will have its own test file.
- Tests will use Deno's built-in testing framework.
- Mocks will be used for file system operations (`Deno.readFile`) and network requests (`fetch`) to ensure tests are fast and reliable.

### Test Cases by Export

#### `MsjsFlow` and `MsjsFlowError`
- **File:** `test-new/runtime/MsjsFlow.test.js`
- **Cases:**
    - Verify that `MsjsFlow` can be instantiated with a message and optional info.
    - Verify the `name` property is 'MsjsFlow'.
    - Verify that `MsjsFlowError` is an instance of `RangeError` and has the correct name.

#### `calcIntegrity` & `fetchModule`
- **File:** `test-new/runtime/fetch.test.js`
- **Cases:**
    - `calcIntegrity`: Test with local file path (mocked) and verify correct SHA-512 digest.
    - `fetchModule`: Test local and remote fetching, with and without decoding.
    - `fetchModule`: Test successful and failed integrity checks.
    - `fetchModule`: Test error handling for non-existent files/modules.

#### `listFromPairs` & `namespaceAt`
- **File:** `test-new/runtime/nanos-helpers.test.js`
- **Cases:**
    - `listFromPairs`: Verify it creates a `NANOS` instance from an array of pairs.
    - `namespaceAt`: Test successful key retrieval and `ReferenceError` on failure.

#### `loggedType`
- **File:** `test-new/runtime/loggedType.test.js`
- **Cases:**
    - Test with all Mesgjs primitive types (`@t`, `@f`, `@u`, `@n`).
    - Test with actual Mesgjs objects by creating instances of foundational interfaces (e.g., `@string`, `@number`, `@promise`, `@try`).
    - Test with standard JavaScript types (`string`, `number`, `object`, `function`).

#### `runIfCode` & `runWhileCode`
- **File:** `test-new/runtime/runCode.test.js`
- **Cases:**
    - Test that non-`@code` values are returned as-is.
    - Test that `@code` objects are executed, including chained execution for `runWhileCode`.

#### `sendAnonMessage`
- **File:** `test-new/runtime/sendAnonMessage.test.js`
- **Cases:**
    - Send a message to an existing Mesgjs object.
    - Verify that sending a message to a plain JS object promotes it correctly.

#### `senderFLC`
- **File:** `test-new/runtime/senderFLC.test.js`
- **Cases:**
    - Verify correct parsing of file, line, and column from a stack trace.
    - Test from within simulated `msjsR$` and `msjsS$` stack frames.

#### `setRO`
- **File:** `test-new/runtime/setRO.test.js`
- **Cases:**
    - Set single and multiple read-only properties.
    - Verify that writes to the property throw a `TypeError`.
    - Test the `enumerable` flag.

#### `throwFlow`
- **File:** `test-new/runtime/throwFlow.test.js`
- **Cases:**
    - Test with an active dispatch context, verifying it throws `MsjsFlow`.
    - Test with an inactive dispatch context, verifying it throws `MsjsFlowError`.

#### IIFE-Exported Functions
- **Grouped Testing Strategy:** Functions related to interfaces, modules, and features will be tested in dedicated files to reflect their interconnected nature.

- **`interfaces.test.js`**:
    - Cover `getInterface`, `getInstance`, `typeAccepts`, `typeChains`.
    - Define interfaces, create instances, test chain resolution and operation acceptance.

- **`modules.test.js`**:
    - Cover `getModMeta`, `setModMeta`, `loadModule`, `modHasCap`, `moduleScope`.
    - Set mock module metadata, test capability checks, and mock module loading.

- **`features.test.js`**:
    - Cover `fcheck`, `fready`, `fwait`.
    - Test the full feature lifecycle: pending, fulfilled, and rejected.

- **`debug.test.js`**:
    - Cover `debugConfig` and `logInterfaces`.
    - Test setting/getting debug flags and spy on `console.log` for `logInterfaces`.

- **`initialize.test.js`**:
    - Cover `initialize`.
    - Verify that core extensions are installed and that it runs only once.

## 6. Test Implementation Notes

This section documents key learnings and established patterns for writing tests in the new Deno-native framework. Adhering to these conventions will ensure consistency and reliability.

### Core Principles
- **Documentation First**: For interfaces, always consult (or create) the corresponding documentation in `docs/interfaces/` before writing tests. The documentation is the source of truth for expected behavior.
- **Source of Truth**: When documentation is absent or unclear, the `src/runtime/*.js` implementation file is the definitive source of truth.

### Idiomatic Patterns
- **Loading the Runtime**: For almost all tests, the full runtime environment should be initialized to ensure all globals and interfaces are available. This is done with a simple import:
  ```javascript
  import "../../src/runtime/mesgjs.esm.js";
  ```
- **The `receiver(op, params)` Rule**: All Mesgjs message sends follow the `receiver(op, params)` pattern. Public interface functions in JavaScript do not take more than two parameters.
- **Constructing Message Parameters with `ls`**: To avoid cumbersome `new NANOS()` constructors, especially for named or mixed parameters, use the `listFromPairs` helper, aliased as `ls`:
  ```javascript
  import { listFromPairs as ls } from "../../src/runtime/runtime.esm.js";
  
  // Creates a NANOS for: [0]: "a", [1]: "b"
  const positionalParams = ls([,"a",,"b"]);
  
  // Creates a NANOS for: [0]: 1, to: "B"
  const mixedParams = ls([,1, "to", "B"]);
  ```
- **Mocking `@code` Blocks**: Code blocks passed as parameters (e.g., to `@loop` or `@kvIter`) must be mocked as functions that respond to a `('run')` message. A helper function is the cleanest way to do this:
  ```javascript
  const mockCode = (runLogic) => {
      const fn = (op) => {
          if (op === 'run') return runLogic();
      };
      fn.msjsType = '@code';
      return fn;
  };
  ```
- **Primitive vs. Object Returns**: Be aware of the return type of a message. "Primitive" interfaces like `@number` or `@jsArray` often return raw JavaScript primitives (numbers, booleans, arrays), not Mesgjs objects. Use `assertEquals` directly on these values without `.valueOf()`.

- **Mesgjs Object Instantiation**:
  - Mesgjs wrappers for JS objects (where supported), can be generated using the pattern `const mObj = $toMsjs(jsObj);`. You can then "message" this object via `mObj(op, params);`, where `params` must be a *single value* (scalar, plain object, array, or NANOS).
  - For other Mesgjs objects, you can either send a `(get)` message to `$c` (JS global representing Mesgjs' `@core` singleton instance), or (more simply) you can use `getInstance`:
    - `const instance = $c('get', ls(, 'type', 'init', ls([...]))); // transpilation of Mesgjs' @c(get type init=[...])`
    - `const { getInstance } = globalThis.$c, instance = getInstance('type', optInitParam);` (what `@c(get ...)` does "under the hood")

## 7. Current Status & Next Steps

This section provides a summary of the test migration progress.

### Completed
- **Runtime Analysis**: All exported functions from `src/runtime/runtime.esm.js` were identified and a test plan was created.
- **Runtime Tests**: All test files for the runtime module (`test-new/runtime/`) have been created and are passing.
- **Core Interface Tests**: Documentation and passing tests have been created for the following critical interfaces:
  - `@boolean` (`test-new/interfaces/boolean.test.js`)
  - `@core` (`test-new/interfaces/core.test.js`)
  - `@jsArray` (`test-new/interfaces/js-array.test.js`)
  - `@kvIter` (`test-new/interfaces/kv-iter.test.js`)
  - `@list` (`test-new/interfaces/list.test.js`)
  - `@loop` (`test-new/interfaces/loop.test.js`)
  - `@map` (`test-new/interfaces/map.test.js`)
  - `@null` (`test-new/interfaces/null.test.js`)
  - `@number` (`test-new/interfaces/number.test.js`)
  - `@promise` (`test-new/interfaces/promise.test.js`)
  - `@reactive` (`test-new/interfaces/reactive.test.js`)

### To Do
- **Complete Interface Tests**: Create documentation and tests for the remaining interfaces in `src/runtime/`:
  - `@regex`
  - `@set`
  - `@string`
  - `@try`
  - `@undefined`
- **Toolchain Tests**: Implement tests for the lexer, parser, and transpiler.
  - `test-new/cli/msjscat.test.js`
  - `test-new/cli/msjstrans.test.js`
  - `test-new/cli/msjsload.test.js`
  - `test-new/tools/lexer.test.js`
  - `test-new/tools/parser.test.js`
  - `test-new/tools/transpiler.test.js`
- **Deprecate Old Suite**: Once all new tests are in place and passing, remove the legacy `test/` directory.