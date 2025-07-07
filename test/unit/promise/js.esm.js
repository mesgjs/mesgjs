import 'mesgjs/runtime/mesgjs.esm.js';
import { assertEqual, testAsync, testRejects, testResolves, testSummary } from 'mesgjs/test/test.esm.js';

export const version = '1.0.0<2.0.0 :@promise/js';

export default async function runTests() {
  await testAsync('@promise, JS interface', async () => {
    const { getInstance } = $c;

    await testAsync('newly-created promise state is pending', () => {
      const p = getInstance('@promise');
      assertEqual(p.state, 'pending');
    });

    await testResolves('resolved promise state is fulfilled', () => getInstance('@promise', { resolve: 42 }), result => {
        assertEqual(result, 42);
        return true;
    });

    await testRejects('rejected promise state is rejected', () => {
        const reason = new Error('test rejection');
        const p = getInstance('@promise');
        p.reject(reason);
        return p;
    }, 'test rejection');
    
    await testResolves('Promise.resolve-style shortcut works', () => getInstance('@promise', { resolve: 'shortcut' }), 'shortcut');

    await testRejects('Promise.reject-style shortcut works', () => getInstance('@promise', { reject: new Error('reject shortcut') }), 'reject shortcut');

    await testResolves('.then() works for resolved promises', () => {
        const p = getInstance('@promise');
        const p2 = p.then(v => v * 2);
        p.resolve(21);
        return p2;
    }, 42);

    await testResolves('.then() works for rejected promises', () => {
        const p = getInstance('@promise');
        const reason = new Error('then rejection');
        const p2 = p.then(null, e => e.message);
        p.reject(reason);
        return p2;
    }, 'then rejection');

    await testResolves('.catch() works', () => {
        const p = getInstance('@promise');
        const reason = new Error('catch test');
        const p2 = p.catch(e => e.message);
        p.reject(reason);
        return p2;
    }, 'catch test');

    await testAsync('.always() works for resolved promises', async () => {
        const p = getInstance('@promise');
        let marker;
        p.always(() => { marker = 'always'; });
        p.resolve('resolved');
        await p;
        assertEqual(marker, 'always');
    });

    await testAsync('.always() works for rejected promises', async () => {
        const p = getInstance('@promise');
        const reason = new Error('always rejection');
        let marker;
        p.always(() => { marker = 'always'; });
        p.reject(reason);
        try {
            await p;
        } catch(e) {
            // ignore
        }
        assertEqual(marker, 'always');
    });

    await testResolves('.all() resolves correctly', () => {
        const p = getInstance('@promise');
        const p1 = getInstance('@promise', { resolve: 1 });
        const p2 = getInstance('@promise', { resolve: 2 });
        p.all([p1, p2]);
        return p;
    }, result => {
        assertEqual(result.length, 2);
        assertEqual(result[0], 1);
        assertEqual(result[1], 2);
        return true;
    });

    await testRejects('.all() rejects correctly', () => {
        const p = getInstance('@promise');
        const reason = new Error('all rejection');
        const p1 = getInstance('@promise', { resolve: 1 });
        const p2 = getInstance('@promise', { reject: reason });
        p.all([p1, p2]);
        return p;
    }, 'all rejection');

    let reason;
    await testResolves('.allSettled() resolves correctly', () => {
        const p = getInstance('@promise');
        reason = new Error('allSettled');
        const p1 = getInstance('@promise', { resolve: 'ok' });
        const p2 = getInstance('@promise', { reject: reason });
        p.allSettled([p1, p2]);
        return p;
    }, results => {
        assertEqual(results[0].status, 'fulfilled');
        assertEqual(results[0].value, 'ok');
        assertEqual(results[1].status, 'rejected');
        assertEqual(results[1].reason, reason);
        return true;
    });

    await testResolves('.any() resolves correctly', () => {
        const p = getInstance('@promise');
        const p1 = getInstance('@promise');
        const p2 = getInstance('@promise');
        p.any([p1, p2]);
        p2.resolve('first');
        p1.reject('ignored');
        return p;
    }, 'first');

    await testRejects('.any() rejects correctly', () => {
        const p = getInstance('@promise');
        const p1 = getInstance('@promise');
        const p2 = getInstance('@promise');
        const r1 = new Error('r1');
        const r2 = new Error('r2');
        p.any([p1, p2]);
        p1.reject(r1);
        p2.reject(r2);
        return p;
    }, 'All promises were rejected');

    await testResolves('.race() resolves correctly', () => {
        const p = getInstance('@promise');
        const p1 = getInstance('@promise');
        const p2 = getInstance('@promise');
        p.race([p1, p2]);
        p1.resolve('winner');
        p2.reject('loser');
        return p;
    }, 'winner');

    await testRejects('.race() rejects correctly', () => {
        const p = getInstance('@promise');
        const p1 = getInstance('@promise');
        const p2 = getInstance('@promise');
        const reason = new Error('race rejection')
        p.race([p1, p2]);
        p1.reject(reason);
        p2.resolve('too late');
        return p;
    }, 'race rejection');

    await testAsync('.result works', async () => {
      const p1 = getInstance('@promise');
      assertEqual(p1.result, undefined);
      p1.resolve('resolved');
      await p1;
      assertEqual(p1.result, 'resolved');

      const reason = new Error('rejected');
      const p2 = getInstance('@promise');
      p2.catch(() => {}); // Prevent unhandled rejection error
      p2.reject(reason);
      try {
        await p2;
      } catch (e) {
        // ignore
      }
      assertEqual(p2.result, reason);
    });
  });
}

if (!globalThis.testRunner) {
  await runTests();
  testSummary();
}