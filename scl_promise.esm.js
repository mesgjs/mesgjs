/*
 * SysCL @promise interface
 * Authors: Brian Katzung <briank@kappacs.com> and ChatGPT
 * Copyright 2025 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInterface, setRO } from 'syscl/runtime.esm.js';

const identity = x => x, thrower = x => { throw x; };
const callable = f => typeof f === 'function' && (!f.sclType || f.sclType === '@function');
const thenable = o => typeof o?.then === 'function';
const privKey = Symbol();

function callHandlers (list) {
    const { state, result } = this[privKey], ok = state === 'fulfilled';
    for (const entry of list) {
	const [ onResolve, onReject, next ] = entry;
	queueMicrotask(() => {
	    try {
		const handler = ok ? onResolve : onReject;
		if (handler.sclType) next.resolve(handler('call', ok ? { resolve: result } : { reject: result }));
		else next.resolve(handler(result));
	    } catch (err) {
		next.reject(err);
	    }
	});
    }
}

const proto = Object.setPrototypeOf({
    // Resolve all of a set of promises with an array of their results
    all (...promises) {
	if (this[privKey].state !== 'pending') return;
	const results = [];
	let remaining = promises.length;

	if (!remaining) this.resolve(results);
	promises.forEach((p, idx) => {
	    p.then(res => {
		results[idx] = res;
		if (--remaining === 0) this.resolve(results);
	    }).catch(err => jsReject(js, err));
	});
	return this;
    },

    allSettled (...promises) {
	if (this[privKey].state !== 'pending') return;
	const results = [];
	let remaining = promises.length;

	if (!remaining) this.resolve(results);
	promises.forEach((p, idx) => {
	    p.then(value => {
		results[idx] = { status: 'fulfilled', value };
		if (--remaining === 0) this.resolve(results);
	    }).catch(reason => {
		results[idx] = { status: 'rejected', reason };
		if (--remaining === 0) this.resolve(results);
	    });
	});
	return this;
    },

    always (handler) { return this.then(handler, handler); },

    catch (onReject) { return this.then(null, onReject); },

    then (onResolve, onReject) {
	const priv = this[privKey];
	if (!callable(onResolve)) onResolve = identity;
	if (!callable(onReject)) onReject = thrower;
	const entry = [ onResolve, onReject, getInstance('@promise') ];
	if (priv.state === 'pending') priv.handlers.push(entry);
	else callHandlers.call(this, [ entry ]);
	return entry[2];
    },

    reject (reason) {
	const priv = this[privKey];
	if (priv.state !== 'pending') return;
	priv.state = 'rejected';
	if (!(reason instanceof Error)) reason = new Error(reason);
	priv.result = reason;
	if (!priv.handlers.length) queueMicrotask(() => { throw reason; });
	callHandlers.call(this, priv.handlers);
	priv.handlers = null;
	return this;
    },

    resolve (result) {
	const priv = this[privKey];
	if (priv.state !== 'pending') return;
	if (thenable(result)) {
	    result.then(res => this.resolve(res), err => this.reject(err));
	    return result;
	}
	priv.state = 'fulfilled';
	priv.result = result;
	callHandlers.call(this, priv.handlers);
	priv.handlers = null;
	return this;
    },

    get result () { return this[privKey].result; },

    get state () { return this[privKey].state; },

}, Object.getPrototypeOf(Function));
proto.finally = proto.always;

function opInit (d) {
    // Initialize, and make this object JS/SysCL "bilingual"
    Object.setPrototypeOf(d.rr, proto);
    setRO(d.rr, privKey, {
	state: 'pending', result: undefined, handlers: [],
    });
}

export function installPromise () {
    getInterface('@promise').set({
	lock: true, pristine: true,
	handlers: {
	    '@init': opInit,
	    all: d => d.rr.all(...[...d.mp.values()]),
	    allSettled: d => d.rr.allSettled(...[...d.mp.values()]),
	    always: d => d.rr.always(d.mp.at(0)),
	    catch: d => d.rr.catch(d.mp.at(0)),
	    reject: d => d.rr.reject(d.mp.at(0)),
	    resolve: d => d.rr.resolve(d.mp.at(0)),
	    result: d => d.rr.result,
	    state: d => d.rr.state,
	    then: d => d.rr.then(d.mp.at(0), d.mp.at(1)),
	},
    });
}

// END
