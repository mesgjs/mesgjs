/*
 * Mesgjs @promise interface - JS Promise wrapper
 * (Implements Promise-like API, but is NOT a JS Promise wrapper interface)
 *
 * Authors: Brian Katzung <briank@kappacs.com> and ChatGPT
 * Copyright 2025-2026 by Kappa Computer Solutions, LLC and Brian Katzung
 */

import { getInstance, getInterface, MsjsCode, MsjsFunction, setRO } from './runtime.esm.js';
import { NANOS } from '@nanos';

const identity = (x) => x, thrower = (x) => { throw x; };
const callable = (f) => typeof f === 'function' || f instanceof MsjsCode || f instanceof MsjsFunction;
const thenable = (o) => typeof o?.then === 'function';
const privKey = Symbol();
const dualStatus = (status) => Object.assign(new NANOS(status), status);

function arrayFrom (value) {
	// Pass arrays through as-is
	if (Array.isArray(value)) {
		return value;
	}
	// Flatten iterables and generators
	if (typeof value?.[Symbol.iterator] === 'function' || typeof value?.next === 'function') {
		return Array.from(value);
	}
	// Flatten objects with a values method
	if (typeof value?.values === 'function') {
		return [...value.values()];
	}
}

function callHandlers (list) {
	const { state, result } = this[privKey], ok = state === 'fulfilled';
	if (!ok && !list.length) {
		queueMicrotask(() => Promise.reject(result));
		return;
	}
	for (const entry of list) {
		const [ onResolve, onReject, next ] = entry;
		queueMicrotask(() => {
			try {
				const handler = ok ? onResolve : onReject;

				if (handler instanceof MsjsCode) {
					next.resolve($c.sm(handler, 'run'));
				} else if (handler instanceof MsjsFunction) {
					const mp = ok ? { state, resolve: result } : { state, reject: result, message: result?.message };

					next.resolve($c.sm(handler, 'call', mp));
				} else {
					next.resolve(handler(result));
				}
			} catch (err) {
				next.reject(err);
			}
		});
	}
}

const proto = {
	// Resolve all of a set of promises with an array of their results
	all (promises) {
		if (this[privKey].state !== 'pending') return;
		promises = arrayFrom(promises);
		if (!Array.isArray(promises)) {
			throw new TypeError('@promise(all) requires an iterable of promises');
		}
		const results = [];
		let remaining = promises.length;

		if (!remaining) this.resolve(results);
		promises.forEach((p, idx) => {
			p.then(res => {
				results[idx] = res;
				if (--remaining === 0) this.resolve(results);
			}, err => this.reject(err));
		});
		return this;
	},

	allSettled (promises) {
		if (this[privKey].state !== 'pending') return;
		promises = arrayFrom(promises);
		if (!Array.isArray(promises)) {
			throw new TypeError('@promise(allSettled) requires an iterable of promises');
		}
		const results = [];
		let remaining = promises.length;

		if (!remaining) this.resolve(results);
		promises.forEach((p, idx) => {
			p.then(value => {
				results[idx] = dualStatus({ status: 'fulfilled', value });
				if (--remaining === 0) this.resolve(results);
			}, reason => {
				results[idx] = dualStatus({ status: 'rejected', reason });
				if (--remaining === 0) this.resolve(results);
			});
		});
		return this;
	},

	always (handler) { return this.then(handler, handler); },

	any (promises) {
		if (this[privKey].state !== 'pending') return;
		promises = arrayFrom(promises);
		if (!Array.isArray(promises)) {
			throw new TypeError('@promise(any) requires an iterable of promises');
		}
		const reasons = [];
		let remaining = promises.length;
		const allRejected = () => this.reject(new AggregateError(reasons, 'All promises were rejected'));

		if (!remaining) allRejected();
		promises.forEach((p, idx) => {
			p.then(res => this.resolve(res), reason => {
				reasons[idx] = reason;
				if (--remaining === 0) allRejected();
			});
		});
		return this;
	},

	// Cancel any pending timed-resolution event
	cancel () {
		const priv = this[privKey];
		if (priv.timerId) {
			clearTimeout(priv.timerId);
			priv.timerId = undefined;
		}
	},

	'catch' (onReject) { return this.then(null, onReject); },

	get jsv () { return this; },

	then (onResolve, onReject) {
		const priv = this[privKey];
		if (!callable(onResolve)) onResolve = identity;
		if (!callable(onReject)) onReject = thrower;
		const entry = [ onResolve, onReject, getInstance('@promise') ];
		if (priv.handlers) priv.handlers.push(entry);
		else queueMicrotask(() => callHandlers.call(this, [ entry ]));
		return entry[2];
	},

	race (promises) {
		if (this[privKey].state !== 'pending') return;
		promises = arrayFrom(promises);
		if (!Array.isArray(promises)) {
			throw new TypeError('@promise(race) requires an iterable of promises');
		}
		if (!promises.length) console.warn('@promise empty (race) will never settle!');
		promises.forEach(p => p.then(res => this.resolve(res), err => this.reject(err)));
		return this;
	},

	reject (reason) {
		const priv = this[privKey];
		if (priv.state !== 'pending') return;
		priv.state = 'rejected';
		if (!(reason instanceof Error)) reason = new Error(reason);
		priv.result = reason;
		queueMicrotask(() => {
			callHandlers.call(this, priv.handlers);
			priv.handlers = null;
		});
	},

	resolve (result) {
		const priv = this[privKey];
		if (priv.state !== 'pending') return;
		if (thenable(result)) {
			result.then(res => this.resolve(res), err => this.reject(err));
			return;
		}
		priv.state = 'fulfilled';
		priv.result = result;
		queueMicrotask(() => {
			callHandlers.call(this, priv.handlers);
			priv.handlers = null;
		});
	},

	get result () { return this[privKey].result; },

	get state () { return this[privKey].state; },

	valueOf () { return this; },

	// Schedule a timed-resolution event
	wait (time, result) {
		const priv = this[privKey];
		if (priv.state !== 'pending') return;
		const action = () => {
			if (result?.msjsType === '@code') this.resolve(result('run'));
			else if (typeof result === 'function') this.resolve(result());
			else this.resolve(result);
		};
		this.cancel();
		priv.timerId = setTimeout(action, time);
		return this;
	},

};
proto.finally = proto.always;

function opInit (d) {
	// Initialize, and make this object JS/Mesgjs "bilingual"
	setRO(d.rr, privKey, {
		state: 'pending', result: undefined, handlers: [],
		timerId: undefined,
	});
	if (d.mp.has('resolve')) d.rr.resolve(d.mp.at('resolve'));
	if (d.mp.has('reject')) d.rr.reject(d.mp.at('reject'));
}

export function install (name) {
	getInterface(name).set({
		lock: true, pristine: true,
		handlers: {
			'@init': opInit,
			'@jsv': (d) => d.rr,
			all: (d) => d.rr.all(d.mp),
			allSettled: (d) => d.rr.allSettled(d.mp),
			always: (d) => d.rr.always(d.mp.at(0)),
			any: (d) => d.rr.any(d.mp),
			cancel: (d) => d.rr.cancel(),
			catch: (d) => d.rr.catch(d.mp.at(0)),
			eq: (d) => d.rr === d.mp.at(0),
			message: (d) => d.rr.result?.message,
			ne: (d) => d.rr !== d.mp.at(0),
			race: (d) => d.rr.race(d.mp),
			reject: (d) => d.rr.reject(d.mp.at(0)),
			resolve: (d) => d.rr.resolve(d.mp.at(0)),
			result: (d) => d.rr.result,
			state: (d) => d.rr.state,
			then: (d) => d.rr.then(d.mp.at(0), d.mp.at(1)),
			wait: (d) => d.rr.wait(d.mp.at(0), d.mp.at(1)),
		},
		proto,
	});
}

// END
