# Learning Mesgjs — Tutorial Series Outline

**Target audience:** People with little to no programming experience  
**Format:** Browser REPL at `https://www.mesgjs.org/repl.html` + browser console (DevTools)  
**Tone:** Friendly, exploratory, "try it and see what happens"  
**Key principle:** Show first, name it later — learners *do* things before they learn the terminology. Every expression that produces a result should be wrapped in `@c(log ...)` so learners can see the output.

---

## Tutorial 1 — "Your First Steps: Numbers and Words"

**Goal:** Get the REPL working; understand that Mesgjs has basic kinds of values.

### Topics

- How to open the REPL and the browser console (with a screenshot/diagram)
- Typing your first line: `@c(log 42)` — just try it! (no explanation of what `@c` is yet — just do it)
- Numbers: `@c(log 42)`, `@c(log 3.14)`, `@c(log -7)`
- Single words (no spaces needed): `@c(log hello)`, `@c(log world)`, `@c(log yes)`
- **`@c(log)` accepts multiple values:** `@c(log hello, world)` logs two separate values — the word `hello,` and the word `world`
- **Segue to strings:** but what if you want `hello, world` as *one thing*? → quoted strings
- Quoted text for multi-word phrases: `@c(log 'Hello, world!')`, `@c(log "My name is Alex")`
- The difference: `hello` is one word; `'hello world'` is one phrase (the space is *inside* the quotes)
- Comments:
  - Multi-line: `/* this is a note */` — everything between `/*` and `*/` is ignored; can go anywhere, even in the middle of a line
  - Single-line: `// this is a note` — everything from `//` to the end of the line is ignored
  - Introduce `/* */` first: it has an explicit ending point, making it easier to understand for beginners

### Exercises

1. Log your name to the console
2. Log your age
3. Log a favorite multi-word phrase using quotes
4. Try logging two separate words on the same line

---

## Tutorial 2 — "Asking Things To Do Things"

**Goal:** Introduce the core syntax pattern — `thing(action values...)` — with concrete examples. Reveal that Tutorial 1 was already using this pattern.

### Topics

- **Reveal:** in Tutorial 1, you were already doing it — `@c(log 42)` was asking the `@c` (core) object to `log` the value `42`
- The pattern: `thing(action values...)` — you're *asking* something to *do* something
- Introduce the term **"message"**: sending `(action)` to `thing` is called *sending a message* — `thing` receives the message and responds
- `@c` is the "core" object — a toolbox that comes with Mesgjs
- **Values can themselves be the result of sending messages** — these are calculated *before* being passed along
  - Example: `@c(log 42(add 8))` — `42(add 8)` is calculated first (giving `50`), then `@c` logs `50`
  - This is how chaining and nested messages work
- **Math first:**
  - `@c(log 42(add 8))` → `50`
  - `@c(log 10(mul 3))` → `30`
- **Chaining:** the result of one action becomes the input for the next
  - `@c(log 2(add 3)(mul 5))` → `25` (add 3 to 2, then multiply that result by 5 — left to right, no guessing about order)
  - Compare to `@c(log 2(add 3(mul 5)))` → `17` (multiply 3 by 5 to get 15, effectively becoming `2(add 15)`)
- **Actions on text:**
  - `@c(log hello(upper))` → `HELLO`
- **Chaining text:**
  - `@c(log 'hello, '(join world)(upper))` → `HELLO, WORLD`
  - `(join world)` appends the word `world` to `'hello, '` (note the space is *inside* the string)
  - `(upper)` then uppercases the whole result
  - This re-anchors: spaces inside quotes are part of the string; `world` without quotes is a single word

### Exercises

1. Log the result of `5` multiplied by `6`, then add `4` (correct answer: `34`)
2. Log the result of `5` multiplied by the sum of `6` and `4` (correct answer: `50`)
3. Join two strings together and log the result
4. Join a word and a quoted phrase, then uppercase the result
5. *(moved to Tutorial 3)*

---

## Tutorial 3 — "Named Values in Messages"

**Goal:** Introduce named parameters — the `name=value` syntax used when sending messages — as a natural extension of what learners have already seen.

### Topics

- So far, messages have had *positional* values: `42(add 8)` — `8` is the first value passed
- Some messages also accept *named* values: `name=value` pairs that give extra control
- Example: `@c(log hello(join world with=' '))` → `hello world`
  - `with=' '` tells `(join)` to put a space between the two words
  - Without it: `@c(log hello(join world))` → `helloworld` (no space)
- Named values can appear alongside positional values in any order


### Exercises

1. Join two words with a hyphen between them using `with='-'`
2. Join a word with an uppercase word that is converted to lowercase (using named params if helpful)
3. Slice a string to extract just part of it

---

## Tutorial 4 — "Remembering Things: Scratch Storage"

**Goal:** Introduce the `#` scratch namespace as a simple "notepad" for storing values.

### Topics

- The problem: what if you want to use a value more than once?
- Introducing `#` — your scratch notepad for the current session
- Writing to it: `#(nset name='Alice' age=30)`
- Reading from it: `@c(log #name)`, `@c(log #age)`
- Using stored values in actions: `@c(log #age(add 1))`
- Safe reading: `@c(log #?missing)` returns nothing (undefined) instead of an error; `@c(log #missing)` would be an error
- `=` is a *label*, not assignment — it pairs a name with a value in a list

### Exercises

1. Store your name and age, then log them
2. Store two numbers, add them together, and log the result
3. Try reading a name you haven't stored yet using `#?` — what do you see?

---

## Tutorial 4 — "Storing and Running Code Blocks"

**Goal:** Introduce code blocks as storable, runnable chunks of code — before conditionals or loops. This primes learners for understanding "run this block if..." and "run this block N times...".

### Topics

- The idea: what if you want to save a set of actions and run them later (or more than once)?
- A code block: `{ @c(log 'hello') }` — a "recipe" you haven't cooked yet
- Storing a block: `#(nset greet={ @c(log 'Hello!') })`
- Running it: `#greet(run)` — now it executes
- Running it again: `#greet(run)` — same block, runs again
- Running it multiple times: `#greet(run) #greet(run) #greet(run)`
- Blocks can use stored values: `#(nset greet={ @c(log 'Hello, ' #name) })`
  - Change `#name` between runs and see what happens — the block reads `#name` *when it runs*, not when it was stored

### Exercises

1. Store a block that logs a greeting; run it 3 times
2. Store a name in `#name`, store a greeting block that uses it, run the block, then change `#name` and run again
3. Store a block that does a math calculation and logs the result

---

## Tutorial 5 — "Making Decisions"

**Goal:** Learn conditionals — using blocks as yes/no tests and as actions.

### Topics

- The idea: do different things depending on a condition
- Comparison actions: `@c(log #age(gt 18))`, `@c(log #score(eq 100))`, `@c(log #x(lt 0))`
  - These return `@t` (true) or `@f` (false)
- The `{ ... !}` returning block — a block that gives back a value (like a yes/no answer)
  - The `!}` ending means "return the last value"
- `@c(log @c(if { #age(gt 18) !} 'adult' else='minor'))`
- The `{ ... }` action block — "do this thing" (no return value needed)
  - `@c(if { #score(gt 90) !} { @c(log 'Great job!') } else={ @c(log 'Keep trying!') })`
- Multi-branch: test1 result1 test2 result2 else=...
  - `@c(if { #score(gt 90) !} 'A' { #score(gt 80) !} 'B' else='C')`

### Exercises

1. Store a score, then log "pass" or "fail" based on whether it's above 60
2. Store a number, then log "positive", "negative", or "zero"
3. Try a multi-branch if with 3 or more conditions

---

## Tutorial 6 — "Doing Things Repeatedly: Loops"

**Goal:** Introduce loops as a way to repeat a block of code.

### Topics

- The idea: run a block of code multiple times — like calling `(run)` yourself, but the loop handles it
- Getting a loop object: `#(nset loop=@c(get @loop))`
- Running N times: `#loop(run { @c(log 'hello') } times=5)`
- Using the loop counter inside the block: `#loop(num)` (0-based) or `#loop(num1)` (1-based)
  - `#loop(run { @c(log #loop(num1)) } times=10)` — counts 1 through 10
- Combining with decisions: log only even numbers
  - `#loop(run { @c(if { #loop(num1)(/+ 2)(eq 0) !} { @c(log #loop(num1)) }) } times=20)`

### Exercises

1. Log the numbers 1 through 10 using a loop
2. Log a multiplication table for 3 (3, 6, 9, ... 30)
3. Count down from 10 to 1

---

## Tutorial 7 — "Building Your Own Objects"

**Goal:** Create a simple interface with state and behavior — the heart of Mesgjs.

### Topics

- The idea: group related data and actions together into a "thing" you can reuse
- Creating an interface (a blueprint): `@c(interface counter)(set handlers=[...])`
- The `@init` handler — runs automatically when a new object is created
- Object memory `%` — the object's own persistent notepad (survives across messages)
- Creating an instance: `#(nset c1=@c(get counter))`
- Sending actions to your object: `#c1(inc)`, `@c(log #c1(get))`
- **Complete worked example:**

```
@c(interface counter)(set handlers=[
    @init={ %(nset count=0) }
    inc={ %(nset count=%count(add 1)) }
    get={ %count !}
])
#(nset c1=@c(get counter))
#c1(inc) #c1(inc)
@c(log #c1(get))  // 2
```

### Exercises

1. Add a `dec` (decrement) action to the counter
2. Add a `reset` action that sets the count back to 0
3. Create a "greeter" object that stores a name and responds to a `greet` action by logging a greeting

---

## Optional Tutorial 8 — "Reusable Actions: Functions"

**Goal:** Introduce function-style code blocks for learners who want to go further.

### Topics

- The returning block: `{ ... !}` — gives back the last value when run
- Turning a block into a function: `{ ... !}(fn)`
- Storing a function: `#(nset double={ !0(mul 2) !}(fn))`
- Calling a function: `@c(log #double(call 5))` → `10`
- Named parameters: `@c(log #greet(call name='Alice'))` using `!name` inside the block
- Storing functions in `%*` (global shared storage) for reuse across REPL sessions

---

## Cross-Cutting Design Notes

- **No prior programming assumed** — avoid jargon like "variable", "function", "method" without first explaining them in plain language
- **Every expression that produces a result is wrapped in `@c(log ...)`** so learners can see output immediately
- **Errors are learning opportunities** — each tutorial should include a "what if I try...?" section showing common mistakes and what the error looks like
- **Consistent metaphors:** objects are "things", actions are "requests", storage namespaces are "labeled notepads"
- **Progressive complexity** — Tutorial 1 needs only `@c(log ...)`, Tutorial 7 introduces interfaces
- **REPL persistence note** — `#` (scratch) storage persists across REPL runs in the same browser session; `%*` (global shared storage) also persists and is useful for building up examples step by step
