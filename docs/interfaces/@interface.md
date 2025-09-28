# Mesgjs `@interface` Interface (final, private)

The `@interface` interface provides functionality for managing Mesgjs interfaces, including configuration and instance creation. Interface objects are obtained via `@c(interface name)`.

In addition to providing your own interface name, you can create *anonymous* interfaces via `@c(interface :?)`. The generated interfaces will will be assigned unique interface names of the form `:?0`, `:?1`, etc. The assigned interface name can be retrieved using the `(name)` message.

## Mesgjs Interface

* `(instance params=[])`
  * Synopsis: Creates and returns a new instance of the interface.
  * The params list is passed to the instance's @init handler if present.
  * Throws TypeError if the interface is abstract.
  * For singleton interfaces, always returns the same instance.
  * Unlike `@c(get interface)`, this works even for private interfaces (see below).

* `(name)`
  * Synopsis: Returns the name of the interface (useful for anonymous interfaces).

* `(set options)`
  * Synopsis: Configures the interface with the specified options.
  * Options:
    * `abstract`: Boolean. If true, marks the interface as incomplete and unable to be instantiated.
    * `chain`: List. Sets an ordered chain of super-class interfaces. Must be set before the interface is used.
    * `final`: Boolean. If true, marks the interface as final and unable to be chained.
    * `handlers`: Object/List. Message operation handlers to be added. Can be JavaScript functions or Mesgjs code blocks.
    * `lock`: Boolean. If true, prevents future setInterface calls.
    * `once`: Boolean. If true, prevents returning the interface again and throws an error if returned before.
    * `pristine`: Boolean. If true, throws an error if not the first configuration.
    * `private`: Boolean. If true, instances can only be generated via the interface object (via the `(instance)` message), not through `@c(get)`, and no additional interface objects for this interface will be available.
    * `singleton`: Boolean. If true, only one instance of the interface can exist.
    * `cacheHints`: Object/list of hints for caching handler lookups. Keys are message names. Values can be:
      * `true`: Cache the handler lookup
      * `false`: Don't cache the handler lookup
      * `'pin'`: Cache and pin the handler lookup (the entry will never be evicted)
  * Throws `TypeError` if:
    * Configuring a @-prefixed interface after runtime initialization
    * The interface is not pristine and pristine=true was specified
    * The interface is locked
    * Attempting to change the chain of a referenced interface
    * Attempting to extend a final interface

The interface is used internally by the Mesgjs runtime system to manage interface definitions and is marked as private to prevent direct instantiation through `@c(get)`. Interface objects must be obtained through `@c(interface)`.

## JavaScript Interface

Note: `globalThis.$c` represents the global singleton instance of the `@core` interface in JavaScript. It presents several runtime functions, including `getInterface` and `getInstance`, as properties.

* `const interface = $c.getInterface(name);`\
Returns the same interface management object as `@c(interface name)` in Mesgjs.
* `interface.ifName`\
Equivalent to the `(name)` message in Mesgjs. Returns the name of the interface (useful for anonymous interfaces).
* `interface.set(options)`\
Configures the interface like the `(set)` message in Mesgjs. `options` may be a plain JavaScript object or a `NANOS` instance.
* `interface.instance(optInitParams)`\
Returns an instance (or *the* instance, for singletons) of the interface. Unlike `@c(get interface)`, this works even for private interfaces. If `optInitParams` is supplied, it is passed as the message parameters for the `@init` constructor message handler of the interface.

## Examples

Example usage in Mesgjs:
```mesgjs
// Get interface object and configure it
@c(interface myInterface)(set [
  handlers=[
    greet={ 'Hello, '(join !0) !}
    farewell={ Goodbye !}
  ]
  singleton=@t
])

// Create an instance and use it
#(nset greeter=@c(get myInterface))
#greeter(greet world)    // Returns "Hello, world"
#greeter(farewell)         // Returns "Goodbye"
```

Example usage in JavaScript:
```javascript
// Get the interface management object and configure the interface
const interface = $c.getInterface('myInterface');
interface.set({
  handlers: {
    greet: function(d) {
      return 'Hello, ' + d.mp.at(0);
    },
    farewell: function() {
      return 'Goodbye';
    }
  },
  singleton: true
});

// Get the instance and message it
const greeter = $c.getInstance('myInterface');
greeter('greet', ['world']);  // Returns "Hello, world"
greeter('farewell');          // Returns "Goodbye"
```
