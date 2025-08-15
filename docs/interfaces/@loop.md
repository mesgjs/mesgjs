# Mesgjs @loop Interface

*   `@c(get @loop)`
    *   Synopsis: Get a new loop instance.

*   `(next result=value)`
    *   Synopsis: Starts the next iteration.
    *   If the optional `result` is present, its value becomes (or adds to) the overall return value.

*   `(num)`
    *   Synopsis: Returns the 0-origin loop number (loops completed at the *start* of the current loop).

*   `(num1)`
    *   Synopsis: Returns the 1-origin loop number (loops completed by the *end* of the current loop).

*   `(rem)`
    *   Synopsis: Returns the number of loops remaining *after* the current loop.

*   `(rem1)`
    *   Synopsis: Returns the number of loops remaining *at the start of* the current loop.

*   `(run block times=n collect=@f)`
    *   Synopsis: Run a `block` a fixed number of `times`.
    *   RIC values: `block`
    *   If `collect` is JS-true, all iteration results are returned as a list.

*   `(stop result=value)`
    *   Synopsis: Stops iteration.
    *   If the optional `result` is present, its value becomes (or adds to) the overall return value.

*   `(times)`
    *   Synopsis: Returns the total planned number of `(run)` loop iterations.

*   `(while pre=test mainBlock mid=test extraBlock post=test collect=@f)`
    *   Synopsis: Runs code block(s) while conditions test JS-true.
    *   RIC values: all except `collect`
    *   `pre`: Evaluated before `mainBlock`.
    *   `mid`: Evaluated after `mainBlock` (requires `extraBlock`).
    *   `post`: Evaluated at the end of the iteration to determine if looping continues.
    *   If `collect` is JS-true, all `mainBlock` results are returned as a list.

# Examples

```
%(nset l1=@c(get @loop))
%l1(run { @c(log %l1(num) %l1(num1) %l1(rem) %l1(rem1)) } times=2)
// 0 1 1 2
// 1 2 0 1
```

```
%(nset l2=@c(get @loop))
%l2(while
    { @c(log %l2(num) %l2(num1)) %l2(num1)(mul 2) !}
    mid={ %l2(num)(lt 2) !}
    { %l2(next result='/') }
    collect=@t)(toString)
// 0 1; 1 2; 2 3
// [(2 '/' 4 '/' 6)]
