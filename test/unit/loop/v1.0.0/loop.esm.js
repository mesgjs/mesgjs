import { assertEqual, testModule, testSummary } from 'syscl/test.esm.js';

export const version = '1.0.0<2.0.0 :loop';

export default async function runTests() {
  // 1. Loop Initialization
  await testModule('loop initialization', `
    #(nset l1=@c(get @loop))
    @gss(nset type=@c(type #l1))
  `, mod => {
    assertEqual($gss.at('type'), '@loop');
  });

  // 2. Fixed-Count Loop Execution (run)
  await testModule('loop run with times=0', `
    #(nset l2=@c(get @loop))
    @gss(nset result=#l2(run { executed !} times=0))
  `, mod => {
    assertEqual($gss.at('result'), undefined);
  });

  await testModule('loop run with times=3 and collect=@f', `
    #(nset l3=@c(get @loop))
    @gss(nset result=#l3(run { #l3(num1) !} times=3 collect=@f))
  `, mod => {
    assertEqual($gss.at('result'), 3);
  });

  await testModule('loop run with times=3 and collect=@t', `
    #(nset l4=@c(get @loop))
    #(nset result=#l4(run { #l4(num1) !} times=3 collect=@t))
    @gss(nset slidResult=#result(toSLID))
  `, mod => {
    assertEqual($gss.at('slidResult'), '[(1 2 3)]');
  });

  // 3. Loop Control Methods
  await testModule('loop run with next result override', `
    #(nset l5=@c(get @loop))
    #(nset result=#l5(run { #l5(next result='override') !} times=2 collect=@t))
    @gss(nset slidResult=#result(toSLID))
  `, mod => {
    assertEqual($gss.at('slidResult'), '[(override override)]');
  });

  await testModule('loop run with stop result override', `
    #(nset l6=@c(get @loop))
    #(nset result=#l6(run {
      @c(if { #l6(num)(eq 1) !} { #l6(stop result='stopped') })
      #l6(num1) !}
    times=5 collect=@t))
    @gss(nset slidResult=#result(toSLID))
  `, mod => {
    assertEqual($gss.at('slidResult'), '[(1 stopped)]');
  });

  // 4. Loop State Introspection
  await testModule('loop state introspection', `
    #(nset l7=@c(get @loop))
    #(nset result=#l7(run {
      [ #l7(num) #l7(num1) #l7(rem) #l7(rem1) #l7(times) ] !}
    times=2 collect=@t))
    @gss(nset slidResult=#result(toSLID))
  `, mod => {
    assertEqual($gss.at('slidResult'), '[(0 1 1 2 2 1 2 0 1 2)]');
  });

  // 5. Conditional Loop Execution (while)
  await testModule('loop while with pre condition', `
    #(nset l8=@c(get @loop) counter=0)
    #(nset result=#l8(while pre={ #counter(lt 3) !} {
      #(nset counter=#counter(add 1))
      #counter !}
    collect=@t))
    @gss(nset slidResult=#result(toSLID))
  `, mod => {
    assertEqual($gss.at('slidResult'), '[(1 2 3)]');
  });

  await testModule('loop while with pre, mid, post conditions and extraBlock', `
    #(nset l9=@c(get @loop) counter=0)
    #(nset result=#l9(while
      pre={ #counter(lt 5) !}
      { #counter !}
      mid={ #counter(lt 4) !}
      { #(nset counter=#counter(add 1)) !}
      post={ #counter(lt 5) !}
    collect=@t))
    @gss(nset slidResult=#result(toSLID))
  `, mod => {
    assertEqual($gss.at('slidResult'), '[(0 1 2 3 4)]');
  });

  // 6. Nested Loops
  await testModule('nested loops with SLID comparison', `
    #(nset outer=@c(get @loop) inner=@c(get @loop))
    #(nset result=#outer(run {
      #inner(run { [ #outer(num1) #inner(num1) ] !} times=2 collect=@t) !}
    times=2 collect=@t))
    @gss(nset slidResult=#result(toSLID))
  `, mod => {
    assertEqual($gss.at('slidResult'), '[(1 1 1 2 2 1 2 2)]');
  });
}

if (!globalThis.testRunner) {
  await runTests();
  testSummary();
}

