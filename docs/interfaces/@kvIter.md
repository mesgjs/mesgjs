# Mesgjs @kvIter Interface

* @c(get @kvIter)  
  * Synopsis: Gets a new @kvIter list iteration instance.  
* (for source index=indexBlock named=namedBlock bothBlock collect=@f else=elseBlock)  
  * Synopsis: Iterates, moving *forward* through the source, from the beginning to the end.  
  * RIC values: index, named, bothBlock, elseBlock  
  * If the current key is an index key (non-negative integer), the indexBlock is run.  
  * If the current key is a named key (not an index key), the namedBlock is run.  
  * If the bothBlock is present, it is run for every key (after the applicable index or named block, if present).  
  * If there are no keys in the source and the elseBlock is present, it is evaluated and its value is returned instead.  
  * If collect is @f (the default), the last executed block (or (next) or (stop)) return value is returned.  
  * If collect is @t, all of the block, (next), and (stop) return values are collected and returned as a list.  
* (isIndex)  
  * Synopsis: Returns @t for index (non-negative integer) keys and @f for other (named) keys.  
* (key)  
  * Synopsis: Returns the current key.  
* (next result=value)  
  * Synopsis: Starts the next iteration (next or previous key, depending on iteration direction).  
  * RIC values: none  
  * If the optional result parameter is present, its value becomes, or adds to (when collect is JS-true), the overall return value.   
* (rev source index=indexBlock named=namedBlock bothBlock collect=@f else=elseBlock)  
  * Synopsis: Iterates, moving in *reverse* through the source, from the end to the beginning.  
  * RIC values: index, named, bothBlock, elseBlock  
  * Works just like (for), except for the direction of iteration.  
* (stop result=value)  
  * Synopsis: Stops iteration.  
  * RIC values: none  
  * If the optional result parameter is present, its value becomes, or adds to (when collect is JS-true), the overall return value.  
* (value)  
  * Synopsis: Returns the current value.

# Examples

%(nset i1=@c(get @kvIter))  
%i1(for \[greeting=hello 42\] { @c(log %i1(key) %i1(isIndex) %i1(value)) })  
// greeting false hello  
// 0 true 42  
