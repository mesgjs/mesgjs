import 'mesgjs/runtime/mesgjs.esm.js';
import { assertEqual, testModule, testSummary } from 'mesgjs/test/test.esm.js';

export const version = '1.0.0<2.0.0 :@promise/mesgjs';

export default async function runTests() {
  await testModule('@promise, Mesgjs messages', `
    // Create a new promise
    #(nset p1=@c(get @promise))
    @gss(nset s1=#p1(state))

    // Resolve the promise, then check state and result
    #p1(resolve 42)
    #p1(then {
      @gss(nset s2=#p1(state) r2=#p1(result))
    })

    // Create a pre-resolved promise
    #(nset p3=@c(get @promise init=[resolve='shortcut']))
    #p3(then {
      @gss(nset s3=#p3(state) r3=#p3(result))
    })

    // Create a pre-rejected promise
    #(nset p4=@c(get @promise init=[reject='rejected']))
    #p4(catch {
      @gss(nset s4=#p4(state) r4=#p4(message))
    })

    // Test then
    #(nset p5=@c(get @promise))
    #(nset p6=#p5(then { !resolve(add 1) !}(fn)))
    #p5(resolve 98)
    #p6(then { @gss(nset r6=#p6(result)) })

    // Test catch
    #(nset p7=@c(get @promise))
    #(nset p8=#p7(catch { !message !}(fn)))
    #p7(reject 'catch-me')
    #p8(then { @gss(nset r8=!resolve) }(fn))
  `, async mod => {
    await new Promise(r => setTimeout(r, 100)); // wait for promises

    assertEqual($gss.at('s1'), 'pending');
    assertEqual($gss.at('s2'), 'fulfilled');
    assertEqual($gss.at('r2'), 42);
    assertEqual($gss.at('s3'), 'fulfilled');
    assertEqual($gss.at('r3'), 'shortcut');
    assertEqual($gss.at('s4'), 'rejected');
    assertEqual($gss.at('r4'), 'rejected');
    assertEqual($gss.at('r6'), 99);
    assertEqual($gss.at('r8'), 'catch-me');
  });

  await testModule('@promise, Mesgjs messages (all/any/race)', `
    #(nset pa1=@c(get @promise init=[resolve=1]))
    #(nset pa2=@c(get @promise init=[resolve=2]))
    #(nset pa3=@c(get @promise init=[reject='no']))

    // all - success
    @c(get @promise)(all #pa1 #pa2)(then { @gss(nset rAllS=!resolve) }(fn))

    // all - failure
    @c(get @promise)(all #pa1 #pa3)(catch { @gss(nset rAllF=!message) }(fn))

    // allSettled
    @c(get @promise)(allSettled #pa1 #pa3)(then { @gss(nset rAs=!resolve) }(fn))
    
    // any - success
    @c(get @promise)(any #pa3 #pa2)(then { @gss(nset rAnyS=!resolve) }(fn))

    // race - success
    @c(get @promise)(race #pa3 #pa1)(then { @gss(nset rRaceS=!resolve) }(fn))

  `, async mod => {
    await new Promise(r => setTimeout(r, 100)); // wait for promises
    const rAllS = $gss.at('rAllS');
    assertEqual(rAllS.at(0), 1);
    assertEqual(rAllS.at(1), 2);
    assertEqual($gss.at('rAllF'), 'no');
    
    const rAs = $gss.at('rAs');
    assertEqual(rAs.at(0).status, 'fulfilled');
    assertEqual(rAs.at(0).value, 1);
    assertEqual(rAs.at(1).status, 'rejected');
    assertEqual(rAs.at(1).reason.message, 'no');

    assertEqual($gss.at('rAnyS'), 2);
    assertEqual($gss.at('rRaceS'), 1);
  });
}

if (!globalThis.testRunner) {
  await runTests();
  testSummary();
}