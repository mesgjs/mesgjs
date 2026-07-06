# Mesgjs `@timestamp` Interface (singleton)

The `@timestamp` singleton interface provides utilities for working with timestamps (milliseconds since the Unix epoch, January 1, 1970 00:00:00 UTC). It is a singleton interface — there is only one instance, accessible via `@c(get @timestamp)`.

Timestamps are plain JavaScript numbers (milliseconds since the Unix epoch). They are not wrapped in a special object type.

## Mesgjs Message Operations

* `(elapsed block)`
  * Synopsis: Executes `block` and returns the elapsed time in milliseconds.
  * `block` is a `@code` block (or any RIC value). If it is a `@code` block, it is `(run)`. Otherwise, the value is used as-is (and elapsed time will be near zero).
  * Returns a number (milliseconds elapsed, as measured by `Date.now()`).

* `(fromISOString isoString)`
  * Synopsis: Parses an ISO 8601 date/time string and returns the corresponding timestamp (milliseconds since the Unix epoch).
  * Equivalent to JavaScript's `Date.parse(isoString)`.
  * Returns `@nan` / `NaN` if the string cannot be parsed.

* `(fromUTCYMDHMS year month day hour minute second)`
  * Synopsis: Constructs a timestamp from UTC date/time components.
  * Parameters are positional: year, month (1–12), day (1–31), hour (0–23), minute (0–59), second (0–59).
  * Returns the timestamp (milliseconds since the Unix epoch).
  * Equivalent to JavaScript's `Date.UTC(year, month - 1, day, hour, minute, second)`.

* `(now)`
  * Synopsis: Returns the current time as a timestamp (milliseconds since the Unix epoch).
  * Equivalent to JavaScript's `Date.now()`.

* `(toISOString timestamp)`
  * Synopsis: Converts a timestamp to an ISO 8601 string in UTC.
  * Returns a string such as `"2026-06-26T18:00:00.000Z"`.
  * Equivalent to JavaScript's `new Date(timestamp).toISOString()`.

* `(toUTCYMDHMS timestamp)`
  * Synopsis: Decomposes a timestamp into its UTC date/time components.
  * Returns a `@list` (NANOS) with 8 positional values:
    * Index 0: year (full year, e.g. 2026)
    * Index 1: month (1–12)
    * Index 2: day of month (1–31)
    * Index 3: hour (0–23)
    * Index 4: minute (0–59)
    * Index 5: second (0–59)
    * Index 6: milliseconds (0–999)
    * Index 7: day of week (0=Sunday, 1=Monday, …, 6=Saturday)

## Notes

* `@timestamp` is a **singleton** interface. `@c(get @timestamp)` always returns the same instance.
* `@timestamp` is **final** — it cannot be extended via interface chaining.
* Timestamps are plain JavaScript numbers, not Mesgjs objects. They can be stored in any storage variable and passed as parameters to other messages.

## Examples

```
%(nset ts=@c(get @timestamp))

// Get the current time
%(nset now=%ts(now))

// Convert to ISO string
@c(log %ts(toISOString %now))
// e.g. "2026-06-26T18:00:00.000Z"

// Parse an ISO string back to a timestamp
%(nset t2=%ts(fromISOString '2026-01-15T12:30:00.000Z'))

// Decompose a timestamp into components
%(nset parts=%ts(toUTCYMDHMS %t2))
@c(log %parts(at 0) %parts(at 1) %parts(at 2))
// 2026 1 15

// Construct a timestamp from UTC components
%(nset t3=%ts(fromUTCYMDHMS 2026 1 15 12 30 0))

// Measure elapsed time of a code block
%(nset elapsed=%ts(elapsed { @c(log 'doing work') }))
@c(log 'elapsed ms:' %elapsed)
```
