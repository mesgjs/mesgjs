# Mesgjs For Beginners

# Outline

## Part One

- Welcome to Mesgjs!
- Pronounced "messages"; "message J S" is okay too (and might be less confusing in some contexts)
- Opening the "REPL" page and the browser console
  - [Internal note: the "REPL" doesn't currently auto-print anything; must use e.g. `@c(log)` for output]
- How to paste and execute commands in the REPL
- Almost everything in Mesgjs boils down to one of two concepts:
  - "Objects", which store information (which could be anything from a simple numeric or textual value to complex data sets) and have associated sets of actions they know how to perform
  - Sending a "message", which asks an object to perform one of its associated actions and return a result
  - Real world analogy: you call an accountant and ask them to prepare a tax return for you (the result is likely a tax return and a bill)
- Let's start with a simple program and break down its parts:
  - `@c(log "The answer is:" 42)`
  - The parts:
    - `@c`, `log`, `"The answer is:"`, and `42` are all objects
    - `@c` is the Mesgjs "core" object. It's like a toolbox.
    - `log` is a "word" (a textual value, also known as a "string"; words don't contain any spaces or certain other special characters)
    - `"The answer is:"` is called a "double-quoted string" (text between matching pairs of double-quotes; these may contain spaces and special characters; use `\"` (backslash double-quote) to put a double-quote within a double-quoted string)
    - `42` is a number
    - `(` and `)` indicate that you want to send a message, and must appear in matching pairs
  - What the program does:
    - This program sends the "log" message (first value inside the parentheses) to the `@c` (core) object (the value preceeding the open parenthesis), asking it to write (log) the values "The answer is:" and "42" (everything up to the close parenthesis) to the browser console.
- Since the result of sending a message is just another object/value, we can send messages within messages:
  - `@c(log "The answer"(join " is:") 6(mul 7))`
  - What's happening:
    - `"The answer"(join " is:")` is a message to the string object `"The answer"` requesting it to return a new string with `" is:"` appended (i.e. `"The answer is:"`, as before)
    - `6(mul 7)` is a message to the numeric object 6 asking it to return a new number that is the product of itself and 7 (i.e. 42, as before)
- We can also send a message to the object (value) returned from the previous message:
  - `@c(log 6(mul 7)(div 2))`
  - What's happening:
    - `6(mul 7)` multiplies 6 by 7, returning 42
    - 42 is sent the message `(div 2)`, dividing by 2, and returning 21
  - Exercises:
    - Use the `sub` and `mul` messages to calculate `(9 - 2) x 3` and `9 - (2 x 3)`
- Some messages accept "named values" instead of or in addition to the positional values we've seen
  - `@c(log first(join second third with=", "))`
  - What's happening:
    - The "join" message will use the `with` named-value as a separator between values
    - The returned result (passed to `@c(log)`) will be string value `"first, second, third"`
    - Note that `=` as used here only associates a name with a value (it does not imply either equality or assignment)
- What if you want to save values (such as results) for later reuse?
  - Mesgjs provides several objects for managing storage.
  - These are accessed often, so they have very short names.
  - The `#` object is used for saving and retrieving "scratch" values that don't need to be retained long-term.
  - You can add or set named values in scratch storage using `#(set name to=value)` or `#(nset name=value)`.
  - The `nset` message accepts any number of named values, so you can send messages like `#(nset firstName=Brian lastName=Katzung)`.
  - You can retrieve a value saved in scratch storage by using `#(at name)`. Since this is an extremely common type of message, it can be abbreviated as just `#name`, and Mesgjs will send the `at` message to `#` for you.
    - `@c(log My name is #(at firstName) #lastName)`

## Part Two

- Operator words are words that contain only certain types of punctuation
  - You may see operator words that are aliases for common messages (especially for number-object messages):
    - `@c(log "The answer"(join " is:") 6(mul 7)(div 2))`
    - `@c(log "The answer"(+ " is:") 6(* 7)(/ 2))`
- Lists are used heavily in Mesgjs.
  - They are created automatically for storage and for the values after the "action" part of messages.
  - You can also create lists (and lists within lists) whenever you want by putting the contents (any combination of values and named values) between `[` and `]`:
    - `#(nset breakfast=['orange juice' crepes=[milk eggs flour]])`
    - What it means:
      - `#breakfast` is a scratch value consisting of a list with *two* items (one *positional* value, and one *named* value)
      - `#(at breakfast 0)` (or, less efficiently, `#breakfast(at 0)`) is a single-quoted tring `'orange juice'` (single-quoted strings work analogously to double-quoted strings)
      - `#(at breakfast crepes)` is another list, containing three items
      - `#(at breakfast crepes 0)`, for example, is the word `milk`
- Code blocks are objects that contain reusable chunks of code.
  - They consist of Mesgjs code surrounded by `{` and `}` or `{` and `!}`.
  - They run when sent the `run` message.
  - The first form (ending with `}`) returns the value `@u` ("undefined") by default.
  - The second form (ending with `!}`) returns the last value in the code block by default.
  - `#(nset greet={ @c(log Welcome to Mesgjs) #greet !}) #greet(run)(run)(run)`
  - What it does:
    - First, it stores a code block in scratch storage named "greet".
    - The code block, when executeed, writes (logs) "Welcome to Mesgjs" on the console and returns *itself* as the result.
    - Second, the code block is retrieved from scratch storage and sent the `run` message to trigger execution.
    - Since this particular code block returns itself as the result, we can repeat the greeting by sending additional `run` messages to the result of earlier runs!
- Comments allow you to leave notes to yourself or other readers of your code
  - Multi-line comments look like `/* this */`. They start at the first `/*` and end the first `*/`.
    - The beginning and end may be within a line, or they may span across multiple lines.
    - Multi-line comments do not "nest" (`/* <-- starts here /* ends here --> */ not part of comment */`)
  - Single-line comments look like `// this`. They start at the `//` and end at the end of the current line.
    - `// <-- starts here // all // one // comment // ends here -->`

## Part Three

- Object persistent storage (`%`)
- Message parameters (`!`)
- `(at ... else=defaultValue)` and `#?`/`%?`/`!?` variants
- Creating `@function` objects with `fn`
- Conditionals
- Mid-block returns with `@d(return)`
  - Need some sort of segue into `@d`!
- Basic repeat and while loops
- List iteration loops?

## Part Four

- Global persistent storage (`%*`) and module persistent storage (`%/`)
- Creating your own interfaces and objects