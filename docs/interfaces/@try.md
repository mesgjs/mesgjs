# Mesgjs @try Interface

* @c(get @try)  
  * Synopsis: Get a new try/catch instance.  
* (error)  
  * Synopsis: Returns the caught exception, if any.  
  * Technically, an exception needn't be an error (Mesgjs, for example, often utilizes *flow exceptions*), but the base class for exceptions in JavaScript is the Error class, and "error" is less to type than "exception".  
* (message)  
  * Synopsis: Returns the message portion of the caught exception, if any.  
* (name)  
  * Synopsis: Returns the name portion of the caught exception, if any.  
  * Typically the JavaScript error class name, e.g. Error, ReferenceError, SyntaxError, TypeError, etc.  
* (next result=value)  
  * Synopsis: Stops the current main code block and starts the next one (if any), or stops the current exception handler..  
  * RIC values: none  
  * Equivalent to (stop) if used within an exception handler (no other handlers will be run).  
  * If the optional result parameter is present, it is used to update the return value.   
* (result)  
  * Synopsis: Returns the currently-pending result value.  
* (return value)  
  * Synopsis: Updates the result value to be returned without altering the flow of execution.  
  * RIC values: none  
* (stop result=value)  
  * Synopsis: Stops the current main code block or exception handler.  
  * RIC values: none  
  * If the optional result parameter is present, it is used to update the return value.  
* (try mainBlock… catchers=\[type=block…\] catch=block always=block)  
  * Synopsis: Runs one or more main blocks with the ability to handle an exception if one occurs.  
  * RIC values: all  
  * Runs each mainBlock, stopping at the first exception. No additional main blocks run after an exception.  
  * The last successfully-completed mainBlock result is returned unless subsequently overridden by a next, stop, or return result value.  
  * If there is a catchers parameter, it is interpreted as a list of type=handler values (in effect, a built-in switch/case for error types). Type comparisons use JavaScript instanceof. The first match is used.  
  * Since every JavaScript error is derived from the Error class, an Error=handler entry in catchers will handle all previously unhandled errors.  
  * If there is a catch parameter, its block is used to handle exceptions not handled via catchers.  
  * Unhandled exceptions will be re-thrown for handling elsewhere.  
  * If there is an always block, it is always run, whether an exception (either caught or uncaught) has occurred or not.

# Examples

%(nset t1=@c(get @try))  
%t1(try {} '1st ok' {} '1st and 2nd ok')  
// 1st and 2nd ok

%(nset t2=@c(get @try))  
%t2(try { @c(throw 'Catch me\!') } catch={ @c(log Caught %t2(name)(join :) %t2(message)) } always={ %t2(return "It's all good\!") })  
// Caught Error: Catch me\!  
// It's all good\!  
