import 'mesgjs/runtime/mesgjs.esm.js';
import { assertEqual, testModule, testSummary } from 'mesgjs/test/test.esm.js';

export const version = '1.0.0<2.0.0 :logical-ops';

export default async function runTests() {
    await testModule('logical AND via @c', `
    #(nset a1=1 a2=0 a3='hello' a4='' a5=@u a6=@t a7=@f)

    @gss(nset r1=@c(and #a1 #a3))       // 1 and 'hello' => 'hello'
    @gss(nset r2=@c(and #a1 #a2))       // 1 and 0 => 0
    @gss(nset r3=@c(and #a6 #a3))       // @t and 'hello' => 'hello'
    @gss(nset r4=@c(and #a7 #a3))       // @f and 'hello' => @f
  `, mod => {
	assertEqual($gss.at('r1'), 'hello');
	assertEqual($gss.at('r2'), 0);
	assertEqual($gss.at('r3'), 'hello');
	assertEqual($gss.at('r4'), false);
    });

    await testModule('logical OR via @c', `
    #(nset a1=1 a2=0 a3='hello' a4='' a5=@u a6=@t a7=@f)

    @gss(nset r1=@c(or #a2 #a3))        // 0 or 'hello' => 'hello'
    @gss(nset r2=@c(or #a4 #a5))        // '' or @u => @u
    @gss(nset r3=@c(or #a7 #a3))        // @f or 'hello' => 'hello'
    @gss(nset r4=@c(or #a6 #a3))        // @t or 'hello' => @t
  `, mod => {
	assertEqual($gss.at('r1'), 'hello');
	assertEqual($gss.at('r2'), $u);
	assertEqual($gss.at('r3'), 'hello');
	assertEqual($gss.at('r4'), true);
    });

    await testModule('logical NOT via @c', `
    #(nset a1=1 a2=0 a3='hello' a4='' a5=@u a6=@t a7=@f)

    @gss(nset r1=@c(not #a3))           // not 'hello' => false
    @gss(nset r2=@c(not #a2))           // not 0 => true
    @gss(nset r3=@c(not #a6))           // not @t => false
    @gss(nset r4=@c(not #a7))           // not @f => true
  `, mod => {
	assertEqual($gss.at('r1'), false);
	assertEqual($gss.at('r2'), true);
	assertEqual($gss.at('r3'), false);
	assertEqual($gss.at('r4'), true);
    });
}

if (!globalThis.testRunner) {
  await runTests();
  testSummary();
}

// END
