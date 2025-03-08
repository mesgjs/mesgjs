class SCLFlow extends Error {
    constructor (message, type, info) {
	super(message);
	this.name = 'SCLFlow';
	this.type = type;
	this.info = info;
    }
}

// Make 1+ slices of object properties, returning the last
// Object.slice(src, dst?, props*, dst?, props*, ...)
if (!Object.hasOwn(Object, 'slice')) Object.defineProperty(Object, 'slice', {
    writable: true, enumerable: false, configurable: true,
    value: (obj, ...props) => {
	let res = {};
	for (const prop of props) {
	    if (typeof prop === 'object') res = prop;
	    else if (prop in obj) res[prop] = obj[prop];
	}
	return res;
    }
});
const pick = Object.slice; // shortcut

({
    addInterface, core, newObject
} = (() => {
    let baton, nextUCID = 0;
    const interfaces = {};

    const addInterface = (name, handlers, opts = {}) => {
	const oif = interfaces[name] || {
	    handlers: {}, chain: new Set([]), refs: 0
	};
	if (oif.locked) throw new Error(`Interface ${name} is locked`);
	// Set/replace interface chain
	if (opts.chain) {
	    if (oif.refs) throw new Error(`Interface ${name} chain is locked`);
	    const chain = new Set(opts.chain || []);
	    for (const item of chain) {
		if (!interfaces[item]) throw new Error(`Interface ${name} requires missing interface ${item}`);
		if (interfaces[item].final) throw new Error(`Interface ${name} cannot extend final interface ${item}`);
		++interfaces[item].refs;
	    }
	    oif.chain = chain;
	}
	// Add message handlers
	for (const op of Object.keys(handlers)) {
	    const hand = handlers[op];
	    if (hand.ty === '@code') {
		baton = undefined;
		hand(getHandler, () => { if (baton?.handler) oif.handlers[op] = baton.handler; });
	    }
	    else oif.handlers[op] = handlers[op];
	}
	baton = undefined;
	if (opts.locked) oif.locked = true;
	if (opts.final) oif.final = true;
	interfaces[name] = oif;
    };

    // Set a read-only object property or properties
    // setRO(obj, key, value, enumerable)
    // setRO(obj, { map }, enumerable)
    const setRO = (o, ...a) => {
	if (typeof a[0] === 'object') {
	    const [map, enumerable = true] = a;
	    for (const k of Object.keys(map)) setRO(o, k, map[k], enumerable);
	} else {
	    const [k, value, enumerable = true] = a;
	    Object.defineProperty(o, k, {value, enumerable, writable: false, configurable: false});
	}
    };

    // Handle operations for @code special-objects
    const getHandler = Symbol.for('handler');
    const dispatchCode = mctx => {
	// Direct-message to (block or defer) code object
	switch (mctx.op) {
	case getHandler:
	    try {
		baton = {handler: mctx.octx?.cd};
		/*
		 * "message parameters" for this special method is just
		 * a callback to grab the handler code out of the baton.
		 */
		mctx.mp();
	    } finally {
		baton = undefined;
	    }
	    break;
	case 'run':
	    {
	    // Run the code in the context of its *original* message
	    const octx = mctx.octx;
	    return octx.cd(octx.om);
	    }
	}
    };

    // Handle operations for core object
    const dispatchCore = mctx => {
	switch (mctx.op) {
	case 'and':
	case 'case':
	case 'if':
	case 'import':			// Import modules
	    break;
	case 'inst':			// Return instance of type
	    break;
	case 'logInterfaces':
	    console.log(interfaces);
	    break;
	case 'not':
	case 'or':
	case 'type':			// Return object's type
	    break;
	}
    };

    const dispatchList = mctx => {
    };

    // Handle operations for @message special-objects
    const dispatchMessage = mctx => {
	switch (mctx.op) {
	case 'dispatch':		// Dispatch to next handler/default
	    return mctx.pi.dispatchNext(mctx);
	case 'return':			// Return from dispatch
	    mctx.capture = true;
	    throw new SCLFlow('Return', 'return', {value: mctx.mp});
	    // Not reached
	}
    };

    const dispatchNumber = mctx => {
    };

    const dispatchStorage = mctx => {
	switch (mctx.op) {
	case 'get':
	case 'nset':
	case 'set':
	}
    };

    const dispatchText = mctx => {
    };

    // Return specific and default handlers for a type and operation
    const findHandlers = (type, op) => {
	const res = {spec: [], def: []};
	for (const name of flatChain(type)) {
	    const hands = interfaces[name]?.handlers;
	    if (hands?.[op]) res.spec.push(hands[op]);
	    if (hands?.defaultHandler) res.def.push(hands.defaultHandler);
	}
	return res;
    };

    // Return flattened chain (set/list) by interface type
    const flatChain = type => {
	if (!interfaces[type]) return [];
	let fc = interfaces[type].flatChain;
	if (!fc) {
	    fc = new Set([type]);
	    for (const nxType of interfaces[type].chain) if (!fc.has(nxType)) fc = fc.union(flatChain(nxType));
	    interfaces[type].flatChain = fc;
	}
	return fc;
    };

    /*
     * Prepare an object context. Sets the context prototype, adds receiver
     * and sender functions, and returns the receiver function (the object's
     * public interface).
     */
    const prepare = (octx, proto) => {
	const pi = receiverTpl.bind(null, octx);
	if (proto) Object.setPrototypeOf(octx, proto);
	// Add the public interface and send-message function to octx
	setRO(octx, { pi, sm: senderTpl.bind(null, octx) });
	// Share the object type on the public interface
	setRO(pi, 'ty', octx.type);
	return pi;
    };

    // Return a new code object given a code block and original message
    const newCode = (cd, om) => prepare({cd, om}, newCode.prototype);
    setRO(newCode, 'prototype', {
	get dispatcher () { return dispatchCode; },
	get type () { return '@code'; },
    });

    const newCore = () => prepare({}, newCore.prototype);
    setRO(newCore, 'prototype', {
	get dispatcher () { return dispatchCore; },
	get type () { return '@core'; },
    });

    // Public @message interface methods (bound instances shadowed)
    const pubMesgProto = {
	// Return the message-specific binding for a code template
	// (bound instance shadowed)
	b (mctx, tpl) {
	    // Assign a unique code ID upon first access
	    if (tpl.ucid === undefined) tpl.ucid = nextUCID++;
	    const ucid = tpl.ucid, myCode = mctx.myCode;
	    if (!myCode[ucid]) myCode[ucid] = newCode(tpl.cd, mctx.pi);
	    return myCode[ucid];
	},

	// Dispatch the first handler (bound instance shadowed)
	dispatch (mctx) {
	    // Use core-object custom-dispatcher when supplied
	    const dispatcher = mctx.octx?.dispatcher;
	    if (dispatcher) return dispatcher(mctx);

	    // Find the message handlers for this object type and operation
	    const octx = mctx.octx, hands = findHandlers(octx.type, mctx.op);
	    if (hands.spec.length) mctx.handlers = hands.spec;
	    else if (hands.def.length) mctx.handlers = hands.def;
	    else throw new Error(`No handler found for type ${octx.type} operation ${mctx.op}`);

	    // Add transient (scratch) storage and continue dispatch
	    setRO(mctx.pi, 'ts', newStorage());
	    return mctx.dispatch();
	},

    };
    Object.setPrototypeOf(pubMesgProto, Object.getPrototypeOf(Function));

    // Return new message object
    const newMessage = rctx => {
	const octx = rctx.octx,		// Receiving-object's context
	    bctx = rctx.baton;		// Baton at time of call
	// Build message context
	const mctx = {
	    octx,
	    myCode: {},			// Bound code objects
	    next: 0,			// Next handler index
	};
	const pi = prepare(mctx, newMessage.prototype), proto = pubMesgProto;

	// Accept anonymous, direct message or attributed, baton message
	let sr, st, { op, mp } = rctx, { pi: rr, type: rt, ps, sm } = octx;
	if (op === undefined && bctx?.op !== undefined && bctx?.rr === octx.pi) ({ sr, st, op, mp } = bctx);

	Object.setPrototypeOf(pi, proto);
	setRO(pi, { sr, st, op, mp, rr, rt, ps, sm });
	for (const k of ['b', 'dispatch']) setRO(pi, k, proto[k].bind(null, mctx));
	return pi;
    };
    setRO(newMessage, 'prototype', {
	// Dispatch the (first or) next handler
	dispatch () {
	    try {
		const hand = this.handlers[this.next];
		if (hand) return ++this.next, hand(this.pi);
	    } catch (e) {
		// @m(return value?)
		if (this.capture && e.name === 'SCLFlow' && e.type === 'return') {
		    this.capture = false;
		    return e.info?.value;
		}
		throw e;
		// Not reached
	    }
	},
	get dispatcher () { return dispatchMessage; },
	get mp () { return this.pi.mp; },	// message parameters
	get op () { return this.pi.op; },	// message operation
	get ps () { return this.pi.ps; },	// persistent storage/state
	get rr () { return this.pi.rr; },	// receiver object pi
	get rt () { return this.pi.rt; },	// receiver type
	get sm () { return this.pi.sm; },	// send-message function
	get sr () { return this.pi.sr; },	// sender object pi
	get st () { return this.pi.st; },	// sender type
	get type () { return '@message'; },
    });

    const newNumber = n => {
	const pi = prepare({value: n}, newNumber.prototype);
	Object.defineProperty(pi, 'jsv', {value: n})
    };
    setRO(newNumber, 'prototype', {
	get dispatcher () { return dispatchNumber; },
	get type () { return '@number'; },
    });

    // Return new general object
    const newObject = (type, gs) => {
	if (type[0] === '@') throw new Error(`Cannot create special object with type ${type}`);
	if (!interfaces[type]) throw new Error(`Cannot create object with unknown type ${type}`);
	return prepare({type, ps: newStorage()});
    };

    // Return new storage object
    const newStorage = () => prepare({data: new NANOS}, newStorage.prototype);
    setRO(newStorage, 'prototype', {
	get dispatcher () { return dispatchStorage; },
	get type () { return '@storage'; },
    });

    // Unbound message-receiver template
    const receiverTpl = (octx, op, mp) => {
	// Receiver context: object context, call op+params, core baton
	const rctx = {octx, op, mp, baton};
	baton = undefined;
	// Generate new message and dispatch the first handler
	return newMessage(rctx).dispatch();
    };

    // Unbound message-sender template
    const senderTpl = (srctx, receiver, op, mp) => {
	let res;
	baton = {sr: srctx.pi, st: srctx.pi.ty, rr: receiver, op, mp};
	try { res = receiver(); }
	finally { baton = undefined; }
	return res;
    };

    const textSym = t => t;	// For now

    const core = newCore();

    return {
	addInterface, core, newObject
    };
})());

const $f = false, $n = null, $t = true, $u = undefined;

// List generator
function ls () {
}

// Namespace-get short-cut
// OK to message anonymously here?
function ng (ns, name) {
}

//////////////////////////////////////////////////////////////////////

const logMessage = (lbl, msg) => console.log(lbl, pick(msg, ...Object.keys(msg)));

const test1 = () => {
    addInterface('base', {
	test: m => logMessage('Base test', m),
	sendTest: m => { logMessage('Base sendTest', m); m.sm(m.mp, 'test'); },
    });
    b1 = newObject('base', 'b1');
    b2 = newObject('base', 'b2');
};

const test2 = () => {
    addInterface('sub', {
	log: m => logMessage('Sub log', m),
	test: m => logMessage('Sub test', m),
    }, {chain: ['base']});
};
/*
vim:syntax=javascript:sw=4
*/
