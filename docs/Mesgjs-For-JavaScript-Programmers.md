# Mesgjs For JavaScript Programmers

(A comparison of JavaScript and Mesgjs concepts.)

# Getting Into The Mesgjs Mindset

In Mesgjs, every _thing_ (that's not a comment or embed) is an object, and every
_action_ is a message (including things that are declarations, statements, and
operators in JavaScript). Therefore, every single programming concern boils down
to figuring out what message to send to which object.

# Scopes And Variables

## JavaScript

- Global scope - properties attached to the `globalThis` object (or an
  environment-specific equivalent, such as `window`) have global scope and can be
  accessed from anywhere.\
  `globalThis.x = 5;`
- Module scope - variables declared within a module (but outside of any
  function) are accessible within the module.
- Function call parameters - call parameters may be declared as part of the
  function declaration, and are accessible within the function.\
  `function f (x) {...}`
- Block scope - variables declared within a block (including a function's
  outer-most defining block) are accessible within the block. Blocks may be
  nested, and each block has its own scope. Variables from less nested blocks
  are visible within more nested blocks unless eclipsed by a more nested
  declaration.\
  `{ let x = 5; }`
- An object's persistent properties are generally stored as properties of the
  "`this`" object, sharing a namespace with the object's private methods and
  prototyped properties and methods.\
  `this.x = 5;`
- Variables are mutable, and are generally declared using "`let`" in modern
  JavaScript.
- Constant values are declared using "`const`".\
  `const x = 5;`

## Mesgjs

- Mesgjs does not have distinct variables or variable declarations in the
  JavaScript sense. All values are stored in lists, which are a hybrid of
  JavaScript arrays and plain objects, but accessed more like Maps. Values may
  have named or positional/index keys.
- Global shared storage - this storage object is accessible everywhere as
  special object `@gss`.\
  `@gss(nset x=5) @gss(set y to=10) @gss(at x) // 5`
- Module private/protected storage - each module has its own storage, accessible
  anywhere within the module as special object `@mps`.
- Object persistent properties are accessible via a storage object called "`%`".
  It's similar to JavaScript's "`this`", except it doesn't store any message
  handlers (Mesgjs' closest equivalent to JavaScript methods).\
  `%(nset x=5) %(at x) // 5`\
  `%x // shortcut for %(at x); also 5`
- The storage object called "`#`" is for temporary "scratch" values that don't
  need to persist between messages. Each message dispatch (or redispatch) gets
  its own `#`. This storage is similar to local, block-scoped variables in a
  JavaScript function's top-level block.
- Mesgjs has neither function declarations nor function call-parameter
  declarations. When a message is dispatched, the message parameters are
  accessible to the responding handler via the storage object called "`!`".\
  `!0 /* first positional message parameter */`\
  `!x /* message parameter named "x" */`

# Blocks, Functions, Methods, And Calls

## JavaScript

- JavaScript's code blocks appear between `{` and `}`. They are for code structure
  only. They are not directly addressable or assignable (in value contexts, `{`
  and `}` are overloaded to represent plain object literals or destructuring).
- JavaScript has a large variety of function declarations (the specifics of
  which are beyond the scope of this document). We'll only cover a few of the
  basic variations.
- Traditional function declaration:\
  `function name (parameters...) { /* function body */ }`
- Arrow function (expression-based):\
  `(parameters...) => expression`
- Arrow function (block-based):\
  `(parameters...) => { /* function body */ }`
- A function call (not associated with an object):\
  `functionName(parameters...)`
- A method call associated with an object:\
  `object.methodName(parameters)`
- Methods are stored as object properties, and are located by following object
  prototype chains.
- Function and method calls may be _chained_:\
  `(returns function)(chained function params)`\
  `(returns object).method(params)`
- Unlike code blocks, functions may be stored, retrieved, passed, etc.
- Functions defined within other functions have access to all the (non-eclipsed)
  variables in their enclosing scope.
- Method invocations in JavaScript are anonymous. There is no native mechanism
  for identifying or verifying which object, if any, invoked an object's method.

## Mesgjs

- Mesgjs' code blocks appear between `{` and `}` or `{` and `!}`.
  They are object literals, and can be stored, retrieved, passed,
  messaged, etc.
- The `{ }` version returns `@u` (undefined) unless a specific return value
  is returned via the code in the block.
- The `{ !}` version returns the value of the last expression in the block,
  unless a specific return value is returned via the code in the block first.
- Code blocks normally run in the context in which they were defined
  (`%`, `#`, and `!` are based on a `(load)` message to the enclosing
  module object).
- Code blocks registered as message handlers as part of an object interface
  definition run in the context of the receiving object and message dispatch
  (`%` contains the object's persistent properties, a new `#` is created for
  every message (re)dispatch, and `!` contains the current message parameters).
- Mesgjs has a single messaging syntax (a (required) message operation and
  optional parameters, bracketed by `(` and `)`):\
  `(op optionalParameters) // similar to .op(parameters) in JS`
- Messages are sent to the preceding object (either an initial object, called
  the message base, or, when chaining, to the result of the previous message).
  Chained messages in Mesgjs are completely analogous to chained function or
  method calls in JavaScript.\
  `base(op1 params...)(op2 params...) // similar to
  base.method1(params).method2(params)`
- Message handlers are stored in interfaces, and are located by following
  interface chains (starting with the interface associated with an object's
  type). The process is somewhat similar to how JavaScript resolves methods
  (and other object properties) via object prototype chains.
- Messages from JavaScript to Mesgjs objects are anonymous, just like object
  method invocation in JavaScript. Messages _between Mesgjs objects_, however,
  are _attributed_ - the receiving object knows with extreme confidence which
  object sent the message, and its assigned type.
- Code blocks are executed by sending them a `(run)` message. The message does
  not use any parameters.
- Functions are created by sending a `(fn)` message to a code block (`@code`
  object instance). The newly-created `@function` object runs in a new context,
  disconnected from the original code block's context. The original code
  block is unaffected. Any message parameters to the `(fn)` message become
  the new function object's persistent state (`%`). Persistent state will
  simply start out empty if there are no message parameters.
- Functions are invoked by sending them a `(call)` message.
- To review, when a function is sent a `(call)` message, `%` contains the message
  parameters from the prior `(fn)` message, `#` contains scratch storage, and `!`
  contains the `(call)` message parameters.
- _Mesgjs functions do **not** have access to any of the defining context
  unless you explicitly pass it_ (e.g. as accessors) via `(fn)` parameters
  as part of the function setup. See Closures And Bound State, below, for
  more information.

# Return Values

## JavaScript

- Expression-based arrow functions return the value of their defining
  expression.
- Block-based arrow functions and traditional functions return undefined unless
  a return statement is used to return some other value.\
  `return value;`

## Mesgjs

- As described earlier, "non-returning" blocks (`{ }`) return `@u`
  (undefined) by default and "returning" blocks (`{ !}`) return the value
  of the last expression by default.
- Mesgjs does not have a return statement, but you can send a `(return)` message
  to the dispatch object, `@d`, at any point with similar effect (the
  dispatch terminates and the value is returned):\
  `@d(return value)`

# Closures And Bound State

## JavaScript

- Functions (and nested functions) _automatically_ have access to variables in
  outer scopes. In the case of accessing outer function variables, this access
  continues even after the outer function returns.
  ```
  function makeCounter () {
      let count = 0;
      return function () { return count++; };
  }
  ```
- Functions (including methods) may be bound with "`this`" values (allowing, for
  example, a method on a specific object to be turned into a function) and/or
  initial parameter values (function currying).\
  `const newFunction = someFunMeth.bind(thisValue, parameters...);`

## Mesgjs

- In Mesgjs, when a function object is created from a code object, the new
  function object doesn't automatically inherit anything from the generating
  scope. Anything the function will need must be passed as a parameter in the
  `(fn)` message. You can pass entire storage objects, or accessors (getters
  and/or setters) for specific keys.\
  `#(nset l=[ value x=3 y=4 ] z=17)`\
  `#(nset fn={...!}(fn #l getZ=#(getter z) setZ=#(setter z)))`\
  `// Inside the function #fn:`\
  `// %0 is the same as the original #l`\
  `// %getZ(run) returns the current #z value`\
  `// %setZ(call value) sets a new #z value`
- Any returning block (`{ !}`) can be used to provide custom "getter" behavior.
- You can "curry" functions in either of two ways:
  - You can pass initial parameters as part of the `(fn)` message (but the initial
    parameters will be accessed via `%` storage instead of `!` storage, and the
    code block used to generate the function must arrange access accordingly):\
    `{ ... %curry ... !call ... !}(fn curry-parameters... ) /* later... */ (call
    call-parameters...)`
  - You can write a "more traditional" wrapper function that calls the function
    to be curried:\
    `#(nset inner={...!}(fn))`\
    `#(nset outer={ %inner(call %curry !call) !}(fn inner=#inner curry
    parameters))`\
    `#outer(call call parameters)`

# Arrays And Objects

## JavaScript

- JavaScript has arrays and array literals. Arrays are objects whose properties
  are assigned (usually) sequential numeric-as-string keys that behave like
  numbers. The array prototype includes methods such as `push`, `pop`, `shift`,
  `unshift`, `slice`, etc. The numeric nature of array keys avoids conflict with
  array instance methods.
- Array literals are bracketed by `[` and `]`:\
  `const a = [5, 10, 'hello']; // a[1] (or, equivalently, a['1']) contains
  10`\
  `Object.keys(a); // ["0", "1", "2"]`
- JavaScript has plain objects and plain object literals. Object properties are
  typically given string-like names. As these can conflict with prototyped
  instance methods, most object methods are presented as static class methods of
  Object instead.
- Object literals are bracketed by `{` and `}`:\
  `const o = { greeting: 'Hello' }; // o.greeting (or o['greeting']) contains
  Hello`\
  `Object.keys(o); // ["greeting"]`
- JavaScript also has maps (Map class) and sets (Set class).

## Mesgjs

- Mesgjs has lists and list literals. These are like a hybrid between JavaScript
  arrays and plain objects, but accessed with messages (similar to method
  calls), much as you would access a JavaScript Map or Set. Keys may precede
  list values, separated by "`=`". Values without keys are assigned the next
  sequential numeric-as-string (index) keys, just like JavaScript arrays.
- List literals are bracketed by `[` and `]`, like JavaScript arrays:\
  `#(nset l=[5 10 greeting=Hello]) // #l(at 1) is 10; #l(at greeting) is
  Hello`
- Mesgjs lists support array-like messages, such as `(push)`, `(pop)`, `(shift)`,
  `(unshift)`, etc. These operate only on the index-keyed values.
- Mesgjs' message handlers live in interface definitions, not in the objects
  themselves, so there is never any risk of a list item's key interfering with a
  message operation.
- Mesgjs also has maps (`@map` interface) and sets (`@set` interface).

# Conditionals

## JavaScript

- `if (condition1) { action1 }`\
  `else if (condition2) { action2 }`\
  `else { defaultAction }`
- `switch (reference) {`\
  `case value1: action1; break;`\
  `case value2: action2; break;`\
  `default: action; break;`\
  `}`

## Mesgjs

Conditionals are implemented as messages to the global singleton instance of the
@core interface, @c.

- `@c(if { condition1 !} { action1 !} { condition2 !} { action2 !} else={
  defaultAction !})`
  - Condition blocks are evaluated lazily until one returns true. Action blocks
    for failing conditions are never executed.
  - Returns the value of the chosen action, so it can be used like the JS
    ternary operator (but with any number of conditions).
- `@c(case reference { value1 !} { action1 !} { value2 !} { action2 !} else={
  defaultAction !})`
  - Value blocks are evaluated lazily until one matches. Action blocks for
    non-matching values are never executed.
  - Returns the value of the chosen action, so it can be used like the JS
    ternary operator (with any number of cases).
  - In contrast to JavaScript, Mesgjs does not support fall-through cases.

# Loops

## JavaScript

- `for (const enumProp in object) { block }`\
  `for (const value of iterable) { block }`\
  `for (init; test; change) { block}`\
  `do { block } while (condition)`\
  `while (condition) { block }`
- `break`; `continue`

## Mesgjs

- ```
  #(nset l1=[x=5 hello])     // l1: a list (iterable)
  #(nset i1=@c(get @kvIter)) // i1: a key/value-style iterator
  #i1(for #l1 { @c(log key #i1(key) value #i1(value)) })
  // forward iteration: key x value 5; key 0 value hello
  ```
- ```
  #(nset m=Mesgjs p=0)
  #(nset l1=@c(get @loop))             // l1: a loop controller
  #l1(while pre={ #p(lt #m(length)) !} // while #p < length of #m
    { @c(log #l1(num) #m(at #p)) }     // main: log loop number and m at p
    { #(nset p=#p(add 1)) })           // "extra": increment p
  // 0 M; 1 e; 2 s; 3 g; 4 j; 5 s
  ```
  ("`pre`" is a pre-iteration test; you can also use a "`mid`"-test that runs
  between the main block and the "extra" block, or a "`post`"-test that runs
  after the "extra" block.)
- _`iter`_`(stop)` (to a `@kvIter` or `@loop` instance) - stop iterating
  (like `break` in JS)\
  `#i1(stop)`
- _`iter`_`(next)` - skip to the next iteration (like `continue` in JS)\
  `#i1(next)`

# Operators

## JavaScript

- Assignment Operators: `=`, `+=`, `-=`, `*=`, `/=`, etc.
- Arithmetic Operators: `+`, `-`, `*`, `/`, etc.
- Comparison Operators: `<`, `<=`, `==`, `===`, `!=`, `!==`, `>=`, `>`
- Logical Operators: `&&`, `||`, `!`
- Bitwise Operators: `&`, `|`, `^`, `~`, `<<,` `>>`, `>>>`
- String Operators: `+`
- Ternary Operator: `?:`
- Type Operators: `typeof`, `instanceof`
- Other Operators: "`,`", `delete`, `in`, `?.`, `??`

## Mesgjs

- Mesgjs has basic assignment (via messages to storage objects), but no
  read-modify-write assignments.\
  `#(nset name1=value1 name2=value2 ...) // Like let name1 = value1, name2 =
  value2; in JS`\
  `#(set var key1 key2 to=value) // Like var[key1][key2] = value in JS`
- Arithmetic Messages: `(add)`, `(sub)`, `(mul)`, `(div)`, etc.
- Comparison Messages: `(lt)`, `(le)`, `(eq)`, `(ne)`, `(ge)`, `(gt)`, etc.
  - Availability and function tend to be type-specific (e.g. `@number` and `@string`
    interfaces)
- Logical Messages: `@core(and)`, `@core(or)`, `@core(not)`
  - These are generally based on JavaScript's concept of "truthiness", rather
    than type-specific functionality. As a result, they are offered as messages
    on the global singleton instance of the `@core` interface, `@c`.
- Bitwise Messages: `(and)`, `(or)`, `(xor)`, `(cmpl)`, `(lshf)`, `(rshf)`, `(zfrs)`
- String Messages: `(join)`
- Ternary Message:
  - The `@core(if)` message can return a value, similar to the JavaScript ternary
    operator. See the Conditionals section for more information.
- Type Messages: `@core(type)`, `@core(typeChains)`
  - `@c(type #x) // Like typeof x in JS`
  - `@c(typeChains @c(type #x) type) // Like x instanceof type in JS`

# Math

## JavaScript

"Extended" math operations such as `abs()`, `min()`, `max()`, `sin()`, `cos()`, `tan()`,
`log()`, etc are static methods of the `Math` object in JavaScript.

## Mesgjs

Most of the same operations are available as messages to instances of the
`@number` interface. There is no separate object or interface in Mesgjs as there
is in JavaScript.

# Modules And Imports

## JavaScript

JavaScript has several types of syntax for static imports and exports.
Exports and static imports happen before any module code gets executed.
Without getting into all the variations or precise details, these basically
take the form:

- `import {`_`list-of-stuff-to-import`_`} from '`_`location-of-module`_`';`\
  `export {`_`list-of-stuff-to-export`_`};`\
  `export {`_`list-of-stuff`_`} from '`_`location-of-module`_`'; // import-then-export`
- `export` _`thing`_:\
  `export class ...`\
  `export const ...`\
  `export function ...`

JavaScript also supports dynamic imports. The import operator is somewhat
function-like, returning a promise that resolves to a module-import object
which can then be used to access the imported module's exports.

- `const module = await import('`_`location-of-module`_`');`

## Mesgjs

At the current time, Mesgjs does not support module loading directly from
within the language, although this is expected to change in the future.

You **can**, however, load a module using the runtime's `loadModule`
JavaScript function.

Module loading works in one of two modes:

- If module metadata has been supplied to the runtime, `loadModule` will
  only load modules listed in the module metadata, and only when the
  calculated SHA-512 integrity hash for a fetched module matches the
  corresponding integrity hash stored in the metadata.

  The module metadata is generally assembled from a module catalog
  by the Mesgjs module loader utility. The module catalog entries
  themselves are generated by the Mesgjs transpiler.

- If module metadata has _not_ been supplied, the `loadModule` runtime
  function will load any module with an accessible URL or file path.
