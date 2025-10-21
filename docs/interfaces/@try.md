# Mesgjs @try Interface

*   `@c(get @try)`
    *   Synopsis: Get a new try/catch instance.

*   `(error)`
    *   Synopsis: Returns the caught exception, if any.
    *   An exception needn't be a formal `Error` instance (e.g., Mesgjs uses flow exceptions), but this is the common case.

*   `(message)`
    *   Synopsis: Returns the message portion of the caught exception, if any.

*   `(name)`
    *   Synopsis: Returns the name portion of the caught exception, if any (e.g., `Error`, `ReferenceError`).

*   `(next result=value)`
    *   Synopsis: Stops the current main code block and starts the next one, or stops the current exception handler.
    *   Equivalent to `(stop)` if used within an exception handler.
    *   The optional `result` parameter updates the return value.

*   `(result)`
    *   Synopsis: Returns the currently-pending result value.

*   `(return value)`
    *   Synopsis: Updates the result value to be returned without altering the flow of execution.

*   `(stop result=value)`
    *   Synopsis: Stops the current main code block or exception handler.
    *   The optional `result` parameter updates the return value.

*   `(try mainBlock… catchers=[type=block…] catch=block always=block)`
    *   Synopsis: Runs one or more main blocks with the ability to handle an exception if one occurs.
    *   RIC values: all blocks
    *   Runs each `mainBlock`, stopping at the first exception.
    *   The last successfully-completed `mainBlock` result is returned unless overridden.
    *   `catchers`: A list of `type=handler` values for typed exception handling (uses JavaScript `instanceof`).
    *   `catch`: A default block to handle exceptions not handled by `catchers`. Unhandled exceptions are re-thrown.
    *   `always`: A block that is always run, whether an exception occurred or not.

## Asynchronous Interface

These messages return a (JavaScript) promise that resolves to the synchronous-mode result.

* `(atry mainBlock… catchers=[type=block…] catch=block always=block)`
  * Asynchronous version of `(try)`. Any `mainBlock` may be asynchronous.
  * Similar to `@c(await block...)`, if there are multiple `mainBlock` values, they will be executed sequentially (i.e. execution of a subsequent block will not be initiated until execution of the previous block has completed).

# Examples

```
%(nset t1=@c(get @try))
%t1(try {} '1st ok' {} '1st and 2nd ok')
// 1st and 2nd ok
```

```
%(nset t2=@c(get @try))
%t2(try
    { @c(throw 'Catch me!') }
    catch={ @c(log Caught %t2(name)(join :) %t2(message)) }
    always={ %t2(return "It's all good!") }
)
// Caught Error: Catch me!
// It's all good!
