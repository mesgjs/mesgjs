// Storage/namespace testing

import { loadModuleCode, test, testAsync, testReturns, testSummary, testTranspile } from 'syscl/test.esm.js';

await (async () => {
    let txp;
    if ((txp = testTranspile('@gss txp',
`@gss(nset gss=1 gssCBR=@u gssFBF=@u gssFBC=@u) @mps(nset mod=1)
{ @gss(nset gssCBR=2) }(run)
{ @gss(nset gssFBF=%f gssFBC=!c) }(fn f=3)(call c=4)`)) &&
      await testAsync('@gss load', () => loadModuleCode(txp.code))) {
	testReturns('@gss gss', () => $gss.at('gss'), 1);
	testReturns('@gss (run)', () => $gss.at('gssCBR'), 2);
	testReturns('@gss (fn %)', () => $gss.at('gssFBF'), 3);
	testReturns('@gss (call !)', () => $gss.at('gssFBC'), 4);
    }
})();

await (async () => {
    let txp;
    if ((txp = testTranspile('@mps/ps/ts txp',
`@gss(nset mod=@mps(at mod else=2))
@mps(nset mps=3) %(nset ps=4) #(nset ts=5)
@gss(nset mSLID=@mps(toSLID) pSLID=%(toSLID) tSLID=#(toSLID))`)) &&
      await testAsync('@m/p/t load', () => loadModuleCode(txp.code))) {
	testReturns('@m/p/t mod', () => $gss.at('mod'), 2);
	testReturns('@m/p/t mSLID', () => $gss.at('mSLID'), '[(mps=3 ps=4)]');
	testReturns('@m/p/t pSLID', () => $gss.at('pSLID'), '[(mps=3 ps=4)]');
	testReturns('@m/p/t tSLID', () => $gss.at('tSLID'), '[(ts=5)]');
    }
})();

testSummary();
