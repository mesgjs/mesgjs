# Mesgjs 10-Minute Overview

## Core Concepts

- Mesgjs is officially pronounced like "messages" (but "message J S" works too).
- Everything is an object. Objects are collections of data, with an associated, immutable type, and behaviors (message handlers) separately/externally defined by one or more interfaces.
- Everything happens by sending a message to an object. Objects may accept, reject, or route messages based on logic / sender / sender type.
- There are no statements or operators - control flow and computations are just messages.
- Many language- and runtime-supplied assets have names or values beginning with `@` to distinguish them from user-supplied assets. The `@` is part of the name or value, *not part of the syntax*. For protection against future extensions, users are strongly encouraged to respect this convention and not use `@` as the first character, even under circumstances in which it is not enforced.
- Namespaces are live, storage objects for variables. They help avoid naming conflicts, and eliminate the need for pre-declarations. There are namespaces for each of the following scopes/contexts:
  - `%` => object persistent properties
  - `#` => scratch (local/temporary) variables
  - `!` => message parameters
  - `%/` or `@mps` => module private/persistent storage
  - `%*` or `@gss` => global shared storage

## Basic Syntax

| Element           | Example                                                   | Meaning                                                                                                                                   |
|-------------------|-----------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| Word literal      | `hello`<br>`?` `!=` `<<`                                  | Basic text, no quotes needed.<br>Symbolic "operators" are a type of word literal.                                                         |
| Quoted "strings"  | `'hello, world'`<br>`"hello, world"`                      | Text within matching plain single or double quotes.                                                                                       |
| List literal      | `[x y z key=value]`                                       | List of positional (aka indexed) + named values.                                                                                          |
| Message           | `object(message parameters...)`                             | Send message to object with parameters.                                                                                                   |
| Message chain     | `object(message1)(message2)`                              | Send messages to successive results (i.e., send `message2` to the result returned by sending `message1` to `object`).                     |
| Namespace-at      | `%x #x !x // error if not set`<br>`%?x #?x !?x // @u if not set` | `%(at x), #(at x), !(at x) shortcuts`<br>`%(at x else=@u), etc. shortcuts`                                |
| Code blocks       | `{ block } // non-returning`<br>`{ block !} // returning` | When `(run)`, evaluates the block.<br>"Non-returning" blocks (`}`) return `@u` (undefined).<br>"Returning" blocks (`!}`) return the last value. |
| Comments          | `// single-line`<br>`/* multi-line */`                    | Human-readable descriptions of code.                                                                                                      |

Many messages allow some or all of their parameters to be code blocks. These are known as RIC (run-if-code) values. In such cases, code blocks are sent the `(run)` message, and the resulting value is used in place of the original block value.

RIC values are especially useful for circumstances where values may or may not be needed (such as test/result options in `@c(if)` or `@c(case)`), calculations might potentially be computationally expensive, or in loops or other iterators where different values need to be tested and/or collected in different iterations.

## Some Additional Important Objects

Beyond the namespace objects (`%`, `#`, `!`, `%*`/`@gss`, and `%/`/`@mps`) already mentioned:

| Object              | Purpose                                                                                                                                                                                                             |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `@c`                | The core system singleton object (provides access to interfaces and object instances, logic, tools, and more).                                                                                                      |
| `@d`                | The current dispatch object, a "meta object" that can be messaged for context regarding the current message and handler dispatch.<br>You can also message this object to terminate a handler early and return a value. |
| `@t` `@f` `@n` `@u` | Singletons corresponding to JavaScript `true`, `false`, `null`, `undefined`                                                                                                                                         |

## Examples

### 1. Simple Message

```mesgjs
@c(log 'Hello, world!')
```

Instructs the core object to log "Hello, world!" to the console.

### 2. Variables And Namespaces

```mesgjs
#(nset x=5 y=10) // Named-set - sets scratch variables x and y
@c(log #(at x))  // Log the value of scratch at key x (5)
@c(log #x)       // Same as above (variable shortcut)
```

### 3. Conditionals (if-else if-else)

```mesgjs
@c(if {#x(gt 0)!} positive else='not positive')
```

Evaluates to the text "positive" when `#x` is greater than zero, and "not positive" otherwise.

### 4. Loops

```mesgjs
#(nset i1=@c(get @loop)) // get a loop iterator; save in #i1
#i1(run { @c(log #i1(num)) } times=5) // run 5 times, logging iteration number
// 0 1 2 3 4

#(nset i2=@c(get @loop) po2=1) // get another iterator; set #po2 to 1
#i2(while { @c(log #po2) } mid={ #po2(lt 1024)! } { #(nset po2=#po2(mul 2)) })
// 1 2 4 8 16 32 64 128 256 512 1024
```

The `#i1` loop runs the code block five times, logging each loop iteration number, 0 through 4, to the console.

The `#i2` loop runs the main block (logging the current value of `#po2` to the console), runs a mid-iteration test that will stop iteration when the value has reached 1024, and then runs an "extra" block (doubling the value).

Loops may also have pre and/or post tests, which run before the main block and after the "extra" block, respectively. (Use the post test instead of the mid test to test after the main block if you don't have an "extra" block.)

## 5\. Creating A Function-Style Code Block

```mesgjs
#(nset linear = { // Implements slope-intercept y = mx + b  
    !(at m else=%(at m else=1))       // call's !m else fn's %m else 1  
    (mul !0)                      // call x (first positional, required)  
    (add !(at b else=%(at b else=0))) // call's !b else fn's %b else 0  
!}(fn)) // no m or b; if absent at (call), defaults will be m=1, b=0  

#(nset slope3 = #linear(fn m=3)) // new variant with default %m=3  
#linear(call 2)                // uses defaults m=1, b=0; 2*1+0=2  
#linear(call 2 m=3 b=4)        // no defaults used; 2*3+4=10  
#slope3(call 3 b=2)            // uses default %m=3; 3*3+2=11
```

The `(fn)` message, sent to either a regular code block or a functional code block, returns a new functional code block that accepts `(call)`. `(fn)` message parameters become the newly-generated function instance's persistent state (`%`). `(call)` message parameters are available via the `!` namespace.

## 6\. Error Handling

```mesgjs
#(nset t1 = @c(get @try)) // get a try/catch instance; save in #t1  
#t1(try {...risky code...} catch={...recovery code...})
```

Handles exceptions safely. You can also message `#t1` for things like the error type or the error message.

## 7\. Implementing A Counting Interface

```mesgjs
@c(interface counter)      // Create an interface called "counter"  
(set handlers = [          // Chain-message the returned interface  
    @init = { %(nset count=0) } // Upon instantiation, set %count to zero  
    inc = { %(nset count=%count(add 1)) } // (inc) adds 1  
    get = { %count ! }     // (get) returns the current count  
])                         // Add the interface's message handlers  

#(nset c1 = @c(get counter)) // Create counter instance c1  
#c1(inc) #c1(inc)            // Increment it twice  
@c(log #c1(get))             // Get and log the counter value (2)
```

Note that when a code block is executed as a message handler, it operates using the `%` (persistent object-property storage), `#` (scratch/local variable storage), and `!` (message parameter) namespaces of the receiving object and associated message dispatch, not the namespaces in which the code block was originally defined.

# Tips For Beginners

* Always start a chain with an object (such as `@c`, `@gss`, `#myObject`, or an object literal).

* Use lists `[...]` for flexible collections (like objects + arrays combined).

* Get familiar with the core object `@c` (interface `@core`) early - it's your toolbox.

* `%x`, `#x`, and `!x` generate an error at runtime if "x" isn't set; `%?x`, `#?x`, and `!?x` use `else=@u` internally to return `@u` (undefined) if "x" isn't set.

* To help avoid accidental data leaks, namespace objects may be used
as a base for messages (as in `%(at ...)`), but they are simply word literals
(text) when passed directly as values (as in the list literal, `[%]`).
Use the `(self)` message of the `@list` interface if you really want to pass
an entire namespace (e.g., `%(self)`). For consistency, this even applies to
`@gss`, despite the fact that it doesn't provide any additional security
benefit.

* Note that "`!}`" is a single, indivisible, "lexical token", not two. It
ends a code block, and is meant as a visual alert/reminder that the final
value will be returned. It is unrelated to the `!` (message parameter)
namespace. Further note that "`! }`" (as two separate tokens) is an error,
as `!` is not permitted to appear by itself as a value (only as the base
object for a message).

* Namespaces help avoid naming collisions, but you do have to be mindful
when reading or writing code so as not to mix them up (or potentially
even use an `@` where you meant `%`, `#`, or `!`, or vice-versa).

# Notable Differences From Other Languages

* There is *really* minimal syntax.

* The "`=`" token is used to create key-value associations in list
literals and message parameters, not for assignment.

* You never have to worry about operator precedence (which action happens
first) or associativity (left-to-right vs right-to-left evaluation),
even without adding extra parentheses.

* Mesgjs objects are opaque, even at the JavaScript level, except for
what they choose to expose/share.

* Object message behaviors essentially become a type of contract at the
time an object is created - neither the object type nor its referenced
interfaces are permitted to change after the object is created.

* As message handlers are always part of an object's interface(s)
and never attached directly to an object, there are never issues with
name-collisions between handlers and persistent-state properties or
other values.

* Inter-object messages are *attributed* (i.e., not anonymous). Attributed
messages allow message receivers to know with extreme confidence which
object sent the message, as well as its primary interface type. The only
way for an object to spoof the identity of another object is for the
spoofed object to explicitly expose object data via a JavaScript-level
message handler.

* Although Mesgjs does not have public/protected/private-style
access-control keywords, the secure, attributed-message capability allows
message handlers to make well-informed decisions about individual messages
and flexibly implement their own policies.

# Static Data \- SLID Format

* SLID = Static List Data (similar to JSON, but based on Mesgjs syntax)

* It consists of static, non-executable, Mesgjs list-literal data (no messages/chains).

* The outermost list container (the "SLID container") is wrapped in `[(...)]` instead of the usual plain `[...]`. This allows it to be distinguished from executable Mesgjs code, as `[(...)]` is not a legal token sequence in Mesgjs (a message/chain must always begin with a base object).

* To generate SLID from a list, use the `(toSLID)` message of the `@list` interface.

* To generate (possibly nested) lists from SLID, use `@c(slid text)`.

* SLID use cases include configuration blocks, storage, serialization, and safe transport.

Example (potential SLID representation of a simple HTML document):

```mesgjs
[(html  
    [head  
        [title 'HTML As SLID']  
    ]  
    [body  
        /* [tag properties... children...] */  
        [h1 'This is so SLID!']  
        [p style='font-family: sans-serif;' 'Hello, world']  
        [a href='https://example.com' target=_blank example.com]  
    ]  
)]
```
