# Mesgjs @code Interface

There are no RIC values in this interface.

* (fn params…)  
  * Synopsis: Returns an @function object instance for the associated code block  
  * Any parameters become the % (persistent state) of the @function object.  
* (run)  
  * Synopsis: Executes the associated code block

# Mesgjs @function Interface

There are no RIC values in this interface.

* (call params…)  
  * Synopsis: Executes the @function's associated code, passing any parameters (accessible via the \! namespace)  
* (fn params…)  
  * Synopsis: Returns a new @function object instance for the associated code block  
  * (Works the same way as (fn) on the original @code object.)  
* (jsfn)  
  * Synopsis: Returns a raw JavaScript function that will send a (call) message (with any supplied parameters) to the @function object.