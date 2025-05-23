import { assertEqual, testModule, testSummary } from 'syscl/test.esm.js';

export const version = '1.0.0<2.0.0 :return-behavior';

export default async function runTests() {
  await testModule('implicit return from { ... !} block', `
    #(nset f={ #(nset x=3 y=4) #x(add #y) !}(fn))
    @gss(nset result=#f(call))
  `, mod => {
    assertEqual($gss.at('result'), 7);
  });

  await testModule('explicit @d(return) from block', `
    #(nset f={
      #(nset x=2 y=5)
      @d(return #x(mul #y))
      #(nset z=999)  // Should never be reached
    }(fn))
    @gss(nset result=#f(call))
    @gss(nset z=#?z)  // Safely test if #z was set (should be @u)
  `, mod => {
    assertEqual($gss.at('result'), 10);
    assertEqual($gss.at('z'), $u); // z should be undefined
  });

  await testModule('return @u explicitly', `
    #(nset f={ @d(return @u) }(fn))
    @gss(nset result=#f(call))
  `, mod => {
    assertEqual($gss.at('result'), $u);
  });
}

if (!globalThis.testRunner) {
    await runTests();
    testSummary();
}

// END
