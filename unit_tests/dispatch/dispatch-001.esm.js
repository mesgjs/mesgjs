import { getInstance, getInterface } from 'syscl/runtime.esm.js';
import { test, testReturns, testSummary } from 'syscl/test.esm.js';

const msgd = (d, op, mp) => d.sm(d, op, mp);

const sif1 = getInterface('?');
test('Create anonymous interface', () => {
    if (!sif1.ifName) throw new Error('Interface name (.ifName) is missing');
    if (sif1.ifName[0] !== '?' || sif1.ifName === '?') throw new Error(`Unexpected interface name ${sif1.ifName}`);
});

sif1.set({
    handlers: {
	getD: d => [ d, 'getD' ],
	redis: d => msgd(d, { op: 'redis', params: d.mp }),
	defaultHandler: d => [ d, 'default' ],
    },
});

const inst1 = getInstance(sif1.ifName);
testReturns('Instance type', () => inst1.sclType, sif1.ifName);

console.log('[****] Check basic dispatch (getD)');
(() => {
const d = inst1('getD');
testReturns('getD handler', () => d[1], 'getD');
testReturns('getD .rr', () => d[0].rr, res => res === inst1);
testReturns('getD (rr)', () => msgd(d[0],'rr'), res => res === inst1);
testReturns('getD .rt', () => d[0].rt, inst1.sclType);
testReturns('getD (rt)', () => msgd(d[0],'rt'), inst1.sclType);
testReturns('getD .ht', () => d[0].ht, inst1.sclType);
testReturns('getD (ht)', () => msgd(d[0],'ht'), inst1.sclType);
testReturns('getD .dop', () => d[0].dop, 'getD');
testReturns('getD (dop)', () => msgd(d[0],'dop'), 'getD');
testReturns('getD .mop', () => d[0].mop, 'getD');
testReturns('getD (mop)', () => msgd(d[0],'mop'), 'getD');
})();

console.log('[****] Check basic dispatch ([noSuchMessage])');
(() => {
const d = inst1({ op: 'noSuchMessage', else: [ 0, 'else' ] });
if (testReturns('noSuchMessage handler', () => d[1], 'default')) {
    testReturns('noSuchMessage .dop', () => d[0].dop, 'noSuchMessage');
    testReturns('noSuchMessage (dop)', () => msgd(d[0],'dop'), 'noSuchMessage');
    testReturns('noSuchMessage .mop', () => d[0].mop, 'noSuchMessage');
    testReturns('noSuchMessage (mop)', () => msgd(d[0],'mop'), 'noSuchMessage');
}
})();

console.log('[****] Check redispatch');
testReturns('Leaf redispatch', () => inst1('redis', {}), undefined);
if (testReturns('Redispatch different op', () => inst1('redis', { op: 'getD' }), res => res?.[1] === 'getD')) {
    const d = inst1('redis', { op: 'getD' });
    testReturns('Redis diff op .dop', () => d[0].dop, 'getD');
    testReturns('Redis diff op (dop)', () => msgd(d[0],'dop'), 'getD');
    testReturns('Redis diff op .mop', () => d[0].mop, 'redis');
    testReturns('Redis diff op (mop)', () => msgd(d[0],'mop'), 'redis');
}
testReturns('Redispatch invalid type', () => inst1('redis', { op: 'getD', type: 'x' }), undefined);
testReturns('Redispatch to default', () => inst1('redis', { op: 'noSuchMessage' }),  res => res[1] === 'default');

// const sif2 = getInterface('?');

testSummary();
