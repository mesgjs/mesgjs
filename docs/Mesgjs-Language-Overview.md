# Mesgjs Language Overview

# Overview

Mesgjs is officially pronounced like "messages" (but "message J S" works too).

Mesgjs is a relatively simple language in comparison to most other programming languages. It is based on a small number of concepts and minimal syntax. It was envisioned and created by Brian Katzung in 2024 and 2025\.

It is intended to provide a syntax-reducing, security, and control layer between users and pure JavaScript on (potentially multi-tenant) servers and in browsers. Its syntax is partly inspired by aspects of JavaScript and HTML.

It essentially consists of just objects (including object *literals*), sending messages, variables (which are really just sent-for-you messages), and comments. Everything else is built on that foundation.

Objects can store persistent state, and have an immutable type associated with them that determines their behavior in response to messages sent to them via a system of interface definitions and message handlers. Interfaces can be built upon other interfaces by using a multiple-inheritance feature called interface chaining.

Handlers have access to the messaged object's persistent state, scratch space that can be used for transient values that won't be needed after processing the current message dispatch, and any message parameters sent along with the message operation.

Variables in Mesgjs are simply positional or named values within Mesgjs lists, which provide named and numbered ordered storage, and are read or written by messaging the list that contains them. 

Notably, Mesgjs does not have statements in the traditional programming sense (e.g. for flow control, variable or function declarations, etc). It also lacks things like infix operators (such as 2 \+ 3 \* 5), and the issues that come with them (such as, which operations have what precedence, and do they evaluate left-to-right or right-to-left?).

The language transpiles to JavaScript and can therefore easily be run both on servers (e.g. using Node or Deno) and in browsers.

NOTE: The "at" symbol (`@`) is used often throughout the language implementation to indicate special values/objects; system-provided, core-functionality interfaces; reserved message operation names; and things of that nature. Being aware of this will help you "future-proof" your code (and likely reduce frustration \- for example, you cannot create any new interface with a name beginning with "`@`" outside of the language runtime-core initialization).

# Object Literals

A small number of foundational object types may be created via object literals.

## Text Literals

* There are three "flavors": `'single-quoted text'`, `"double-quoted text"`, and `word-literals` terminated by white-space or characters that start other tokens (`'`, `"`, `/`, `[`, `]`, `{`, `}`, `%`, `#`, `!`, etc)
* JavaScript backslash-escaped characters work in single and double-quoted strings  
* Some word-literals beginning with "@" are assigned special meanings, including, but not limited to:  
  * `@f` (false), `@n` (null), `@t` (true), and `@u` (undefined)

Text literals create objects that are manipulated using `@string` interface operations.

## Numeric Literals

* `-5`, `3.14`, `1.75e-10`
* `10n` (JS BigInt value)
* Base prefixes: `0b` (binary), `0o` (octal), `0x` (hexadecimal)
* `@nan` ("not a number"), `@posinf` (positive infinity), `@neginf` (negative infinity)

Numeric literals create objects that are manipulated using `@number` interface operations.

## List Literals

* `[ zero-or-more ordered items ]`
* Every item in a list has an associated key.  
* If an item appears as a single value, its key is the next zero-origin index position available at the end of the list.  
* If a single value is the word-literal `@e`, it leaves an empty hole at that location in the list.
* If an item appears as two values separated by "`=`", the first value is the key for the second value. The key may be either a whole number (an index key) or some other value (a named key).
* Example: `[ 'Hello, world' second x=2 y=4 'my name'=Brian ]`
* Note that indexed (positional) items are appended at the latest position that preserves ascending index order. For example, the (rather contrived) literal `[ a=1 1=b 0=c ]` actually generates `[ a=1 c b ]` because `c` with index `0` must come before `b` with index `1`, both of which were added after the a-named (non-indexed) value of `1`.

List literals create objects that are manipulated using `@list` interface operations.

## Code-Block Literals

* `{ zero-or-more statements }` \- a "non-(value-)returning" block (the implied return value is undefined)
* `{ zero-or-more statements !}` \- a "(value-)returning" block (the implied return value is the last statement value, or else undefined)
* Mesgjs statements are either literals, variables, message chains, JavaScript embeds, or debugging statements  
* Code blocks normally run in the context of the message dispatch in which they were created. They are run by sending them the `(run)` message, which is often done for you when the blocks are passed as parameters to other objects (for example, as the body of a loop). Code blocks may run in the context of a message dispatch to another object when registered as a handler for a particular interface and operation.
* You can also generate function objects from code blocks (or other function objects) by sending them the `(fn)` message. The message parameters, if any, to the `(fn)` message become the persistent object state for the newly-generated function object. Send the `(call)` message to call a function object. You may optionally include message parameters to `(call)` as well.
* Blurring the line a bit between code blocks and comments:  
  * JavaScript embeds begin with "`@js{`" and end with "`@}`". **IMPORTANT:** The closing delimiter is `@}` and not `}`. Everything in between must be valid JavaScript. If JavaScript embedding is enabled at transpilation time, the JavaScript content will be included in the generated code. Otherwise, the JavaScript embed is treated like a comment.
  * Debugging statements begin with "`@debug{`" and end with "`}`". The contents in between are always parsed, and must be valid and "balanced" (e.g. list-starts must match list-ends) Mesgjs statements. A transpilation-time setting determines whether the debugging statement transpiles to its contained statements or if they are discarded. A debugging statement should never appear at the end of a value-returning block (`{…!}`).

Standard code objects use the `@code` interface. Function objects use the `@function` interface.

### RIC Values

You will likely encounter the abbreviation "RIC" in documentation. This is short for "run if code", meaning if an object value is a code block, it will be (run) to obtain the value to be used by the operation. Code blocks are often used to defer evaluation from message composition time to message-dispatch time:

`*object*(op params… else=2(add 3))` // sum computed **before** sending op to *object*
`*object*(op params… else={ 2(add 3) !})` // passes code rather than result

This allows objects to defer calculating values (potentially with side effects) that might not be used at all, or that might change over time (during loop iterations, for example). Interface handlers should generally treat `else` parameters (for fallback values) as RIC values.

# Messages And Message Chains

A message consists of a (mandatory) message operation and an optional list of message parameters, enclosed between parentheses. 

A message chain consists of a base object, followed by one or more messages. The first message is sent to the base object, and any subsequent messages are sent to the object returned by the immediately preceding message:

`base(mesgOp1 mesgParameters…)(mesgOp2 mesgParameters…)`

In place of a (scalar) message operation, you can supply a list. When you do so, it is referred to as a **list-op**. The mandatory operation may be supplied either as the first positional value in the list, or as a parameter named `op`. If you include a parameter named `params`, its value will be supplied as the message parameters instead of the ones in normal position (i.e. the ones following the op value in the message).

Normally, an object must have handlers for each of the types of messages you send it or it will "throw an exception" (error), but there are two exceptions to that:

* First, you can register an `@default` handler for an interface. This handler will be dispatched to handle any message that does not have its own handler. (You can also register an `@defacc` handler to moderate which message operations will be accepted by the `@default` handler. This handler is passed a message operation and handler type and must return `@t` (true) or `@f` (false) depending on whether or not that message operation should be accepted.)

* Second, you can use a list-op and include a parameter named "else". The value of this will be returned as the result of the message in the case that there is no handler (AND no @default handler) eligible to handle the message. If the value is a block, it will be (run) and its return value, if any, will be used as the message's return value instead:  
  `object([noSuchOp else={ otherObj(otherMessage) !}] message params…)`

# Variables

Variables represent a (typically changeable) value. In Mesgjs, they are stored in lists as named or numbered positions. There are no variable declarations in Mesgjs. Types are dynamic, and variables come into existence when set.

It should also be noted that "`=`" does not represent direct assignment in Mesgjs, it creates an association between a name and a value in a list literal or message parameters. Actual assignment (i.e. to storage) is part of the semantics of specific interface handlers (e.g. the `(set)` and `(nset)` messages of the `@list` interface).

## Persistent Object Properties

A list is allocated to store an object's persistent properties the first time a persistent property is accessed. This is the Mesgjs equivalent of object properties in JavaScript, except that properties have their own "namespace" (they are not shared with handlers), and properties are always only visible to an object's dispatched message handlers unless shared by them in a message.

Properties can be set or retrieved by sending `@list`\-interface messages to the "`%`" list object. The `%key` or `%?key` syntax may be used as shortcuts to retrieve required or optional values instead of `%(at key)` or `%(at key else=@u)`, respectively. Attempting to access a non-existent property results in a runtime error unless an `else=` value has been supplied.

## Transient/Dispatch (Scratch) Storage

A list is allocated to store any temporary values that might be needed while dispatching a Mesgjs handler to process a message. This is the closest equivalent in Mesgjs to function or method local variables in JavaScript. If multiple dispatches occur during the processing of a message, each dispatch gets its own scratch storage.

Scratch values can be set and retrieved by messaging the "`#`" list object. Retrieval shortcuts are `#key` and `#?key`.

## Message Parameters

Message parameters are the optional list of values associated with a message operation. This is the equivalent of function or method call parameters in JavaScript, except that there are no parameter declarations. Positional parameters are `!0` (or `!?0`), `!1`, etc. (though you can also use negative numbers to count back from the end; `!-1` (or `!?-1`) being the last positional parameter).

Parameters can be retrieved (or set/modified, though this is not encouraged) by messaging the "`!`" list object. Retrieval shortcuts are `!key` and `!?key`.

## Module Private (/Persistent) Storage

Module-specific values may be stored in a list object accessible by messaging object "`@mps`". `@mps` always refers to the module storage for the module in which a code block is defined, regardless of where the code block is run or called.

`%` and `@mps` refer to the same storage in code blocks running in their original context. `%` will not refer to the same storage if the block is running as a handler or as a function.

Retrieval shortcuts are `%/key` and `%/?key`.

## Global Shared Storage

Global values may be stored in a list object accessible by messaging object "`@gss`". Retrieval shortcuts are `%*key` and `%*?key`.

While global shared storage uses a list just like other storage and therefore supports positional values, sticking to named values in this scope is generally recommended.

The use of  list singletons is another option for "*partitioned* global state", but requires setting up a simple, chained interface.

# Comments

* A single-line comment begins with `//` and ends at the end of the line  
* A multi-line comment begins with `/*` and ends with `*/`

# Core And Foundational Interfaces

## Core Runtime Interfaces

These essential interfaces are built directly into the runtime core.

* `@code` \- `(run)`-able code blocks (runs in defining dispatch context)
* `@dispatch` \- message-dispatch state
* `@function` \- `(call)`-able, function-mode code blocks (runs in a new dispatch context on every call)
* `@handler` \- message-handler function (runs in messaged object's dispatch context)
* `@interface` \- interface-configuration (and private-interface instantiation)
* `@module` \- loadable-module state

## Foundational Interfaces

These interfaces are the basis for basic language features such as object instantiation, numbers, lists, text strings, conditionals, and loops.

They are unconditionally loaded during runtime initialization, so they act as external extensions of the runtime.

After runtime initialization has completed, it is no longer possible to get an `@interface` instance for interfaces beginning with `@` (and therefore no `@`-named interfaces may be created or modified).

* `@core`
* `@kvIter`
* `@list`
* `@loop`
* `@map`
* `@number`
* `@promise`
* `@regex`
* `@set`
* `@string`
* `@try`

# Frequently Asked Questions

Q. How do I do math without infix (and other) operators?  
A. Send messages. Instead of `2 + 3 * 5`, use `2(add 3(mul 5))` (multiple 3 by 5 and add that result to 2). If you want `(2 + 3) * 5`, that's `2(add 3)(mul 5)` (add 3 to 2, and multiply that result by 5). Inner messages (as parameters to other messages) run before outer messages, and then messages are sent from left to right, sending each subsequent message to the object returned by the previous message.

Q. How do I implement conditionals (e.g., if condition1 then action1 else if condition2 then action2 else otherAction)?  
A. By sending messages (to the instance of the singleton interface `@core`, globally accessible as `@c`):
`@c(if { test1 !} { action1 } { test2 !} { action2 } … else={ otherAction })`
If `test1` is true, then `action1` will be executed and execution stops. Otherwise, `test2` is evaluated, executing `action2` if `test2` returns true, and so on. If no tests return true and there is an `else` parameter, its block is executed. LIke test blocks, action blocks can also be returning-blocks (`{...}`), in which case the returned value of the activated action block becomes the return value of the enclosing `@c(if)` operation.

Q. How do I implement looping constructs (e.g. while condition do someAction)?  
A. By sending messages to an iterator object instance:  
`#(nset iter=@c(get @loop))` // `#iter` is now a `@loop` (code iterator) instance
`#iter(while pre={ preTest !} { someAction } post={ postTest !})` // repeat action while test(s) return(s) true
You can have a `pre-test` (must return true to do `someAction` in the *current* iteration), a `post-test` (must return true do `someAction` in the *next* iteration), or both. There are additional options, but that's the gist of it. `#iter(next)` and `#iter(stop)` messages work similarly to JavaScript's (etc.) `continue` and `break`.

Q. How do I access nested arrays/lists?  
A. The `@list(at)` and `@list(set)` messages accept a sequential, positional list of key values:
`*list*(at key1 key2 key3 else=value)` // like `list[key1][key2][key3] || value` in JS
`*list*(set key1 key2 key3 to=value)` // like `list[key1][key2][key3] = value` in JS
The `@list(nset)` (named set) message is a shortcut for quickly setting top-level values by key:
`*list*(nset key1=value1 key2=value2)` // `list[key1] = value1; list[key2] = value2` in JS

Q. Can I add handlers or "methods" on a one-off basis to individual objects?  
A. No. Message handlers are strictly dispatched on the basis of an object's immutable type in Mesgjs. If the base interface you wish to extend is not "final", you can create a new interface that chains the original interface. You can use an anonymous interface for this, if you wish.