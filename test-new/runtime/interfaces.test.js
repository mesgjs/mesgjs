import {
    assertEquals,
    assert,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { getInterface, getInstance, typeAccepts, typeChains } from "../../src/runtime/runtime.esm.js";

Deno.test("Interface System", async (t) => {
    const supertypeName = "iface-supertype";
    const supertype = getInterface(supertypeName);
    supertype.set({
	handlers: {
	    "ping": () => "pong",
	    "@default": () => "default-response",
	}
    });

    const subtypeName = "iface-subtype";
    const subtype = getInterface(subtypeName);
    subtype.set({
	chain: [supertypeName],
	handlers: {
	    "knock": () => "who's there?",
	}
    });

    await t.step("getInterface should return an interface object", () => {
	assert(supertype, "Interface object should be returned");
	assertEquals(supertype.ifName, supertypeName);
    });

    await t.step("getInstance should create a new object instance", () => {
	const instance = getInstance(supertypeName);
	assert(instance, "Instance should be created");
	assertEquals(instance.msjsType, supertypeName);
    });

    await t.step("instance should respond to messages", () => {
	const instance = getInstance(supertypeName);
	const result = instance("ping");
	assertEquals(result, "pong");
    });

    await t.step("typeAccepts (2-param) should identify handlers", () => {
	assertEquals(typeAccepts(supertypeName, "ping"), [supertypeName, 'specific']);
	assertEquals(typeAccepts(supertypeName, "unknown"), [supertypeName, 'default']);
	assertEquals(typeAccepts(subtypeName, "ping"), [supertypeName, 'specific']);
	assertEquals(typeAccepts(subtypeName, "knock"), [subtypeName, 'specific']);
    });

    await t.step("typeAccepts (1-param) should list all handlers", () => {
	const superHandlers = typeAccepts(supertypeName);
	assert(superHandlers.includes("ping"));
	assert(superHandlers.includes("@default"));

	const subHandlers = typeAccepts(subtypeName);
	assert(subHandlers.includes("knock"));
    });

    await t.step("typeChains (2-param) should resolve inheritance", () => {
	assertEquals(typeChains(subtypeName, supertypeName), true);
	assertEquals(typeChains(supertypeName, subtypeName), false);
    });

    await t.step("typeChains (1-param) should list chained interfaces", () => {
	const chains = typeChains(subtypeName);
	assertEquals(chains, [supertypeName]);
    });
});