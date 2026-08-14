import {
	assertEquals,
	assert,
	assertThrows,
	assertNotEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import "../../src/runtime/mesgjs.esm.js";
import { getInterface, getInstance, MsjsObject } from "../../src/runtime/runtime.esm.js";

// ---------------------------------------------------------------------------
// Test class: extends MsjsObject with constructor and ES2022 private fields.
// Captures the per-instance instantiation key so that JS-side methods can
// use MsjsObject.getJS / setJS / getNullDispatch / getPS to share state with the
// Mesgjs side (which uses d.js / d.p in handlers).
// ---------------------------------------------------------------------------
class MyWidget extends MsjsObject {
	#key; // per-instance instantiation key (Symbol)

	constructor (key, type) {
		super(key, type);
		this.#key = key;
	}

	// --- JS-side access to d.js-equivalent state ---
	getJSState () { return MsjsObject.getJS(this, this.#key); }
	setJSState (v) { MsjsObject.setJS(this, this.#key, v); }

	// --- JS-side access to a null dispatch (for d.js, d.p, etc.) ---
	getNullDispatch () { return MsjsObject.getNullDispatch(this, this.#key); }

	// --- JS-side access to persistent storage (d.p equivalent) ---
	getPSState () { return MsjsObject.getPS(this, this.#key); }

	// Expose key for direct authorization tests
	get keyForTest () { return this.#key; }
}

// ===================================================================
// 1. Class-with-constructor as proto
// ===================================================================
Deno.test("Class with constructor and private fields (proto)", async (t) => {
	const iface = getInterface(":?");
	iface.set({
		handlers: {
			"@init": (d) => {
				// Initialize JS state via d.js (Mesgjs side)
				d.js = { label: d.mp.at("label") || "default", count: 0 };
			},
			"getLabel": (d) => d.js?.label,
			"setLabel": (d) => { d.js = { ...d.js, label: d.mp.at(0) }; },
			"getCount": (d) => d.js?.count,
			"incCount": (d) => { d.js = { ...d.js, count: d.js.count + 1 }; return d.js.count; },
		},
		proto: MyWidget,
	});

	await t.step("instance should be of the custom class", () => {
		const inst = getInstance(iface.ifName);
		assert(inst instanceof MyWidget, "Instance should be instanceof MyWidget");
		assert(inst instanceof MsjsObject, "Instance should be instanceof MsjsObject");
		assertEquals(inst.msjsType, iface.ifName);
	});

	await t.step("constructor should be called (private fields initialized)", () => {
		const inst = getInstance(iface.ifName);
		// keyForTest accesses the private #key field; if the constructor
		// didn't run, this would be undefined.
		assertEquals(typeof inst.keyForTest, "symbol", "Constructor should have captured the key");
	});

	await t.step("each instance should have a unique key", () => {
		const a = getInstance(iface.ifName);
		const b = getInstance(iface.ifName);
		assertNotEquals(a.keyForTest, b.keyForTest, "Each instance gets a unique instantiation key");
	});
});

// ===================================================================
// 2. Bilingual state sharing: d.js (Mesgjs) <-> getJS/setJS (JS)
// ===================================================================
Deno.test("Bilingual state sharing: d.js <-> getJS/setJS", async (t) => {
	const iface = getInterface(":?");
	iface.set({
		handlers: {
			"@init": (d) => {
				d.js = { name: "init" };
			},
			// Mesgjs-side readers/writers (use d.js)
			"getViaDjs": (d) => d.js,
			"setViaDjs": (d) => { d.js = d.mp.at(0); },
		},
		proto: MyWidget,
	});

	await t.step("getJS should read state set by d.js in @init", () => {
		const inst = getInstance(iface.ifName);
		const state = inst.getJSState();
		assertEquals(state.name, "init", "JS-side getJS should see what @init set via d.js");
	});

	await t.step("setJS should write state readable by d.js", () => {
		const inst = getInstance(iface.ifName);
		inst.setJSState({ name: "from-js" });
		const viaDjs = $c.sm(inst, "getViaDjs");
		assertEquals(viaDjs.name, "from-js", "d.js should see what JS-side setJS wrote");
	});

	await t.step("d.js setter and getJS should see each other's writes", () => {
		const inst = getInstance(iface.ifName);

		// Mesgjs writes, JS reads
		$c.sm(inst, "setViaDjs", [{ name: "from-mesgjs" }]);
		assertEquals(inst.getJSState().name, "from-mesgjs");

		// JS writes, Mesgjs reads
		inst.setJSState({ name: "from-js-again" });
		assertEquals($c.sm(inst, "getViaDjs").name, "from-js-again");
	});

	await t.step("initial d.js state should be undefined before @init sets it", () => {
		const bareIf = getInterface(":?");
		bareIf.set({
			handlers: {},
			proto: MyWidget,
		});
		const inst = getInstance(bareIf.ifName);
		assertEquals(inst.getJSState(), undefined, "Without @init setting d.js, getJS returns undefined");
	});
});

// ===================================================================
// 3. getNullDispatch: JS-side access to dispatch properties
// ===================================================================
Deno.test("getNullDispatch provides dispatch access from JS", async (t) => {
	const iface = getInterface(":?");
	iface.set({
		handlers: {
			"@init": (d) => {
				d.js = { initialized: true };
				d.p.set("persistent-key", "persistent-value");
			},
			"setPersistent": (d) => { d.p.set(d.mp.at(0), d.mp.at(1)); },
			"getPersistent": (d) => d.p.at(d.mp.at(0)),
		},
		proto: MyWidget,
	});

	await t.step("null dispatch .rr should be the object", () => {
		const inst = getInstance(iface.ifName);
		const nd = inst.getNullDispatch();
		assertEquals(nd.rr, inst, "nd.rr should be the instance");
	});

	await t.step("null dispatch .rt should be the object type", () => {
		const inst = getInstance(iface.ifName);
		const nd = inst.getNullDispatch();
		assertEquals(nd.rt, iface.ifName, "nd.rt should be the interface name");
	});

	await t.step("null dispatch .js should mirror d.js / getJS state", () => {
		const inst = getInstance(iface.ifName);
		const nd = inst.getNullDispatch();

		// @init set d.js = { initialized: true }
		assertEquals(nd.js.initialized, true, "nd.js should see what @init set via d.js");

		// JS-side setJS should be visible via nd.js
		inst.setJSState({ updated: true });
		assertEquals(nd.js.updated, true, "nd.js should see what setJS wrote");

		// nd.js setter should be visible via getJS
		nd.js = { fromNullDispatch: true };
		assertEquals(inst.getJSState().fromNullDispatch, true, "getJS should see what nd.js setter wrote");
	});

	await t.step("null dispatch .js should be visible from Mesgjs handlers", () => {
		const iface2 = getInterface(":?");
		iface2.set({
			handlers: {
				"@init": (d) => { d.js = { fromInit: true }; },
				"getViaDjs": (d) => d.js,
			},
			proto: MyWidget,
		});

		const inst = getInstance(iface2.ifName);
		const nd = inst.getNullDispatch();

		// Write via null dispatch
		nd.js = { fromNullDispatch: true };

		// Read via Mesgjs handler
		const result = $c.sm(inst, "getViaDjs");
		assertEquals(result.fromNullDispatch, true, "d.js in handler should see what null dispatch wrote");
	});

	await t.step("null dispatch .p should provide persistent storage access", () => {
		const inst = getInstance(iface.ifName);
		const nd = inst.getNullDispatch();

		// @init set d.p.set("persistent-key", "persistent-value")
		assertEquals(nd.p.at("persistent-key"), "persistent-value",
			"nd.p should see what @init set via d.p");

		// Write via null dispatch .p
		nd.p.set("from-js", "js-value");

		// Read via Mesgjs handler
		assertEquals($c.sm(inst, "getPersistent", ["from-js"]), "js-value",
			"d.p in handler should see what null dispatch .p wrote");
	});

	await t.step("null dispatch .p writes should be visible from Mesgjs handlers", () => {
		const inst = getInstance(iface.ifName);
		const nd = inst.getNullDispatch();

		// Write via null dispatch
		nd.p.set("nd-key", "nd-value");

		// Read via handler
		assertEquals($c.sm(inst, "getPersistent", ["nd-key"]), "nd-value");
	});

	await t.step("null dispatch should be cached (same object on repeated calls)", () => {
		const inst = getInstance(iface.ifName);
		const nd1 = inst.getNullDispatch();
		const nd2 = inst.getNullDispatch();
		assert(nd1 === nd2, "Repeated getNullDispatch calls should return the same object");
	});

	await t.step("different instances should have different null dispatches", () => {
		const a = getInstance(iface.ifName);
		const b = getInstance(iface.ifName);
		assert(a.getNullDispatch() !== b.getNullDispatch(),
			"Different instances should have different null dispatches");
	});
});

// ===================================================================
// 4. getPS: JS-side access to persistent storage (d.p equivalent)
// ===================================================================
Deno.test("getPS provides persistent storage access from JS", async (t) => {
	const iface = getInterface(":?");
	iface.set({
		handlers: {
			"@init": (d) => {
				d.p.set("init-key", "init-value");
			},
			"setPersistent": (d) => { d.p.set(d.mp.at(0), d.mp.at(1)); },
			"getPersistent": (d) => d.p.at(d.mp.at(0)),
		},
		proto: MyWidget,
	});

	await t.step("getPS should JIT allocate storage if not yet initialized", () => {
		const bareIf = getInterface(":?");
		bareIf.set({
			handlers: {},
			proto: MyWidget,
		});
		const inst = getInstance(bareIf.ifName);
		const ps = inst.getPSState();
		assert(ps !== undefined, "getPS should return a NANOS instance");
		assertEquals(ps.at("nonexistent"), undefined, "Unset key should return undefined");
	});

	await t.step("getPS should read state set by d.p in @init", () => {
		const inst = getInstance(iface.ifName);
		const ps = inst.getPSState();
		assertEquals(ps.at("init-key"), "init-value", "JS-side getPS should see what @init set via d.p");
	});

	await t.step("getPS should write state readable by d.p", () => {
		const inst = getInstance(iface.ifName);
		const ps = inst.getPSState();
		ps.set("from-js", "js-value");
		const viaDp = $c.sm(inst, "getPersistent", ["from-js"]);
		assertEquals(viaDp, "js-value", "d.p should see what JS-side getPS wrote");
	});

	await t.step("d.p setter and getPS should see each other's writes", () => {
		const inst = getInstance(iface.ifName);

		// Mesgjs writes, JS reads
		$c.sm(inst, "setPersistent", ["from-mesgjs", "mesgjs-value"]);
		assertEquals(inst.getPSState().at("from-mesgjs"), "mesgjs-value");

		// JS writes, Mesgjs reads
		inst.getPSState().set("from-js-again", "js-value-again");
		assertEquals($c.sm(inst, "getPersistent", ["from-js-again"]), "js-value-again");
	});

	await t.step("getPS should return the same NANOS on repeated calls", () => {
		const inst = getInstance(iface.ifName);
		const ps1 = inst.getPSState();
		const ps2 = inst.getPSState();
		assert(ps1 === ps2, "Repeated getPS calls should return the same NANOS instance");
	});

	await t.step("different instances should have different persistent storage", () => {
		const a = getInstance(iface.ifName);
		const b = getInstance(iface.ifName);
		assert(a.getPSState() !== b.getPSState(),
			"Different instances should have different persistent storage");
	});
});

// ===================================================================
// 5. Authorization: getJS / setJS / getNullDispatch / getPS key checks
// ===================================================================
Deno.test("Authorization: key checks for getJS / setJS / getNullDispatch / getPS", async (t) => {
	const iface = getInterface(":?");
	iface.set({
		handlers: {},
		proto: MyWidget,
	});

	await t.step("getJS should throw with wrong key", () => {
		const inst = getInstance(iface.ifName);
		assertThrows(
			() => MsjsObject.getJS(inst, Symbol("wrong")),
			TypeError, "Unauthorized getJS",
		);
	});

	await t.step("getJS should throw with undefined/null key", () => {
		const inst = getInstance(iface.ifName);
		assertThrows(() => MsjsObject.getJS(inst, undefined), TypeError, "Unauthorized getJS");
		assertThrows(() => MsjsObject.getJS(inst, null), TypeError, "Unauthorized getJS");
	});

	await t.step("setJS should throw with wrong key", () => {
		const inst = getInstance(iface.ifName);
		assertThrows(
			() => MsjsObject.setJS(inst, Symbol("wrong"), "value"),
			TypeError, "Unauthorized setJS",
		);
	});

	await t.step("setJS should throw with undefined/null key", () => {
		const inst = getInstance(iface.ifName);
		assertThrows(() => MsjsObject.setJS(inst, undefined, "v"), TypeError, "Unauthorized setJS");
		assertThrows(() => MsjsObject.setJS(inst, null, "v"), TypeError, "Unauthorized setJS");
	});

	await t.step("getNullDispatch should throw with wrong key", () => {
		const inst = getInstance(iface.ifName);
		assertThrows(
			() => MsjsObject.getNullDispatch(inst, Symbol("wrong")),
			TypeError, "Unauthorized getNullDispatch",
		);
	});

	await t.step("getNullDispatch should throw with undefined/null key", () => {
		const inst = getInstance(iface.ifName);
		assertThrows(() => MsjsObject.getNullDispatch(inst, undefined), TypeError, "Unauthorized getNullDispatch");
		assertThrows(() => MsjsObject.getNullDispatch(inst, null), TypeError, "Unauthorized getNullDispatch");
	});

	await t.step("getPS should throw with wrong key", () => {
		const inst = getInstance(iface.ifName);
		assertThrows(
			() => MsjsObject.getPS(inst, Symbol("wrong")),
			TypeError, "Unauthorized getPS",
		);
	});

	await t.step("getPS should throw with undefined/null key", () => {
		const inst = getInstance(iface.ifName);
		assertThrows(() => MsjsObject.getPS(inst, undefined), TypeError, "Unauthorized getPS");
		assertThrows(() => MsjsObject.getPS(inst, null), TypeError, "Unauthorized getPS");
	});

	await t.step("instance A's key should not work on instance B", () => {
		const a = getInstance(iface.ifName);
		const b = getInstance(iface.ifName);

		// a's key works on a
		MsjsObject.setJS(a, a.keyForTest, "secret");
		assertEquals(MsjsObject.getJS(a, a.keyForTest), "secret");

		// a's key should NOT work on b
		assertThrows(() => MsjsObject.getJS(b, a.keyForTest), TypeError, "Unauthorized getJS");
		assertThrows(() => MsjsObject.setJS(b, a.keyForTest, "x"), TypeError, "Unauthorized setJS");
		assertThrows(() => MsjsObject.getNullDispatch(b, a.keyForTest), TypeError, "Unauthorized getNullDispatch");
		assertThrows(() => MsjsObject.getPS(b, a.keyForTest), TypeError, "Unauthorized getPS");
	});

	await t.step("runtime objects should reject all key-based access", () => {
		// Runtime objects (e.g. interface management objects) have #userKey === undefined
		const testIface = getInterface(":?");
		assertThrows(() => MsjsObject.getJS(testIface, Symbol()), TypeError, "Unauthorized getJS");
		assertThrows(() => MsjsObject.setJS(testIface, Symbol(), "v"), TypeError, "Unauthorized setJS");
		assertThrows(() => MsjsObject.getNullDispatch(testIface, Symbol()), TypeError, "Unauthorized getNullDispatch");
		assertThrows(() => MsjsObject.getPS(testIface, Symbol()), TypeError, "Unauthorized getPS");

		// Critical edge case: runtime objects have #userKey === undefined.
		// Without the `!key` guard, passing undefined would match (undefined === undefined).
		// The `!key` check must reject undefined/null even when #userKey is also undefined.
		assertThrows(() => MsjsObject.getJS(testIface, undefined), TypeError, "Unauthorized getJS");
		assertThrows(() => MsjsObject.setJS(testIface, undefined, "v"), TypeError, "Unauthorized setJS");
		assertThrows(() => MsjsObject.getNullDispatch(testIface, undefined), TypeError, "Unauthorized getNullDispatch");
		assertThrows(() => MsjsObject.getPS(testIface, undefined), TypeError, "Unauthorized getPS");
		assertThrows(() => MsjsObject.getJS(testIface, null), TypeError, "Unauthorized getJS");
	});
});

// ===================================================================
// 5. Instantiation key replay prevention
// ===================================================================
Deno.test("Instantiation key replay prevention", async (t) => {
	const iface = getInterface(":?");
	iface.set({
		handlers: {},
		proto: MyWidget,
	});

	await t.step("should not be possible to replay an instantiation key to create another object", () => {
		const inst = getInstance(iface.ifName);
		const key = inst.keyForTest;

		// Attempting to use the captured key to construct a new MsjsObject should throw
		assertThrows(
			() => new MsjsObject(key, iface.ifName),
			Error,
			"Use getInstance",
		);
	});

	await t.step("replayed key should not produce a valid object even of the same type", () => {
		const inst = getInstance(iface.ifName);
		const key = inst.keyForTest;

		// Even trying with the custom class should fail
		assertThrows(
			() => new MyWidget(key, iface.ifName),
			Error,
			"Use getInstance",
		);
	});
});
