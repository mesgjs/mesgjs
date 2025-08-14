import {
    assertEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import '../../src/runtime/mesgjs.esm.js';
import { loadMesgjsModuleSource } from "../harness.esm.js";

Deno.test("Storage Systems", async (t) => {
    const $gss = globalThis.$gss;

    await t.step("should handle @gss (global shared storage)", async () => {
	await loadMesgjsModuleSource(
	    `@gss(nset gss=1 gssCBR=@u gssFBF=@u gssFBC=@u)
	    { @gss(nset gssCBR=2) }(run)
	    { @gss(nset gssFBF=%f gssFBC=!c) }(fn f=3)(call c=4)`
	);
	assertEquals($gss.at("gss"), 1);
	assertEquals($gss.at("gssCBR"), 2);
	assertEquals($gss.at("gssFBF"), 3);
	assertEquals($gss.at("gssFBC"), 4);
    });

    await t.step("should handle @mps, %, and # storage", async () => {
	await loadMesgjsModuleSource(
	    `@gss(nset mod=@mps(at mod else=2))
	    %*(nset gssFromOp=1)
	    %/(nset mpsFromOp=2)
	    @mps(nset mps=3)
	    %(nset ps=4)
	    #(nset ts=5)
	    @gss(nset mSLID=@mps(toSLID) pSLID=%(toSLID) tSLID=#(toSLID))`
	);
	assertEquals($gss.at("mod"), 2);
	assertEquals($gss.at("gssFromOp"), 1);
	assertEquals($gss.at("mSLID"), '[(mpsFromOp=2 mps=3 ps=4)]');
	assertEquals($gss.at("pSLID"), '[(mpsFromOp=2 mps=3 ps=4)]');
	assertEquals($gss.at("tSLID"), '[(ts=5)]');
    });

});