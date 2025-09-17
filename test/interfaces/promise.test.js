import {
  assertEquals,
  assertStrictEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { listFromPairs as ls } from '../../src/runtime/runtime.esm.js';
import '../../src/runtime/mesgjs.esm.js';
import { NANOS } from '../../src/runtime/vendor.esm.js';
import { unifiedList } from '../../src/runtime/unified-list.esm.js';

const newPromise = (init) => {
    return $c('get', ls([, '@promise', 'init', init]));
};

// Helper to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.test('@promise - initialization', async () => {
  const p1 = $c('get', '@promise');
  assertEquals(p1('state'), 'pending');

  const p2 = newPromise(ls(['resolve', 'ok']));
  await p2;
  assertEquals(p2('state'), 'fulfilled');
  assertEquals(p2('result'), 'ok');

  const p3 = newPromise(ls(['reject', 'fail']));
  await p3('catch', () => {}); // Catch the rejection to prevent unhandled rejection errors
  assertEquals(p3('state'), 'rejected');
  assertEquals(p3('message'), 'fail');
});

Deno.test('@promise - JS value', async () => {
    const { $c } = globalThis, { getInstance } = $c;
    const p1 = getInstance('@promise');
    assertStrictEquals(p1('@jsv'), p1, "(@jsv)");
    assertStrictEquals(p1.jsv, p1, ".jsv");
    assertStrictEquals(p1.valueOf(), p1, ".valueOf()");
});

Deno.test('@promise - resolve/reject methods', async () => {
    const p = $c('get', '@promise');
    p('resolve', 'resolved');
    await p;
    assertEquals(p('state'), 'fulfilled');
    assertEquals(p('result'), 'resolved');

    const p2 = $c('get', '@promise');
    p2('reject', 'rejected')
    await p2('catch', () => {});
    assertEquals(p2('state'), 'rejected');
    assertEquals(p2('message'), 'rejected');
});

Deno.test('@promise - then/catch/always', async () => {
    let res;
    const p1 = newPromise(ls(['resolve', 'p1']));
    await p1('then', (r) => { res = r; });
    assertEquals(res, 'p1');

    let err;
    const p2 = newPromise(ls(['reject', 'p2']));
    await p2('catch', (r) => { err = r.message; });
    assertEquals(err, 'p2');
    
    let settled = false;
    const p3 = newPromise(ls(['resolve', 'p3']));
    await p3('always', () => { settled = true; });
    assertStrictEquals(settled, true);
});

Deno.test('@promise - .all', async () => {
    const promises = [
	newPromise(ls(['resolve', 1])),
	newPromise(ls(['resolve', 2])),
    ];
    const pAll = $c('get', '@promise');
    pAll('all', new NANOS(promises));
    const result = await pAll; // Mesgjs mode resolves to a NANOS of results
    assertEquals([...result.values()], [1, 2]);
});

Deno.test('@promise - .allSettled', async () => {
    const rejected = newPromise(ls(['reject', 'err']));
    await rejected('catch', () => {});
    const promises = [
	newPromise(ls(['resolve', 1])),
	rejected,
    ];
    const pAll = $c('get', '@promise');
    pAll('allSettled', new NANOS(promises));
    const result = unifiedList(await pAll);
    assertEquals(result.at([0, 'status']), 'fulfilled');
    assertEquals(result.at([0, 'value']), 1);
    assertEquals(result.at([1, 'status']), 'rejected');
    assertEquals(result.at([1, 'reason'])?.message, 'err');
});

Deno.test('@promise - .any', async () => {
    const rejected = newPromise(ls(['reject', 'err']));
    await rejected('catch', () => {});
    const promises = [
	rejected,
	newPromise(ls(['resolve', 1])),
    ];
    const pAny = $c('get', '@promise');
    pAny('any', new NANOS(promises));
    const result = await pAny;
    assertEquals(result, 1);
});

Deno.test('@promise - .race', async () => {
    const p1 = $c('get', '@promise');
    const p2 = $c('get', '@promise');
    
    setTimeout(() => p1('resolve', 'one'), 20);
    setTimeout(() => p2('resolve', 'two'), 10);

    const pRace = $c('get', '@promise');
    pRace('race', ls([, p1, , p2]));
    const result = await pRace;
    assertEquals(result, 'two');
    await p1;
    await p2;
});

Deno.test('@promise - message property', async () => {
    const p = newPromise(ls(['reject', new Error('test error')]));
    await p('catch', () => {});
    assertEquals(p('message'), 'test error');
});
