# Mesgjs @reactive Interface

Reactive values in Mesgjs are similar to spreadsheet cells. They may be assigned either a static value, or a "def" (a definition, like a spreadsheet formula) that is used to calculate the value. Changes to reactive values automatically trigger recalculations of any other reactive values whose definitions depend on the modified values.

Derived values are normally only recalculated if used in the definitions of other values or directly accessed ("lazy evaluation"), but this may be overridden by setting specifying that recalculation should be "eager".

* (@init reactive cmp=cmpBlock def=defBlock eager=bool v=value)  
  * Synopsis: Initializer. Wraps a new (or optional existing) reactive JavaScript object.  
  * RIC values: cmp, def  
  * When wrapping a new reactive, the comparison block, def(inition) block, eagerness, and initial value may optionally be supplied.  
* (@jsv)  
  * Synopsis: Returns the underlying JavaScript reactive object.  
* (batch block)  
  * Synopsis: (run) the block, deferring reactive recalculations until the end of the batch (and any enclosing batches) as much as possible, and return the result.  
  * RIC values: block  
* (def)  
  * Synopsis: Returns the current def(inition) JavaScript function, or @u (undefined) if currently set to a static value.  
  * As a JavaScript function, this is probably mostly useful as a boolean-like, set/not-set value in Mesgjs.  
* (eager)  
  * Synopsis: Returns @t (true) if def(ined) values are set to be eagerly recalculated, otherwise returns @f (false).  
  * By default, def(ined) values are recalculated lazily, unless consumed by other reactive calculations.  
* (error)  
  * Synopsis: If a def(ined) value calculation generated an exception (or error), this operation will return it; otherwise it returns @u (undefined)  
* (fv)  
  * Synopsis: Traverses any chained reactive values and returns the final, non-reactive, value.  
* (rio)  
  * Synopsis: Returns a RIO (reactive interface object) based on the current reactive.  
  * A RIO is used to provide limited reactive support to other objects (e g., @list) in an implementation-independent manner.  
* (rv)  
  * Synopsis: Reads and returns the current value (either static, or calculated from the def(inition)).  
* (set)  
  * Synopsis: Updates the reactive value's properties.
  * Parameters can include `def=defBlock`, `eager=bool`, and `v=value` (or a positional value).
* (untr block)  
  * Synopsis: (run) the block, untracked (without recording reactive dependencies), and return the result.  
  * RIC values: block