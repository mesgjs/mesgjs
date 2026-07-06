# JavaScript Interface Development for Mesgjs

This document is a guide for JavaScript developers who want to extend the Mesgjs ecosystem by creating new, custom interfaces. A well-designed interface allows for seamless, "bilingual" interaction, where objects can be manipulated both by standard Mesgjs messages and by conventional JavaScript method calls.

## The Core Philosophy

Before diving in, remember the fundamental principle of Mesgjs: with few exceptions, every *thing* is an object, and every *action* is a message. All language features are built upon this foundation of objects and the messages they exchange.

A key difference from JavaScript is that an object's message handlers (its "methods") are not part of the object itself. They are defined separately in an **interface**. This means an object's data is cleanly separated from its behavior, preventing the kinds of property name collisions that can occur in JavaScript between data and methods.

## The Runtime Environment

For an interface developer, the most critical parts of the Mesgjs runtime are exposed through two key modules:

*   [`src/runtime/mesgjs.esm.js`](src/runtime/mesgjs.esm.js:1): This is the main entry point for the runtime. It handles the initial loading and installation of all the foundational `@`-prefixed interfaces.
*   [`src/runtime/runtime.esm.js`](src/runtime/runtime.esm.js:1): This module exports the core functions you will use to build your own interfaces.

### Essential Runtime Functions

From `runtime.esm.js`, you will primarily use the following functions:

*   `getInterface(name)`: This is the starting point for creating or modifying an interface definition.
*   `getInstance(type, params)`: This is the factory function for creating all Mesgjs objects. **It is the direct replacement for the `new` keyword.** You do not use `new` to create instances of your interfaces. All instances are `MsjsObject` class instances (not functions, as in pre-v4 versions).
*   `setRO(object, key, value)` or `setRO(object, keyValueObject)`: A utility to create read-only properties on objects. This is used extensively throughout the runtime to enforce immutability where appropriate.
*   `$c.sm(receiver, operation, parameters)`: The primary way to send an **anonymous** message from JavaScript (e.g. from within a handler, when you don't need sender attribution). It automatically normalizes `parameters` to a `NANOS` list and automatically converts plain JavaScript values (numbers, strings, arrays, etc.) to their receiver via the internal `$msjsReceiver` function. See [Mesgjs Messaging Overview](Mesgjs-Messaging-Overview.md) for details.

> **Deprecated:** `$toMsjs(jsValue)` (pre-v4) converted native JavaScript values into Mesgjs wrapper *functions*. In v4, boxed JavaScript primitives and native types are represented by type-wide **receiver singletons**, and value-to-receiver conversion now happens automatically inside `$c.sm` / `MsjsObject.sm`. `$toMsjs` still exists as a limited backward-compatibility shim (see [JavaScript Runtime Reference](JavaScript-Runtime-Reference.md#toMsjsvalue-️-deprecated)), but new code should simply call `$c.sm(jsValue, operation, params)` directly instead.

## The Add-On Module Workflow

While foundational (`@`-prefixed) interfaces are loaded during runtime initialization and become available synchronously, the most common case for developers is creating **add-on modules** that are loaded after initialization. This involves a specific workflow to ensure modules are loaded correctly and can synchronize with each other.

1.  **Loading:** Your module will be loaded by the runtime using `loadModule(sourcePath)`.
2.  **Feature Management:** The runtime uses a feature-based system to manage dependencies and readiness.
    *   `fwait(featureName)`: This function returns a Promise that resolves when a specific feature is ready. This is how your module can wait for another module's interface to be available.
    *   `fready(moduleId, featureName)`: Your module calls this to signal that a feature it provides is now ready for other modules to use.

## Creating a New Interface: Step-by-Step

Here is the process for creating a new, non-foundational interface.

### A. Important Rule: Interface Naming

**User-defined, non-foundational interfaces CANNOT have names that start with `@`.** This prefix is reserved for the core and foundational interfaces loaded during runtime initialization. Choose a descriptive name without the `@` prefix.

### B. The Module Boilerplate

Every add-on module should start with the following boilerplate to get access to the necessary module-scope variables:

```javascript
// ESM module header
import { fready, getInterface, getInstance, setRO } from './runtime.esm.js'; // Or appropriate path

export function loadMsjs (mid) {
    // Note: $modScope is exposed as a property of globalThis
    const { d, ls, m, na } = $modScope(), { b, mp, sm } = d;

    // Your interface definition goes here

    // Signal that your interface is ready
    // Note: fready/fwait only work when runtime module management is enabled
    fready(mid, 'your-interface-name');
}
// Self-load if runtime module management isn't enabled
// If you have mandatory feature deps, you might want to throw instead
if (!globalThis.msjsNoSelfLoad) loadMsjs();
```

### C. Step 1: Get the Interface Object

The first step inside your `loadMsjs` function is to get an interface management object.

```javascript
const yourInterface = getInterface('your-interface-name');
```

### D. Step 2: Define the Interface with `.set()`

Next, you define the interface's behavior using the `.set()` method. This is where you provide the message handlers.

```javascript
yourInterface.set({
    // lock: true, // Optional: Prevents further changes
    // pristine: true, // Optional: Interface has not been previously configured
    // singleton: true, // Optional: Only one instance can be created
    handlers: {
        '@init': opInit, // The constructor
        'someOperation': opSomeOperation,
        'anotherOp': opAnotherOp
    }
});
```

Best practice for production-ready interfaces is to make sure they are `pristine: true` to make sure your interface is unique and uncompromised and `lock: true` to make sure they stay that way.

See the `@interface` interface documentation if you need more unusual features such as anonymous or private interfaces.

### E. Step 3: Write Message Handlers

Message handlers are JavaScript functions that receive a single argument: the **dispatch object**, conventionally named `d`. This object is your gateway to the entire message context.

*   `d.rr`: The **r**eceive**r**. In v4, this is the `MsjsObject` class instance for the object—the "face" it presents to the outside world, whether that's other Mesgjs objects or external JavaScript code. It is **not** a function.
*   `d.orr`: The **o**riginal **r**eceive**r**. For most user-defined objects this is identical to `d.rr`. However, for boxed JavaScript primitives and native types (numbers, strings, arrays, Maps, Sets, etc.), which share type-wide **receiver singletons** in v4, `d.orr` gives you the actual underlying JavaScript value (e.g. the real number or string), while `d.rr` is the shared singleton `MsjsObject` instance for that type. When writing handlers for your own (non-singleton) interfaces, you'll typically just use `d.rr`.
*   The role of JavaScript's `this` is distributed in Mesgjs:
    *   `d.js`: A getter/setter enabling *private* JS-level state attached to the object instance (for state you do not want exposed directly as primary object properties). To use it, simply assign to it in your `@init` handler (e.g. `d.js = new MyJsClass(...)`) (or use a just-in-time assignment strategy to avoid `@init` dispatch overhead) and read it in other handlers.
    *   `d.p`: The **p**ersistent, private storage for the object instance (a `NANOS` list, created on first access). In contrast to `d.js`, this is the only private state accessible to native Mesgjs handlers (either your own, or potentially handlers in chained interfaces if your interface isn't *final*). This is Mesgjs' version of "protected" properties (visible to all types in the object's interface chain, but *not across instances*).
    *   `d.x`: E**x**clusive persistent storage (a `NANOS` list, created on first access) — like `d.p`, but partitioned per currently-dispatched handler *type* rather than shared across an interface's whole chain. This lets a handler in a chained (non-final) interface keep state that sibling/ancestor handlers for the same object instance cannot see or accidentally clobber. This is Mesgjs' version of "private" properties (distinct per instance *and type*).
*   `d.mp`: The **m**essage **p**arameters. This is a `NANOS` list containing all parameters passed in the message. See [Message Parameter Normalization](Message-Parameter-Normalization.md) for details on how JavaScript values are converted to NANOS.
*   `d.sm` (alias `d.s`): The attributed **s**end-**m**essage function. Use this to send messages to other objects: `d.sm(recipient, op, params)`. The `params` argument will be automatically normalized to NANOS. **Important:** `d.sm` must be called as `d.sm(...)` (or `d.s(...)`) — do not destructure it off of `d`, or the sender-attribution context will be lost and the message will be sent anonymously instead. See [Attributed Send-Message Function](Mesgjs-Messaging-Overview.md#attributed-send-message-function) for details.

Here is an example handler:

```javascript
function opSomeOperation(d) {
    const firstParam = d.mp.at(0); // Get the first positional parameter
    const namedParam = d.mp.at('name'); // Get a named parameter

    // Store a value in the object's persistent storage
    d.p.set('lastOp', 'someOperation');

    // Send an attributed message to another object
    // ls() is a NANOS helper accepting a flat array of key/value pairs
    // (empty keys are assigned sequential numeric-like keys)
    const otherObject = getInstance('some-other-interface');
    return d.sm(otherObject, 'doSomething', ls([ 'key1', 'param1', , 'param2']));
}
```

### F. Step 4: The `@init` Constructor

The `@init` handler is special. It acts as the constructor for your object and is called when a new instance is created with `getInstance` (or `getInterface(name).instance()`), but only if a handler for it is actually registered — the runtime avoids creating a dispatch object for `@init` at all when there's no handler to call, reducing instantiation overhead. This is the ideal place to set up initial state.

```javascript
function opInit(d) {
    // Set up initial persistent state from message parameters
    if (d.mp.has('initialValue')) {
        d.p.set('value', d.mp.at('initialValue'));
    }

    // For a JS-heavy interface, attach a JS class instance for state.
    // d.js is a getter/setter (not merely an alias for an object-context property).
    d.js = new MyJavaScriptClass(d.mp.at('initialConfig'));
}
```

**Attaching a JavaScript prototype (bilingual interfaces):** In v4, `d.rr` is a `MsjsObject` class instance, not a function, so you no longer chain `Function.prototype`. Instead of setting a prototype by hand inside `@init`, declare a `proto` object as part of your interface configuration (passed to `.set()`), and the runtime will construct a dedicated subclass of `MsjsObject` for your interface type and attach it automatically to every instance:

```javascript
const proto = {
    then (onResolve, onReject) { /* ... */ },
    get jsv () { return this; }, // Conventional JS-value accessor
};

yourInterface.set({
    handlers: { /* ... */ },
    proto, // Every instance of this interface gets `proto` as its prototype
});
```

> Note: Initialization **must** be done via an `@init` hander. 

See [Case Study: The `@promise` Interface](#case-study-the-promise-interface) below for a complete example.

## Case Study: The `@promise` Interface

The built-in `@promise` interface is the perfect example of a bilingual interface.

*   **Mesgjs:** It responds to messages like `myPromise(then onResolved)`.
*   **JavaScript:** It can be used with standard JS syntax like `myPromise.then(onResolved)`.

This is achieved by passing a `proto` object as part of the interface configuration in `getInterface('@promise').set({ ..., proto })`. The `proto` object contains the standard JavaScript Promise-like methods (`.then()`, `.catch()`, `.resolve()`, etc.) directly as instance methods — no explicit `Object.setPrototypeOf` call is needed in `@init`. The `handlers` map in the same `.set()` call implements the Mesgjs message endpoints, and each handler typically just delegates to the corresponding method on `d.rr` (e.g. `then: (d) => d.rr.then(d.mp.at(0), d.mp.at(1))`). Both sets of functions ultimately operate on the same underlying state, providing two different "dialects" to access the same functionality.

## Conclusion

By following this workflow, you can create powerful, reusable, and secure interfaces that extend the capabilities of Mesgjs while providing a familiar API for other JavaScript developers. For more examples, explore the foundational interface implementations in the [`src/runtime/`](src/runtime/:1) directory.

## See Also

- [Message Parameter Normalization](Message-Parameter-Normalization.md) - How JavaScript values are converted to message parameters
- [JavaScript Runtime Reference](JavaScript-Runtime-Reference.md) - Complete runtime API reference
- [Mesgjs Messaging Overview](Mesgjs-Messaging-Overview.md) - Understanding the message passing system
- [Unified List Utilities](runtime/Unified-List-Utilities.md) - Internal utilities for runtime developers
