import { describe, it } from '@compat/test';
import { assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { loadMesgjsModuleSource } from '../harness.esm.js';

describe('Storage Systems', () => {
	const $gss = globalThis.$gss;

	it('should handle @gss (global shared storage)', async () => {
		await loadMesgjsModuleSource(
			`@gss(nset gss=1 gssCBR=@u gssFBF=@u gssFBC=@u)
			{ @gss(nset gssCBR=2) }(run)
			{ @gss(nset gssFBF=%f gssFBC=!c) }(fn f=3)(call c=4)`
		);
		assertStrictEquals($gss.at('gss'), 1);
		assertStrictEquals($gss.at('gssCBR'), 2);
		assertStrictEquals($gss.at('gssFBF'), 3);
		assertStrictEquals($gss.at('gssFBC'), 4);
	});

	it('should handle @mps, %, and # storage', async () => {
		await loadMesgjsModuleSource(
			`@gss(nset mod=@mps(at mod else=2))
			%*(nset gssFromOp=1)
			%/(nset mpsFromOp=2)
			@mps(nset mps=3)
			%(nset ps=4)
			#(nset ts=5)
			@gss(nset mSLID=@mps(toSLID) pSLID=%(toSLID) tSLID=#(toSLID))`
		);
		assertStrictEquals($gss.at('mod'), 2);
		assertStrictEquals($gss.at('gssFromOp'), 1);
		assertStrictEquals($gss.at('mSLID'), '[(mpsFromOp=2 mps=3 ps=4)]');
		assertStrictEquals($gss.at('pSLID'), '[(mpsFromOp=2 mps=3 ps=4)]');
		assertStrictEquals($gss.at('tSLID'), '[(ts=5)]');
	});
});
