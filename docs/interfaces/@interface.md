# Mesgjs `@interface` Interface (final, private)

The `@interface` interface provides functionality for managing Mesgjs interfaces, including configuration and instance creation. Interface objects are obtained via `@c(interface name)`.

In addition to providing your own interface name, you can create *anonymous* interfaces via `@c(interface :?)`. The generated interfaces will will be assigned unique interface names of the form `:?0`, `:?1`, etc. The assigned interface name can be retrieved using the `(name)` message.

## Mesgjs Interface

* `(instance params=[])`
  * Synopsis: Creates and returns a new instance of the interface.
  * The params list is passed to the instance's @init handler if present.
  * Throws `TypeError` if the interface is abstract.
  * For singleton interfaces, always returns the same instance.
  * Unlike `@c(get interface)`:
    * This works even for private interfaces (see below).
    * `(instance)` message attribution (`sr`, `st`, and/or `smi`, as available) is forwarded to the instance's `(init)` message.

* `(name)`
   * Synopsis: Returns the name of the interface (useful for anonymous interfaces).

* `(proto)`
   * Synopsis: Returns the class (constructor) used for instances of this interface if the `proto` interface property has been configured (or `@u`/`undefined` otherwise).
   * Returns a *class* extending `MsjsObject` even if the interface was configured with an *object* `proto`. When an object is provided to `proto`, the runtime creates an anonymous subclass of `MsjsObject` with that object's properties as the prototype.
   * Useful for sub-classing on the JS side in parallel with interface chaining on the Mesgjs side. Make sure the interface is ready before access (e.g. via `fwait` on an associated feature).

* `(set options)`
  * Synopsis: Configures the interface with the specified options.
  * Options:
    * `abstract`: Boolean. If true, marks the interface as incomplete and unable to be instantiated.
    * `cacheHints`: Object/list of hints for caching handler lookups. Keys are message names. Values can be:
      * `true`: Cache the handler lookup
      * `false`: Don't cache the handler lookup
      * `'pin'`: Cache and pin the handler lookup (the entry will never be evicted)
    * `chain`: List. Sets an ordered chain of super-class interfaces. Must be set before the interface is used.
    * `final`: Boolean. If true, marks the interface as final and unable to be chained.
    * `handlers`: Object/List. Message operation handlers to be added. Can be JavaScript functions or Mesgjs code blocks.
    * `lock`: Boolean. If true, prevents future setInterface calls.
    * `once`: Boolean. If true, prevents returning the interface again and throws an error if returned before.
    * `pristine`: Boolean. If true, throws an error if not the first configuration.
    * `private`: Boolean. If true, instances can only be generated via the interface object (via the `(instance)` message), not through `@c(get)`, and no additional interface objects for this interface will be available.
    * `proto`: Object or Class. A JavaScript prototype object or `MsjsObject` subclass to be used for instances of this interface. When a plain object is provided, the runtime creates an anonymous subclass of `MsjsObject` with the provided prototype. When a class extending `MsjsObject` is provided, it is used directly, enabling ES2022 private fields and custom constructors. See [V4 Prototype Approach](#v4-prototype-approach) below.
    * `singleton`: Boolean. If true, only one instance of the interface can exist.
  * Throws `TypeError` if:
    * Configuring a @-prefixed interface after runtime initialization
    * The interface is not pristine and pristine=true was specified
    * The interface is locked
    * Attempting to change the chain of a referenced interface
    * Attempting to extend a final interface

The interface is used internally by the Mesgjs runtime system to manage interface definitions and is marked as private to prevent direct instantiation through `@c(get)`. Interface objects must be obtained through `@c(interface)`.

## V4 Prototype Approach

In Mesgjs v4, all objects are `MsjsObject` class instances. The `proto` option provides an ultra-efficient way to attach JavaScript methods and properties to all instances of an interface.

### Plain Object Prototype

When `proto` is a plain object, the runtime:
1. Creates an anonymous subclass of `MsjsObject` named `M.<interfaceName>`
2. Copies all properties from the provided `proto` object to the subclass prototype (excluding `constructor`)
3. Uses this subclass for all future instance creation

This approach is more performant than the v3 pattern of using `Object.setPrototypeOf(d.rr, jsProto)` after object creation, as it allows the JS engine to optimize the prototype chain from the start.

### Class Prototype with Private Fields

When `proto` is a class that extends `MsjsObject`, the runtime uses the class directly for instance creation. This enables:

- **ES2022 private fields** (`#fieldName`) for truly private JavaScript state
- **Custom constructors** that receive the per-instance instantiation key
- **Direct access** to Mesgjs internal state via static methods `MsjsObject.getJS`, `MsjsObject.setJS`, and `MsjsObject.getNullDispatch`

The constructor receives two arguments: `key` (a unique Symbol for this instance) and `type` (the interface name). The `key` must be passed to `super(key, type)`.

#### Typical Usage Pattern

In typical usage, the `@init` handler initializes `d.js` with the object's JavaScript state, and the constructor captures this state into private fields immediately after calling `super()`:

```javascript
class MyWidget extends MsjsObject {
    #state; // Private field for JS state

    constructor (key, type) {
        super(key, type);
        // Capture d.js state into private field immediately after super()
        this.#state = MsjsObject.getJS(this, key);
    }

    // JS-side methods can now access private state directly
    get label () { return this.#state?.label; }
    set label (v) { this.#state.label = v; }
}

const iface = getInterface('myWidget');
iface.set({
    handlers: {
        '@init': (d) => {
            // Initialize JS state (accessible via d.js in handlers)
            d.js = { label: d.mp.at('label') || 'default', count: 0 };
        },
        'getLabel': (d) => d.js.label,
        'setLabel': (d) => { d.js.label = d.mp.at(0); },
    },
    proto: MyWidget,
});

// Usage:
const widget = getInstance('myWidget', { label: 'My Widget' });
widget.label; // 'My Widget' (via JS private field)
$c.sm(widget, 'getLabel'); // 'My Widget' (via Mesgjs handler)
```

The instantiation key is typically not stored beyond the constructor—it is used once to initialize the private state, after which the private fields hold the state directly.

#### Static Access Methods

When using a class prototype, the following static methods on `MsjsObject` provide authenticated access to per-instance state:

- `MsjsObject.getJS(obj, key)` — Returns the JS state (`d.js` equivalent) for `obj`. Throws `TypeError` if `key` does not match the instance's instantiation key.
- `MsjsObject.setJS(obj, key, value)` — Sets the JS state for `obj`. Throws `TypeError` if `key` does not match.
- `MsjsObject.getNullDispatch(obj, key)` — Returns a "null" dispatch object for `obj`, providing access to dispatch properties (`.js`, `.p`, `.rr`, `.rt`, etc.) without an active message. Throws `TypeError` if `key` does not match.

These methods enable bilingual state sharing: Mesgjs handlers can use `d.js` and `d.p`, while JS-side methods can access the same state via private fields initialized in the constructor.

### Example: Using `proto` in JavaScript

```javascript
const jsProto = {
    // JavaScript methods available on all instances
    greetJS (name) { return $c.sm(this, 'greet', [name]); },
    get valueOf () { return this; },
    // Conventional entries for JS/Mesgjs interop
    get jsv () { return this; },
};

const interface = $c.getInterface('myInterface');
interface.set({
    handlers: {
        '@init': opInit,
        greet: (d) => 'Hello, ' + d.mp.at(0),
    },
    proto: jsProto, // Every instance gets jsProto as its prototype
});
```

> **Note:** In v4, `d.rr` is a `MsjsObject` class instance, not a function. The old pattern of using `Object.setPrototypeOf(d.rr, jsProto)` with `Function.prototype` chaining no longer works. Use the `proto` property in your interface configuration instead.

## JavaScript Interface

Note: `globalThis.$c` represents the global singleton instance of the `@core` interface in JavaScript. It presents several runtime functions, including `getInterface` and `getInstance`, as properties.

* `const interface = $c.getInterface(name);`\
Returns the same interface management object as `@c(interface name)` in Mesgjs.
* `interface.ifName`\
Equivalent to the `(name)` message in Mesgjs. Returns the name of the interface (useful for anonymous interfaces).
* `interface.set(options)`\
Configures the interface like the `(set)` message in Mesgjs. `options` may be a plain JavaScript object or a `NANOS` instance.
* `interface.instance(optInitParams)`\
Returns an instance (or *the* instance, for singletons) of the interface. Unlike `@c(get interface)`, this works even for private interfaces. If `optInitParams` is supplied, it is passed as the message parameters for the `@init` constructor message handler of the interface. Message attribution is not available from JavaScript.
* `interface.proto`\
Returns the class (constructor) used for instances of this interface if the `proto` interface property has been configured (or `undefined` otherwise). Always returns a *class* extending `MsjsObject`, even if the interface was configured with a plain object `proto`. Useful for interface chaining to sub-class on the JS side.

## Examples

Example usage in Mesgjs:
```mesgjs
// Get interface object and configure it
@c(interface myInterface)(set
    handlers=[
        greet={ 'Hello, '(join !0) !}
        farewell={ Goodbye !}
    ]
    singleton=@t
)

// Create an instance and use it
#(nset greeter=@c(get myInterface))
#greeter(greet world)    // Returns "Hello, world"
#greeter(farewell)       // Returns "Goodbye"
```

Example usage in JavaScript:
```javascript
// Get the interface management object and configure the interface
const interface = $c.getInterface('myInterface');
interface.set({
    handlers: {
        greet: (d) => {
            return 'Hello, ' + d.mp.at(0);
        },
        farewell: () => {
            return 'Goodbye';
        }
    },
    singleton: true
});

// Get the instance and message it using v4 API
const greeter = $c.getInstance('myInterface');
$c.sm(greeter, 'greet', ['world']);  // Returns "Hello, world"
$c.sm(greeter, 'farewell');          // Returns "Goodbye"
```
