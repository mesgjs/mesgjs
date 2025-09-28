import {
	assertEquals,
	assert,
	assertThrows,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { getInterface, getInstance, typeAccepts, typeChains } from "../../src/runtime/runtime.esm.js";

Deno.test("Interface System", async (t) => {
	const supertypeName = "supertype";
	const supertype = getInterface(supertypeName);
	supertype.set({
		handlers: {
			"ping": () => "pong",
			"@default": () => "default-response",
		}
	});

	const subtypeName = "subtype";
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

Deno.test("Interface instance attribution", async (t) => {
	// This will receive sr and st from the sender
	const inspectorInterface = getInterface("inspector");
	inspectorInterface.set({
		handlers: {
			"@init": (d) => {
				$gss.set("sr", d.sr);
				$gss.set("st", d.st);
			},
		},
	});

	// This will send the (instance) message
	const senderInterface = getInterface("sender");
	senderInterface.set({
		handlers: {
			"createInspector": (d) => {
				const inspectorIface = getInterface("inspector");
				// Attributed send of (instance) to the interface object
				return d.sm(inspectorIface, "instance");
			},
		},
	});

	await t.step("should pass sender context to @init", () => {
		$gss.clear(); // Ensure clean storage

		const senderInstance = getInstance("sender");
		senderInstance("createInspector");

		const sr = $gss.at("sr");
		const st = $gss.at("st");

		assertEquals(sr, senderInstance, "Sender reference (sr) should be the sender instance");
		assertEquals(st, "sender", "Sender type (st) should be 'sender'");
	});
});

Deno.test("Interface Attributes", async (t) => {
	await t.step("abstract interface should not be instantiable", () => {
		const abstractName = "abstractType";
		const abstractType = getInterface(abstractName);
		abstractType.set({ abstract: true });
		assertThrows(() => getInstance(abstractName), TypeError, 'Cannot get instance for abstract Mesgjs interface "abstractType"');
	});

	await t.step("final interface should not be chainable", () => {
		const finalName = "finalType";
		const finalType = getInterface(finalName);
		finalType.set({ final: true });

		const subFinalName = "subFinalType";
		const subFinalType = getInterface(subFinalName);
		assertThrows(() => subFinalType.set({ chain: [finalName] }), TypeError, `Mesgjs interface "subFinalType" tries to extend final interface "finalType"`);
	});

	await t.step("locked interface should not be configurable", () => {
		const lockedName = "lockedType";
		const lockedType = getInterface(lockedName);
		lockedType.set({ lock: true });
		assertThrows(() => lockedType.set({ handlers: { "a": () => "b" } }), TypeError, `Cannot change locked Mesgjs interface "lockedType"`);
	});

	await t.step("instantiated interface should not be configurable", () => {
		const instName = "instType";
		const instType = getInterface(instName);
		instType.set({ handlers: { "a": () => "b" } });
		getInstance(instName);
		assertThrows(() => instType.set({ handlers: { "c": () => "d" } }), TypeError, `Cannot change locked Mesgjs interface "instType"`);
	});

	await t.step("once interface should not be gettable more than once", () => {
		const onceName = "onceType";
		const onceType = getInterface(onceName);
		onceType.set({ once: true });
		assert(getInterface(onceName) === undefined);
	});

	await t.step("pristine interface must be new", () => {
		const pristineName = "pristineType";
		const pristineType = getInterface(pristineName);
		pristineType.set({}); // Make it not pristine
		assertThrows(() => pristineType.set({ pristine: true }), TypeError, `Mesgjs interface "pristineType" is not pristine`);
	});

	await t.step("private interface should only be instantiable by the interface object", () => {
		const privateName = "privateType";
		const privateType = getInterface(privateName);
		privateType.set({ private: true });
		assertEquals(getInstance(privateName), undefined);
		assert(privateType.instance());
	});

	await t.step("singleton interface should only create one instance", () => {
		const singletonName = "singletonType";
		const singletonType = getInterface(singletonName);
		singletonType.set({ singleton: true });
		const inst1 = getInstance(singletonName);
		const inst2 = getInstance(singletonName);
		assert(inst1 === inst2);
	});
});
