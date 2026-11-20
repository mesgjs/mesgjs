# Introduction

Mesgjs is officially pronounced like "messages" (but "message J S" works too).

Mesgjs is a relatively simple language in comparison to most other programming languages. It is based on a small number of concepts and minimal syntax. It was envisioned and created by Brian Katzung in 2024 and 2025.

It is intended to provide a syntax-reducing, security, and control layer between users and pure JavaScript on (potentially multi-tenant) servers and in browsers. Its syntax is partly inspired by aspects of JavaScript and HTML.

It essentially consists of just objects (including object *literals*), sending messages, variables (which are really just sent-for-you messages), and comments. Everything else is built on that foundation.

Objects can store persistent state, and have an immutable type associated with them that determines their behavior in response to messages sent to them via a system of interface definitions and message handlers. Interfaces can be built upon other interfaces by using a multiple-inheritance feature called interface chaining.

Handlers have access to the messaged object's persistent state, scratch space that can be used for transient values that won't be needed after processing the current message dispatch, and any message parameters sent along with the message operation.

Variables in Mesgjs are simply positional or named values within Mesgjs lists, which provide named and numbered ordered storage, and are read or written by messaging the list that contains them. 

Notably, Mesgjs does not have statements in the traditional programming sense (e.g. for flow control, variable or function declarations, etc). It also does not use infix operators (such as 2 \+ 3 \* 5), and this avoids the issues that come with them (such as, which operations have what precedence, and do they evaluate left-to-right or right-to-left?).

The language transpiles to JavaScript and can therefore easily be run both on servers (e.g. using Bun, Deno, or Node) and in browsers.

## Examples

### "Hello, world"

```mesgjs
@c(log 'Hello, world')
```

### Mesgjs Syntax In One Line

While not exhaustive, this shows key syntax concepts in a single line

```mesgjs
object(message #scratch %objProp firstMsgParam=!0 list=[...] code={...!}) // Mesgjs in one line
```

### Mesgjs Syntax On A Card

```
Storage objects (optionally followed by ?):
  # ! % %% %* %/
  #name #?name #[name... else=default]

Other objects: @c @d @f @mid @n @t @u

Blocks: {...} {... returnValue !}

Lists: [value... @e key=value...]

Messages:
  receiver(op params...)
  receiver([op params=[...] else={...!}])

Literals: 123 3.14 0xff 42n 'string' "string" word

Comments: /* multi-line */ // to end of line

Other: @js{ /* JavaScript */ @} @debug{ /* Mesgjs */ }
```

### Multiplier Demonstration

**Notes:**
- A code block normally executes in the context in which it is defined.
- A function is a code block that has its *own* context (based on the originating `(fn)` message) and message parameters (from each `(call)` message).
- Loops are not part of the language itself; they're objects (created from a standard library) that run code blocks and track iteration state.

```mesgjs
// Create a code block "%*multiplyBy" in global storage (%*).
// This block will be used as a (reusable) function prototype.
%*(nset multiplyBy={
    #(nset multiplier=!0) // For demo, save 1st call param as #multiplier
    // Return the product (the last expression in a block closing with "!}")
    %multiplicand(* #multiplier)
!})

// Create a scratch function "#times4" from the "%*multiplyBy"
// code-block prototype that multiplies by four.
// (The function object's persistent storage "%multiplicand" will be 4.)
#(nset times4=%*multiplyBy(fn multiplicand=4))

// Loop to "print" (log to the console) multiples of four for multipliers
// in the range 1 to 10 by calling the times4 function with the 1-based
// loop iteration number.
#(nset loop=@c(get @loop)) // #loop is now a loop iteration object
#loop(run { @c(output #loop(num1) : #times4(call #loop(num1))) } times=10)
// 1 : 4; 2 : 8; 3 : 12; ...; 8 : 32; 9 : 36; 10 : 40
```

## Cross-Engine Portability

Mesgjs is designed from the ground up for universal portability. The core runtime and transpiler are authored as pure, standards-compliant ECMAScript Modules (ESM) that run, without bundling, across all major server JavaScript engines (**Node.js**, **Bun**, and **Deno**) as well as modern **Web Browsers**.

### Interactive Web REPL

You can experiment with Mesgjs immediately without installing any tools or runtimes:
- **[Mesgjs Web REPL](https://www.mesgjs.org/repl.html)**: Live in-browser transpilation and execution of basic Mesgjs code and core libraries.

### Web URL Imports & Caching with `@bkatzung/webload`

While modern web browsers and Deno natively support module imports via HTTPS URLs and W3C import maps, Node.js and Bun do not support remote URL imports out of the box. Mesgjs uses the [`@bkatzung/webload`](https://www.npmjs.com/package/@bkatzung/webload) package to provide seamless, cached web URL imports across environments:

- **Web Browsers**: Load modules directly via standard `<script type="module">` tags and native browser import maps.
- **Deno**: Native support using standard configuration/import maps (`deno run --config webload.json ...` or `deno test --config webload.json ...`).
- **Node.js**: Use `wicnode` (or `node --import @bkatzung/webload/node`) to resolve import maps from `webload.json` and cache remote dependencies locally on disk.
- **Bun**: Use `wicbun` (or `bun --preload @bkatzung/webload/bun`) for URL imports and import map resolution.
- **CLI Utilities**: Mesgjs command-line tools (such as `msjstlr` and `msjstrans` in `bin/`) include built-in engine probing that automatically detects and uses available runtimes (`deno` -> `wicbun` -> `wicnode`) or honors the `MESGJS_ENGINE` environment variable (`deno`, `bun`, or `node`).

## Documentation

Comprehensive documentation and learning resources for Mesgjs are organized into the following guides:

### Beginner Tutorials

- [Mesgjs For Beginners - Part 1](tutorials/Mesgjs-For-Beginners-Part1.html) — Objects, messages, arithmetic, nesting, and scratch storage
- [Mesgjs For Beginners - Part 2](tutorials/Mesgjs-For-Beginners-Part2.html) — Operator words, lists, code blocks, and comments
- [Mesgjs For Beginners - Part 3](tutorials/Mesgjs-For-Beginners-Part3.html) — Storage types, safe navigation, functions, conditionals, and loops

### Language Guides & Concepts

- [Mesgjs 10-Minute Overview](docs/Mesgjs-10-Minute-Overview.md) — Fast-paced introduction to key concepts and language features
- [Mesgjs Language Overview](docs/Mesgjs-Language-Overview.md) — Comprehensive overview of objects, dispatches, storage, and architecture
- [Mesgjs Syntax](docs/Mesgjs-Syntax.md) — Formal syntax and grammar reference
- [Mesgjs Messaging Overview](docs/Mesgjs-Messaging-Overview.md) — Deep dive into message dispatching, chains, and operator-style words
- [Mesgjs Text and Numbers](docs/Mesgjs-Text-And-Numbers.md) — Text escaping, string interpolation, and numeric literals
- [Message Parameter Normalization](docs/Message-Parameter-Normalization.md) — Standard conventions for handling positional and named message arguments
- [Mesgjs Compared To Other Languages](docs/Mesgjs-Compared-To-Other-Languages.md) — Paradigm comparisons with JavaScript, Python, Smalltalk, and others
- [Mesgjs For JavaScript Programmers](docs/Mesgjs-For-JavaScript-Programmers.md) — Transition guide mapping familiar JavaScript concepts to Mesgjs idioms

### Standard Interfaces

- [`@code` and `@function`](docs/interfaces/@code-@function.md) — Executable code blocks and parameterized function objects
- [`@core` and Core Interfaces](docs/interfaces/@core-etc.md) — Base objects and singletons (`@c`, `@t` (true), `@f` (false), `@n` (null), `@u` (undefined))
- [`@dispatch` and `@module`](docs/interfaces/@dispatch-@module.md) — Dispatch context access and module metadata
- [`@interface`](docs/interfaces/@interface.md) — Interface creation, multiple inheritance, prototypes, and lifecycle
- [`@js-array`](docs/interfaces/@js-array.md) & [`@js-object`](docs/interfaces/@js-object.md) — Native JavaScript array and object interoperability
- [`@kvIter`](docs/interfaces/@kvIter.md) — Key-value iterator protocols
- [`@list`](docs/interfaces/@list.md) — Positional and named ordered list storage
- [`@loop`](docs/interfaces/@loop.md) — Iteration and loop control
- [`@map`](docs/interfaces/@map.md) — Key-value dictionary collections
- [`@number`](docs/interfaces/@number.md) — Arithmetic and numeric helper operations
- [`@promise`](docs/interfaces/@promise.md) — Asynchronous promises and task scheduling
- [`@reactive`](docs/interfaces/@reactive.md) — Reactive data bindings and observed properties
- [`@set`](docs/interfaces/@set.md) — Unique value collections
- [`@string` and `@regex`](docs/interfaces/@string-@regex.md) — Text operations and regular expression matching
- [`@timestamp`](docs/interfaces/@timestamp.md) — Date, time, and timestamp handling
- [`@try`](docs/interfaces/@try.md) — Structured exception handling and error recovery

### JavaScript Integration & Runtime

- [JavaScript Interface Development](docs/JavaScript-Interface-Development.md) — Guide to authoring custom Mesgjs interfaces in JavaScript
- [JavaScript Runtime Reference](docs/JavaScript-Runtime-Reference.md) — Architecture reference for the JavaScript runtime engine
- [Bilingual Interface Template](docs/Bilingual-Interface-Template.md) — Best practices template for dual Mesgjs/JavaScript modules
- [Mesgjs Module Configuration](docs/Mesgjs-Module-Configuration.md) — In-file SLID header configuration and feature declarations
- [Unified List Utilities](docs/runtime/Unified-List-Utilities.md) — Unified list manipulation utilities and runtime helper functions

### Command-Line Tools

- [`msjstlr`](docs/command-line/msjstlr.md) — Mesgjs Transpile-Load-Run (TLR) CLI launcher and dynamic dependency resolver
- [`msjstrans`](docs/command-line/msjstrans.md) — Source-to-source JavaScript transpiler CLI
- [`msjscat`](docs/command-line/msjscat.md) — Module catalog SQLite database management CLI
- [`msjsload`](docs/command-line/msjsload.md) — Module loader utility
- [`msjserrmap`](docs/command-line/msjserrmap.md) — Transpiled stack trace error mapper
- [`editschema`](docs/command-line/editschema.md) — Interactive SQLite schema editor
