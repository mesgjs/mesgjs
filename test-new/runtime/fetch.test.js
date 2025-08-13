import {
    assertEquals,
    assert,
    assertRejects,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import { stub } from "https://deno.land/std@0.152.0/testing/mock.ts";
import { calcIntegrity, fetchModule } from "../../src/runtime/runtime.esm.js";

const testContent = "export const value = 42;";
const testContentBuffer = new TextEncoder().encode(testContent);
const testContentSha512 = "sha512-Jjmwazwmg67EwNPViCBwvSIxhENfS6gwufXoQLrB0B/JDA4v1p+p2S5Y6IGP4SzZqqVTsROlU8meD6ep3q6MTA==";

Deno.test("calcIntegrity", async () => {
    const Deno_readFile_stub = stub(Deno, "readFile", () => Promise.resolve(testContentBuffer));
    try {
	const integrity = await calcIntegrity("local/module.js");
	assertEquals(integrity, testContentSha512);
    } finally {
	Deno_readFile_stub.restore();
    }
});

Deno.test("fetchModule", async (t) => {
    await t.step("should fetch and decode a local module", async () => {
	const Deno_readFile_stub = stub(Deno, "readFile", () => Promise.resolve(testContentBuffer));
	try {
	    const content = await fetchModule("local/module.js");
	    assertEquals(content, testContent);
	} finally {
	    Deno_readFile_stub.restore();
	}
    });

    await t.step("should fetch a local module without decoding", async () => {
	const Deno_readFile_stub = stub(Deno, "readFile", () => Promise.resolve(testContentBuffer));
	try {
	    const content = await fetchModule("local/module.js", { decode: false });
	    assertEquals(content, testContentBuffer);
	} finally {
	    Deno_readFile_stub.restore();
	}
    });

    await t.step("should reject for non-existent local module", async () => {
	const Deno_readFile_stub = stub(Deno, "readFile", () => Promise.resolve(null));
	try {
	    await assertRejects(
		() => fetchModule("non-existent.js"),
		Error,
		'fetchModule: File "non-existent.js" not found'
	    );
	} finally {
	    Deno_readFile_stub.restore();
	}
    });

});