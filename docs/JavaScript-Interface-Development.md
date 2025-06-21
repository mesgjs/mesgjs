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
*   `getInstance(type, params)`: This is the factory function for creating all Mesgjs objects. **It is the direct replacement for the `new` keyword.** You do not use `new` to create instances of your interfaces.
*   `setRO(object, key, value)` or `setRO(object, keyValueObject)`: A utility to create read-only properties on objects. This is used extensively throughout the runtime to enforce immutability where appropriate.
*   `toMSJS(jsValue)`: A crucial function that converts native JavaScript values (like strings, numbers, booleans, and arrays) into their corresponding Mesgjs object equivalents (e.g., `@string`, `@number`, `@jsArray`) *if* you need to message or otherwise manipulate them as Mesgjs objects instead of accessing them directly. Please note that this function is exposed as `globalThis.$toMSJS`.

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

export function loadMSJS (mid) {
    // Note: $modScope is exposed as a property of globalThis
    const { d, ls, m, na } = $modScope(), { b, mp, sm } = d;

    // Your interface definition goes here

    // Signal that your interface is ready
    // Note: fready/fwait only work when runtime module management is enabled
    fready(mid, 'your-interface-name');
}
// Self-load if runtime module management isn't enabled
// If you have mandatory feature deps, you might want to throw instead
if (!globalThis.msjsNoSelfLoad) loadMSJS();
```

### C. Step 1: Get the Interface Object

The first step inside your `loadMSJS` function is to get an interface management object.

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

*   `d.rr`: The **r**eceiver **r**eference. This is the public interface function for the object instance—the "face" it presents to the outside world, whether that's other Mesgjs objects or external JavaScript code.
*   The role of JavaScript's `this` is distributed in Mesgjs:
    *   `d.octx`: The **o**bject **c**on**t**e**x**t created at instantiation. This plain JavaScript object is the ideal place to hold references to other complex JavaScript objects or resources that the Mesgjs object needs to work with.
    *   `d.js`: A convenient alias for `d.octx.js`. This is a common pattern for attaching a dedicated JavaScript class instance to a Mesgjs object to manage its logic.
    *   `d.p`: The **p**ersistent, private storage for the object instance. In contrast to `d.octx` (and `d.js`), this is the only private state accessible to native Mesgjs handlers (either your own, or potentially handlers in chained interfaces if your interfaces isn't *final*).
*   `d.mp`: The **m**essage **p**arameters. This is a `NANOS` list containing all parameters passed in the message.
*   `d.sm`: The attributed **s**end-**m**essage function. Use this to send messages to other objects: `sm(recipient, op, params)`.

Here is an example handler:

```javascript
function opSomeOperation(d) {
    const firstParam = d.mp.at(0); // Get the first positional parameter
    const namedParam = d.mp.at('name'); // Get a named parameter

    // Store a value in the object's persistent storage
    d.p.set('lastOp', 'someOperation');

    // Send a message to another object
    // ls() is a NANOS helper accepting a flat array of key/value pairs
    // (empty keys are assigned sequential numeric-like keys)
    const otherObject = getInstance('some-other-interface');
    return d.sm(otherObject, 'doSomething', ls([ 'key1', 'param1', , 'param2']));
}
```

### F. Step 4: The `@init` Constructor

The `@init` handler is special. It acts as the constructor for your object and is called when a new instance is created with `getInstance`. This is the ideal place to set up initial state and, if you're creating a "bilingual" interface, attach a JavaScript prototype.

```javascript
function opInit(d) {
    // Set up initial persistent state from message parameters
    if (d.mp.has('initialValue')) {
        d.p.set('value', d.mp.at('initialValue'));
    }

    // For a bilingual interface, attach the JS prototype
    // ** Important: As d.rr is a function, you must chain the Function prototype **
    // You will generally want to bind some key methods with access to internal
    // (e.g. d.js) state.
    Object.setPrototypeOf(d.rr, YourInterfacePrototype);

    // For a JS-heavy interface, attach a JS class instance for state
    // (Be sure to initialize d.octx.js; d.js is a getter)
    d.octx.js = new MyJavaScriptClass(d.mp.at('initialConfig'));
}
```

## Case Study: The `@promise` Interface

The built-in `@promise` interface is the perfect example of a bilingual interface.

*   **Mesgjs:** It responds to messages like `myPromise(then onResolved)`.
*   **JavaScript:** It can be used with standard JS syntax like `myPromise.then(onResolved)`.

This is achieved in its `@init` handler, which attaches a JavaScript `proto` object to the Mesgjs object instance (`d.rr`). The `proto` object contains the standard JavaScript Promise methods (`.then()`, `.catch()`, etc.), while the `handlers` map in `yourInterface.set()` implements the Mesgjs message endpoints. Both sets of functions ultimately operate on the same underlying state, providing two different "dialects" to access the same functionality.

## Conclusion

By following this workflow, you can create powerful, reusable, and secure interfaces that extend the capabilities of Mesgjs while providing a familiar API for other JavaScript developers. For more examples, explore the foundational interface implementations in the [`src/runtime/`](src/runtime/:1) directory.