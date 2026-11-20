import { describe, it } from '@compat/test';
import { assert, assertNotStrictEquals, assertStrictEquals, assertThrows } from '@std/assert';
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
describe("Class with constructor and private fields (proto)", () => {
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

	it("instance should be of the custom class", () => {
		const inst = getInstance(iface.ifName);
		assert(inst instanceof MyWidget, "Instance should be instanceof MyWidget");
		assert(inst instanceof MsjsObject, "Instance should be instanceof MsjsObject");
		assertStrictEquals(inst.msjsType, iface.ifName);
	});

	it("constructor should be called (private fields initialized)", () => {
		const inst = getInstance(iface.ifName);
		// keyForTest accesses the private #key field; if the constructor
		// didn't run, this would be undefined.
		assertStrictEquals(typeof inst.keyForTest, "symbol", "Constructor should have captured the key");
	});

	it("each instance should have a unique key", () => {
		const a = getInstance(iface.ifName);
		const b = getInstance(iface.ifName);
		assertNotStrictEquals(a.keyForTest, b.keyForTest, "Each instance gets a unique instantiation key");
	});
});

// ===================================================================
// 2. Bilingual state sharing: d.js (Mesgjs) <-> getJS/setJS (JS)
// ===================================================================
describe("Bilingual state sharing: d.js <-> getJS/setJS", () => {
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

	it("getJS should read state set by d.js in @init", () => {
		const inst = getInstance(iface.ifName);
		const state = inst.getJSState();
		assertStrictEquals(state.name, "init", "JS-side getJS should see what @init set via d.js");
	});

	it("setJS should write state readable by d.js", () => {
		const inst = getInstance(iface.ifName);
		inst.setJSState({ name: "from-js" });
		const viaDjs = $c.sm(inst, "getViaDjs");
		assertStrictEquals(viaDjs.name, "from-js", "d.js should see what JS-side setJS wrote");
	});

	it("d.js setter and getJS should see each other's writes", () => {
		const inst = getInstance(iface.ifName);

		// Mesgjs writes, JS reads
		$c.sm(inst, "setViaDjs", [{ name: "from-mesgjs" }]);
		assertStrictEquals(inst.getJSState().name, "from-mesgjs");

		// JS writes, Mesgjs reads
		inst.setJSState({ name: "from-js-again" });
		assertStrictEquals($c.sm(inst, "getViaDjs").name, "from-js-again");
	});

	it("initial d.js state should be undefined before @init sets it", () => {
		const bareIf = getInterface(":?");
		bareIf.set({
			handlers: {},
			proto: MyWidget,
		});
		const inst = getInstance(bareIf.ifName);
		assertStrictEquals(inst.getJSState(), undefined, "Without @init setting d.js, getJS returns undefined");
	});
});

// ===================================================================
// 3. getNullDispatch: JS-side access to dispatch properties
// ===================================================================
describe("getNullDispatch provides dispatch access from JS", () => {
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

	it("null dispatch .rr should be the object", () => {
		const inst = getInstance(iface.ifName);
		const nd = inst.getNullDispatch();
		assertStrictEquals(nd.rr, inst, "nd.rr should be the instance");
	});

	it("null dispatch .rt should be the object type", () => {
		const inst = getInstance(iface.ifName);
		const nd = inst.getNullDispatch();
		assertStrictEquals(nd.rt, iface.ifName, "nd.rt should be the interface name");
	});

	it("null dispatch .js should mirror d.js / getJS state", () => {
		const inst = getInstance(iface.ifName);
		const nd = inst.getNullDispatch();

		// @init set d.js = { initialized: true }
		assertStrictEquals(nd.js.initialized, true, "nd.js should see what @init set via d.js");

		// JS-side setJS should be visible via nd.js
		inst.setJSState({ updated: true });
		assertStrictEquals(nd.js.updated, true, "nd.js should see what setJS wrote");

		// nd.js setter should be visible via getJS
		nd.js = { fromNullDispatch: true };
		assertStrictEquals(inst.getJSState().fromNullDispatch, true, "getJS should see what nd.js setter wrote");
	});

	it("null dispatch .js should be visible from Mesgjs handlers", () => {
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
		assertStrictEquals(result.fromNullDispatch, true, "d.js in handler should see what null dispatch wrote");
	});

	it("null dispatch .p should provide persistent storage access", () => {
		const inst = getInstance(iface.ifName);
		const nd = inst.getNullDispatch();

		// @init set d.p.set("persistent-key", "persistent-value")
		assertStrictEquals(nd.p.at("persistent-key"), "persistent-value",
			"nd.p should see what @init set via d.p");

		// Write via null dispatch .p
		nd.p.set("from-js", "js-value");

		// Read via Mesgjs handler
		assertStrictEquals($c.sm(inst, "getPersistent", ["from-js"]), "js-value",
			"d.p in handler should see what null dispatch .p wrote");
	});

	it("null dispatch .p writes should be visible from Mesgjs handlers", () => {
		const inst = getInstance(iface.ifName);
		const nd = inst.getNullDispatch();

		// Write via null dispatch
		nd.p.set("nd-key", "nd-value");

		// Read via handler
		assertStrictEquals($c.sm(inst, "getPersistent", ["nd-key"]), "nd-value");
	});

	it("null dispatch should be cached (same object on repeated calls)", () => {
		const inst = getInstance(iface.ifName);
		const nd1 = inst.getNullDispatch();
		const nd2 = inst.getNullDispatch();
		assertStrictEquals(nd1, nd2, "Repeated getNullDispatch calls should return the same object");
	});

	it("different instances should have different null dispatches", () => {
		const a = getInstance(iface.ifName);
		const b = getInstance(iface.ifName);
		assertNotStrictEquals(a.getNullDispatch(), b.getNullDispatch(),
			"Different instances should have different null dispatches");
	});
});

// ===================================================================
// 4. getPS: JS-side access to persistent storage (d.p equivalent)
// ===================================================================
describe("getPS provides persistent storage access from JS", () => {
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

	it("getPS should JIT allocate storage if not yet initialized", () => {
		const bareIf = getInterface(":?");
		bareIf.set({
			handlers: {},
			proto: MyWidget,
		});
		const inst = getInstance(bareIf.ifName);
		const ps = inst.getPSState();
		assert(ps !== undefined, "getPS should return a NANOS instance");
		assertStrictEquals(ps.at("nonexistent"), undefined, "Unset key should return undefined");
	});

	it("getPS should read state set by d.p in @init", () => {
		const inst = getInstance(iface.ifName);
		const ps = inst.getPSState();
		assertStrictEquals(ps.at("init-key"), "init-value", "JS-side getPS should see what @init set via d.p");
	});

	it("getPS should write state readable by d.p", () => {
		const inst = getInstance(iface.ifName);
		const ps = inst.getPSState();
		ps.set("from-js", "js-value");
		const viaDp = $c.sm(inst, "getPersistent", ["from-js"]);
		assertStrictEquals(viaDp, "js-value", "d.p should see what JS-side getPS wrote");
	});

	it("d.p setter and getPS should see each other's writes", () => {
		const inst = getInstance(iface.ifName);

		// Mesgjs writes, JS reads
		$c.sm(inst, "setPersistent", ["from-mesgjs", "mesgjs-value"]);
		assertStrictEquals(inst.getPSState().at("from-mesgjs"), "mesgjs-value");

		// JS writes, Mesgjs reads
		inst.getPSState().set("from-js-again", "js-value-again");
		assertStrictEquals($c.sm(inst, "getPersistent", ["from-js-again"]), "js-value-again");
	});

	it("getPS should return the same NANOS on repeated calls", () => {
		const inst = getInstance(iface.ifName);
		const ps1 = inst.getPSState();
		const ps2 = inst.getPSState();
		assertStrictEquals(ps1, ps2, "Repeated getPS calls should return the same NANOS instance");
	});

	it("different instances should have different persistent storage", () => {
		const a = getInstance(iface.ifName);
		const b = getInstance(iface.ifName);
		assertNotStrictEquals(a.getPSState(), b.getPSState(),
			"Different instances should have different persistent storage");
	});
});

// ===================================================================
// 5. Authorization: getJS / setJS / getNullDispatch / getPS key checks
// ===================================================================
describe("Authorization: key checks for getJS / setJS / getNullDispatch / getPS", () => {
	const iface = getInterface(":?");
	iface.set({
		handlers: {},
		proto: MyWidget,
	});

	it("getJS should throw with wrong key", () => {
		const inst = getInstance(iface.ifName);
		assertThrows(
			() => MsjsObject.getJS(inst, Symbol("wrong")),
			TypeError,
		);
	});

	it("getJS should throw with undefined/null key", () => {
		const inst = getInstance(iface.ifName);
		assertThrows(() => MsjsObject.getJS(inst, undefined), TypeError);
		assertThrows(() => MsjsObject.getJS(inst, null), TypeError);
	});

	it("setJS should throw with wrong key", () => {
		const inst = getInstance(iface.ifName);
		assertThrows(
			() => MsjsObject.setJS(inst, Symbol("wrong"), "value"),
			TypeError,
		);
	});

	it("setJS should throw with undefined/null key", () => {
		const inst = getInstance(iface.ifName);
		assertThrows(() => MsjsObject.setJS(inst, undefined, "v"), TypeError);
		assertThrows(() => MsjsObject.setJS(inst, null, "v"), TypeError);
	});

	it("getNullDispatch should throw with wrong key", () => {
		const inst = getInstance(iface.ifName);
		assertThrows(
			() => MsjsObject.getNullDispatch(inst, Symbol("wrong")),
			TypeError,
		);
	});

	it("getNullDispatch should throw with undefined/null key", () => {
		const inst = getInstance(iface.ifName);
		assertThrows(() => MsjsObject.getNullDispatch(inst, undefined), TypeError);
		assertThrows(() => MsjsObject.getNullDispatch(inst, null), TypeError);
	});

	it("getPS should throw with wrong key", () => {
		const inst = getInstance(iface.ifName);
		assertThrows(
			() => MsjsObject.getPS(inst, Symbol("wrong")),
			TypeError,
		);
	});

	it("getPS should throw with undefined/null key", () => {
		const inst = getInstance(iface.ifName);
		assertThrows(() => MsjsObject.getPS(inst, undefined), TypeError);
		assertThrows(() => MsjsObject.getPS(inst, null), TypeError);
	});

	it("instance A's key should not work on instance B", () => {
		const a = getInstance(iface.ifName);
		const b = getInstance(iface.ifName);

		// a's key works on a
		MsjsObject.setJS(a, a.keyForTest, "secret");
		assertStrictEquals(MsjsObject.getJS(a, a.keyForTest), "secret");

		// a's key should NOT work on b
		assertThrows(() => MsjsObject.getJS(b, a.keyForTest), TypeError);
		assertThrows(() => MsjsObject.setJS(b, a.keyForTest, "x"), TypeError);
		assertThrows(() => MsjsObject.getNullDispatch(b, a.keyForTest), TypeError);
		assertThrows(() => MsjsObject.getPS(b, a.keyForTest), TypeError);
	});

	it("runtime objects should reject all key-based access", () => {
		// Runtime objects (e.g. interface management objects) have #userKey === undefined
		const testIface = getInterface(":?");
		assertThrows(() => MsjsObject.getJS(testIface, Symbol()), TypeError);
		assertThrows(() => MsjsObject.setJS(testIface, Symbol(), "v"), TypeError);
		assertThrows(() => MsjsObject.getNullDispatch(testIface, Symbol()), TypeError);
		assertThrows(() => MsjsObject.getPS(testIface, Symbol()), TypeError);

		// Critical edge case: runtime objects have #userKey === undefined.
		// Without the `!key` guard, passing undefined would match (undefined === undefined).
		// The `!key` check must reject undefined/null even when #userKey is also undefined.
		assertThrows(() => MsjsObject.getJS(testIface, undefined), TypeError);
		assertThrows(() => MsjsObject.setJS(testIface, undefined, "v"), TypeError);
		assertThrows(() => MsjsObject.getNullDispatch(testIface, undefined), TypeError);
		assertThrows(() => MsjsObject.getPS(testIface, undefined), TypeError);
		assertThrows(() => MsjsObject.getJS(testIface, null), TypeError);
	});
});

// ===================================================================
// 6. Instantiation key replay prevention
// ===================================================================
describe("Instantiation key replay prevention", () => {
	const iface = getInterface(":?");
	iface.set({
		handlers: {},
		proto: MyWidget,
	});

	it("should not be possible to replay an instantiation key to create another object", () => {
		const inst = getInstance(iface.ifName);
		const key = inst.keyForTest;

		// Attempting to use the captured key to construct a new MsjsObject should throw
		assertThrows(
			() => new MsjsObject(key, iface.ifName),
			Error,
		);
	});

	it("replayed key should not produce a valid object even of the same type", () => {
		const inst = getInstance(iface.ifName);
		const key = inst.keyForTest;

		// Even trying with the custom class should fail
		assertThrows(
			() => new MyWidget(key, iface.ifName),
			Error,
		);
	});
});
