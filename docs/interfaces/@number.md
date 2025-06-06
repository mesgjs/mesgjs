# Mesgjs `@number` Interface

This interface supports operations on numbers (both integer and floating point) and JavaScript's "bigint" type. "Receiver" refers to the number that is receiving the message. Example:

1(pi)

This is not a special break in syntax to perform multiplication, this is the `@number`-literal `1` as the receiver, being sent the "`(pi)`" message, an operation which is defined to return the product of pi and the receiver.

(For those familiar with JavaScript, its `Math` functionality is built directly into Mesgjs's `@number` interface.)

No operations use RIC (run-if-code) values unless otherwise specified.

* `(@init number)`
  * Synopsis: Instance initializer
* `(@jsv)`
  * Synopsis: Returns the receiver's underlying JavaScript number (or bigint)
* `(abs)`
  * Synopsis: Returns the absolute value.
* `(acos)`
  * Synopsis: Returns the inverse cosine in radians.
* `(acosh)`
  * Synopsis: Returns the inverse hyperbolic cosine.
* `(add value...)`\
`(+ value...)`
  * Synopsis: Adds the optional values to the receiver and returns the sum.
  * To calculate the sum of a list, use a 0-receiver and the list-op format instead:\
    **`0`**`([add params=list])`
* `(and value...)`
  * Synopsis: Returns the bit-wise AND of the receiver and the specified values.
* `(asin)`
  * Synopsis: Returns the inverse sine in radians.
* `(asinh)`
  * Synopsis: Returns the inverse hyperbolic sine.
* `(atan)`
  * Synopsis: Returns the inverse tangent in radians.
* `(atanh)`
  * Synopsis: Returns the inverse hyperbolic tangent.
* `(atanxy x=value y=value)`
  * Synopsis: Returns the angle (in radians) in the plane between the positive X-axis and the ray from (0, 0\) to the point (x, y).
  * The receiver is not used in this operation. `0` is recommended.
* `(cbrt)`
  * Synopsis: Returns the cube-root.
* `(ceil)`
  * Synopsis: Returns the smallest integer greater than or equal to the receiver.
* `(cmpl)`
  * Synopsis: Returns the complement of the receiver.
* `(cos)`
  * Synopsis: Returns the cosine of the receiver (in radians).
* `(cosh)`
  * Synopsis: Returns the hyperbolic cosine.
* `(div value...)`\
`(/ value...)`
  * Synopsis: Returns the quotient of the receiver value divided by the supplied values, if any.
  * `1(div 2 4) // (1/2)/4 or 1/(2*4); 0.125`
* `(e)`
  * Synopsis: Returns Euler's number, multiplied by the receiver.
  * `0(e) /* 0 */ 1(e) /* ~2.7182 */`
* `(eq value)`
  * Synopsis: Returns `@t` (true) if the receiver is equal to value, or `@f` (false) otherwise.
* `(exp)`
  * Synopsis: Returns Euler's number, e, raised to the power of the receiver.
* `(expm1)`
  * Synopsis: Returns Euler's number, e, raised to the power of the receiver \- 1\.
* `(floor)`
  * Synopsis: Returns the smallest integer less than or equal to the receiver.
* `(ge value)`
  * Synopsis: Returns `@t` (true) if the receiver is greater than or equal to value, or `@f` (false) otherwise.
* `(golden)`
  * Synopsis: Returns the golden ratio multiplied by the receiver.
  * `1(golden) // (1+sqrt(5))/2; ~1.618`
* `(gt value)`
  * Synopsis: Returns `@t` (true) if the receiver is greater than value, or `@f` (false) otherwise.
* `(hypot value... of=list)`
  * Synopsis: Returns the hypotenuse of `list` or the receiver and values.
* `(int)`
  * Synopsis: Returns the integer portion of the receiver.
* `(isNan)`
  * Synopsis: Returns `@t` (true) if the receiver is `@nan` (not-a-number), or `@f` (false) otherwise.
* `(isNegInf)`
  * Synopsis: Returns `@t` (true) if the receiver is `@neginf` (negative infinity), or `@f` (false) otherwise.
* `(isNegZero)`
  * Synopsis: Returns `@t` (true) if the receiver is `-0` (negative zero), or `@f` (false) otherwise.
* `(isPosInf)`
  * Synopsis: Returns `@t` (true) if the receiver is `@posinf` (positive infinity), or `@f` (false) otherwise.
* `(isPosZero)`
  * Synopsis: Returns `@t` (true) if the receiver is `+0` (positive zero), or `@f` (false) otherwise.
* `(ival ge=value gt=value le=value lt=value)`
  * Synopsis: Returns `@t` (true) if the receiver is within the interval defined by the supplied optional constraints, or `@f` (false) otherwise.
  * `(ival ge=4 lt=10) // tests against interval [4, 10)`
* `(le value)`
  * Synopsis: Returns `@t` (true) if the receiver is less than or equal to value, or `@f` (false) otherwise.
* `(ln)`
  * Synopsis: Returns the natural (base e) logarithm of the receiver.
* `(ln10)`
  * Synopsis: Returns the natural (base e) logarithm of 10, multiplied by the receiver.
  * `1(ln10) // ~2.303`
* `(ln1p)`
  * Synopsis: Returns the natural (base e) logarithm of 1 \+ the receiver.
* `(ln2)`
  * Synopsis: Returns the natural (base e) logarithm of 2, multiplied by the receiver.
  * `1(ln2) //  ~0.693`
* `(log base base=10)`
  * Synopsis: Returns the logarithm of the receiver in the specified base (default 10).
  * The optional base, when included, may be provided either as the first positional parameter or as a named parameter (the named parameter takes precedence if both are supplied).
* `(log10e)`
  * Synopsis: Returns the base-10 logarithm of Euler's number, e, multiplied by the receiver.
  * `1(log10e) // ~0.434`
* `(log2)`
  * Synopsis: Returns the base-2 logarithm of the receiver.
* `(log2e)`
  * Synopsis: Returns the base-2 logarithm of Euler's number, e, multiplied by the receiver.
  * `1(log2e) // ~1.443`
* `(lshf value)`
  * Synopsis: Returns the receiver left-shifted by value.
* `(lt value)`
  * Synopsis: Returns `@t` (true) if the receiver is less than value, or `@f` (false) otherwise.
* `(max value... of=list)`
  * Synopsis: Returns the maximum value from the of list (if provided), or the maximum of the receiver and any positional values otherwise.
  * The receiver (and any positional values) *are ignored* in the presence of the of option. 0 is recommended.
* `(min value... of=list)`
  * Synopsis: Returns the minimum value from the of list (if provided), or the minimum of the receiver and any positional values otherwise.
  * The receiver (and any positional values) *are ignored* in the presence of the of option. 0 is recommended.
* `(mod value...)`\
`(/+ value...)`
  * Synopsis: Returns the progressive remainder of the receiver and the specified values.
  * Pneumonic: The additional amount remaining after division (`%` is a storage namespace).
  * `5.1(mod 2.3) // 0.5 (5.1 / 2.3 = 2 remainder 0.5)`
* `(mul value...)`
  * Synopsis: Returns the product of the receiver and the specified values.
  * To calculate the product of a list, use a 1-receiver and the list-op format instead:\
    **`1`**`([mul params=list])`
* `(ne value)`
  * Synopsis: Returns `@t` (true) if the receiver is not equal to value, or `@f` (false) otherwise.
* `(neg)`
  * Synopsis: Returns the negative of the receiver.
  * (If the receiver is negative, the result will be positive.)
* `(or value...)`
  * Synopsis: Returns the bit-wise OR of the receiver and the specified values.
* `(pi)`
  * Synopsis: Returns the value of pi, multiplied by the receiver.
  * `1(pi) /* ~3.1415 */ 2(pi) /* ~6.283 */`
* `(pow value...)`\
`(** value...)`
  * Synopsis: Returns the receiver progressively raised to the power of each supplied value.
* `(random)`
  * Synopsis: Returns a (non-cryptographically-secure\!) random number on the interval `[0, receiver)` if receiver is positive or `(receiver, 0]` if receiver is negative.
* `(round)`
  * Synopsis: Returns the receiver rounded to the nearest integer.
* `(rshf value)`
  * Synopsis: Returns the receiver right-shifted by value.
* `(sign)`
  * Synopsis: Returns \-1, 0, or 1 depending on whether the receiver is negative, zero, or positive.
* `(sin)`
  * Synopsis: Returns the sine of the receiver (in radians).
* `(sinh)`
  * Synopsis: Returns the hyperbolic sine of the receiver.
* `(sqrt)`
  * Synopsis: Returns the square-root of the receiver.
* `(sqrt2)`
  * Synopsis: Returns the square-root of 2, multiplied by the receiver.
  * `1(sqrt2) // ~1.414`
* `(sub value...)`\
`(- value...)`
  * Synopsis: Returns the receiver minus all of the supplied values.
* `(tan)`
  * Synopsis: Returns the tangent of the receiver (in radians).
* `(tanh)`
  * Synopsis: Returns the hyperbolic tangent of the receiver.
* `(toNumber)`
  * Synopsis: Returns the receiver's underlying JavaScript number (or bigint)
* `(toString)`
  * Synopsis: Returns the receiver's underlying number as a string.
* `(valueOf)`
  * Synopsis: Returns the receiver's underlying JavaScript number (or bigint)
* `(xor value...)`
  * Synopsis: Returns the bit-wise XOR of the receiver and the specified values.
* `(zfrs value)`
  * Synopsis: Returns the receiver zero-fill-right-shifted by value.
