import {
  assertEquals,
  assertStrictEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { listFromPairs as ls } from '../../src/runtime/runtime.esm.js';
import '../../src/runtime/mesgjs.esm.js';
import { NANOS } from '@nanos';
import { unifiedList } from '../../src/runtime/unified-list.esm.js';

const { getInstance } = globalThis.$c;
const newPromise = (init) => {
	return getInstance('@promise', init);
};

// Helper to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.test('@promise - initialization', async () => {
  const p1 = getInstance('@promise');
  assertEquals($c.sm(p1, 'state'), 'pending');

  const p2 = newPromise(ls(['resolve', 'ok']));
  await p2;
  assertEquals($c.sm(p2, 'state'), 'fulfilled');
  assertEquals($c.sm(p2, 'result'), 'ok');

  const p3 = newPromise(ls(['reject', 'fail']));
  await $c.sm(p3, 'catch', () => {}); // Catch the rejection to prevent unhandled rejection errors
  assertEquals($c.sm(p3, 'state'), 'rejected');
  assertEquals($c.sm(p3, 'message'), 'fail');
});

Deno.test('@promise - JS value', async () => {
	const p1 = getInstance('@promise');
	assertStrictEquals($c.sm(p1, '@jsv'), p1, "(@jsv)");
	assertStrictEquals(p1.jsv, p1, ".jsv");
	assertStrictEquals(p1.valueOf(), p1, ".valueOf()");
});

Deno.test('@promise - resolve/reject methods', async () => {
	const p = getInstance('@promise');
	$c.sm(p, 'resolve', 'resolved');
	await p;
	assertEquals($c.sm(p, 'state'), 'fulfilled');
	assertEquals($c.sm(p, 'result'), 'resolved');

	const p2 = getInstance('@promise');
	$c.sm(p2, 'reject', 'rejected')
	await $c.sm(p2, 'catch', () => {});
	assertEquals($c.sm(p2, 'state'), 'rejected');
	assertEquals($c.sm(p2, 'message'), 'rejected');
});

Deno.test('@promise - then/catch/always', async () => {
	let res;
	const p1 = newPromise(ls(['resolve', 'p1']));
	await $c.sm(p1, 'then', (r) => { res = r; });
	assertEquals(res, 'p1');

	let err;
	const p2 = newPromise(ls(['reject', 'p2']));
	await $c.sm(p2, 'catch', (r) => { err = r.message; });
	assertEquals(err, 'p2');

	let settled = false;
	const p3 = newPromise(ls(['resolve', 'p3']));
	await $c.sm(p3, 'always', () => { settled = true; });
	assertStrictEquals(settled, true);
});

Deno.test('@promise - .all', async () => {
	const promises = [
		newPromise(ls(['resolve', 1])),
		newPromise(ls(['resolve', 2])),
	];
	const pAll = getInstance('@promise');
	$c.sm(pAll, 'all', new NANOS(promises));
	const result = await pAll; // Mesgjs mode resolves to a NANOS of results
	assertEquals([...result.values()], [1, 2]);
});

Deno.test('@promise - .allSettled', async () => {
	const rejected = newPromise(ls(['reject', 'err']));
	await $c.sm(rejected, 'catch', () => {});
	const promises = [
		newPromise(ls(['resolve', 1])),
		rejected,
	];
	const pAll = getInstance('@promise');
	$c.sm(pAll, 'allSettled', new NANOS(promises));
	const result = unifiedList(await pAll);
	assertEquals(result.at([0, 'status']), 'fulfilled');
	assertEquals(result.at([0, 'value']), 1);
	assertEquals(result.at([1, 'status']), 'rejected');
	assertEquals(result.at([1, 'reason'])?.message, 'err');
});

Deno.test('@promise - .any', async () => {
	const rejected = newPromise(ls(['reject', 'err']));
	await $c.sm(rejected, 'catch', () => {});
	const promises = [
		rejected,
		newPromise(ls(['resolve', 1])),
	];
	const pAny = getInstance('@promise');
	$c.sm(pAny, 'any', new NANOS(promises));
	const result = await pAny;
	assertEquals(result, 1);
});

Deno.test('@promise - .race', async () => {
	const p1 = getInstance('@promise');
	const p2 = getInstance('@promise');

	setTimeout(() => $c.sm(p1, 'resolve', 'one'), 20);
	setTimeout(() => $c.sm(p2, 'resolve', 'two'), 10);

	const pRace = getInstance('@promise');
	$c.sm(pRace, 'race', ls([, p1, , p2]));
	const result = await pRace;
	assertEquals(result, 'two');
	await p1;
	await p2;
});

Deno.test('@promise - message property', async () => {
	const p = newPromise(ls(['reject', new Error('test error')]));
	await $c.sm(p, 'catch', () => {});
	assertEquals($c.sm(p, 'message'), 'test error');
});

Deno.test('@promise - .wait/.cancel', async () => {
	// Mesgjs interface
	const p1 = getInstance('@promise');
	$c.sm(p1, 'wait', ls([, 20, , 'waited']));
	await delay(5);
	assertEquals($c.sm(p1, 'state'), 'pending');
	const result = await p1;
	assertEquals(result, 'waited');
	assertEquals($c.sm(p1, 'state'), 'fulfilled');

	const p2 = getInstance('@promise');
	$c.sm(p2, 'wait', ls([, 20, , 'never']));
	$c.sm(p2, 'cancel');
	await delay(30);
	assertEquals($c.sm(p2, 'state'), 'pending');

	// JS interface
	const p3 = getInstance('@promise');
	p3.wait(20, 'waited');
	await delay(5);
	assertEquals(p3.state, 'pending');
	const result3 = await p3;
	assertEquals(result3, 'waited');
	assertEquals(p3.state, 'fulfilled');

	const p4 = getInstance('@promise');
	p4.wait(20, 'never');
	p4.cancel();
	await delay(30);
	assertEquals(p4.state, 'pending');
});
