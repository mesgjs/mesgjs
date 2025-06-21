# Mesgjs @loop Interface

* @c(get @loop)  
  * Synopsis: Get a new loop instance.  
* (next result=value)  
  * Synopsis: Starts the next iteration.  
  * RIC values: none  
  * If the optional result parameter is present, its value becomes, or adds to (when collect is JS-true), the overall return value.   
* (num)  
  * Synopsis: Returns the 0-origin (starting-perspective) loop-number.  
  * Effectively, the number of loops already completed *at the start* of the current loop.  
  * What to remember: In the **first loop**, this is **0** (no loops completed yet *at the start* of the first loop).  
* (num1)  
  * Synopsis: Returns the 1-origin (ending-perspective) loop number.  
  * Effectively, the number of loops that will have been completed *by the end* of the current loop.  
  * What to remember: In the **first loop**, this is **1** (one loop completed *by the end* of the first loop).  
* (rem)  
  * Synopsis: Returns the (ending-perspective) number of (run) loops remaining.  
  * Effectively, the number of loops that will still be remaining *by the end* of the current loop.  
  * What to remember: In the **final loop**, this is **0** (no more loops remaining *by the end* of this final loop).  
* (rem1)  
  * Synopsis: Returns the (starting-perspective) number of (run) loops remaining.  
  * Effectively, the number of loops remaining *at the start* of the current loop.  
  * What to remember: In the **final loop**, this is **1** (there is one loop remaining to complete *at the start* of this final loop).  
* (run block times=n collect=@f)  
  * Synopsis: Run a block a fixed number of times.  
  * RIC values: block  
  * Runs block, times times (default: 1).  
  * If the collect parameter is JS-true, all the iteration results (block, next, stop) are returned as a list.  
  * If the collect parameter is JS-false (the default), the last block result is returned unless overridden by a next or stop result value..  
* (stop result=value)  
  * Synopsis: Stops iteration  
  * RIC values: none  
  * If the optional result parameter is present, its value becomes, or adds to (when collect is JS-true), the overall return value.  
* (times)  
  * Synopsis: Returns the total planned number of (run) loop iterations based on the times parameter..  
  * The actual number of loop iterations may be less if an error occurs or if loop iteration is stopped early via (stop).  
* (while pre=test mainBlock post=test collect=@f)  
  (while pre=test mainBlock mid=test extraBlock post=test collect=@f)  
  * Synopsis: Runs the code block(s) while conditions test JS-true.  
  * RIC values: all  
  * The pre\-test (default: true) is evaluated first. If JS-true, the mainBlock is run.  
  * The value of the mainBlock is set as (if collect is JS-false, the default), or added to (if collect is JS-true), the overall result.  
  * If there is an extraBlock, the mid\-test (default: true) is evaluated next. If JS-false, all further execution stops. This test is inactive (ignored) if the extraBlock is absent (use the post\-test instead if you need post-mainBlock testing).  
  * If there is an extraBlock, the extraBlock is run. It is intended for intra-iteration side effects. Its block return-value, if any, is ignored, but a (next result) or (stop result) in the extraBlock will still be respected.  
  * The post\-test (default: true) is evaluated next. If JS-true, iteration will continue, otherwise iteration will stop.  
  * At least one *active* test must be present or the loop will not run.  
  * If the collect parameter is JS-true, all the iteration results (mainBlock, next, stop) are returned as a list.  
  * If the collect parameter is JS-false (the default), the last mainBlock result is returned unless overridden by a next or stop result value.

# Examples

%(nset l1=@c(get @loop))  
%l1(run { @c(log %l1(num) %l1(num1) %l1(rem) %l1(rem1)) } times=2)  
// 0 1 1 2  
// 1 2 0 1

%(nset l2=@c(get @loop))  
%l2(while { @c(log %l2(num) %l2(num1)) %l2(num1)(mul 2\) \!} mid={ %l2(num)(lt 2\) \!} { %l2(next result='/') } collect=@t)(toString)  
// 0 1; 1 2; 2 3  
// \[(2 '/' 4 '/' 6)\]  
