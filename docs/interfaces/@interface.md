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
    * `proto`: Object. A JavaScript prototype object to be attached to all instances of this interface. The runtime creates an anonymous subclass of `MsjsObject` with the provided prototype, enabling efficient method access and better JS engine optimization. See [V4 Prototype Approach](#v4-prototype-approach) below.
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

When `proto` is supplied during interface configuration, the runtime:
1. Creates an anonymous subclass of `MsjsObject` named `M.<interfaceName>`
2. Copies all properties from the provided `proto` object to the subclass prototype (excluding `constructor`)
3. Uses this subclass for all future instance creation

This approach is more performant than the v3 pattern of using `Object.setPrototypeOf(d.rr, jsProto)` after object creation, as it allows the JS engine to optimize the prototype chain from the start.

### Example: Using `proto` in Mesgjs + JavaScript

```mesgjs
// Define interface with JavaScript prototype methods
@js{
d.t.set('proto', {
    // JavaScript methods available on all instances
    greetJS (name) { return $c.sm(this, 'greet', [name]); }
    get valueOf () { return this; }
});
@}
@c(interface myInterface)(set
    handlers=[
        @init={ ... }
        greet={ 'Hello, '(join !0) !}
    ]
    proto=#proto
)
```

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
