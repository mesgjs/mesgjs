import 'mesgjs/runtime/mesgjs.esm.js';
import { getInstance, getInterface } from 'mesgjs/runtime/runtime.esm.js';
import { test, testReturns, testSummary } from 'mesgjs/test/test.esm.js';

const msgd = (d, op, mp) => d.sm(d, op, mp);

console.log('[****] Setup');

let aif1;
test('Create first anonymous interface', () => { aif1 = getInterface('?'); });
test('Check first interface name', () => {
    if (!aif1.ifName) throw new Error('Interface name (.ifName) is missing');
    if (aif1.ifName[0] !== '?' || aif1.ifName === '?') throw new Error(`Unexpected interface name ${aif1.ifName}`);
});

test('Configure first interface', () => {
    aif1.set({
	handlers: {
	    both: d => [ d, 'both', msgd(d, 'redis') ],
	    getD: d => [ d, 'getD' ],
	    redis: d => msgd(d, { op: 'redis', params: d.mp }),
	    '@default': d => [ d, 'default' ],
	},
    });
});

let inst1;
test('Get first interface instance', () => { inst1 = getInstance(aif1.ifName) });
testReturns('Verify first instance type', () => inst1.sclType, res => res === aif1.ifName);

let aif2;
test('Create second anonymous interface', () => { aif2 = getInterface('?'); });
test('Check second interface name', () => {
    if (aif1.ifName[0] !== '?' || aif1.ifName === '?') throw new Error(`Unexpected interface name ${aif1.ifName}`);
});
test('Check interface names differ', () => {
    if (aif1.ifName === aif2.ifName) throw new Error(`Both interfaces are named ${aif1.ifName}`);
});

test('Configure second interface', () => {
    aif2.set({
	chain: [ aif1.ifName ],
	handlers: {
	    both: d => [ d, 'both', msgd(d, 'redis') ],
	    only2: d => [ d, 'only2', msgd(d, 'redis') ],
	    '@default': d => [ d, 'default', msgd(d, 'redis') ],
	},
    });
});

let inst2;
test('Get second interface instance', () => { inst2 = getInstance(aif2.ifName) });
testReturns('Verify second instance type', () => inst2.sclType, res => res === aif2.ifName);

console.log('[****] Check basic dispatch (getD)');
(() => {
    const d = inst1('getD');
    testReturns('getD handler', () => d[1], 'getD');
    testReturns('getD .rr', () => d[0].rr, res => res === inst1);
    testReturns('getD (rr)', () => msgd(d[0],'rr'), res => res === inst1);
    testReturns('getD .rt', () => d[0].rt, res => res === inst1.sclType);
    testReturns('getD (rt)', () => msgd(d[0],'rt'), res => res === inst1.sclType);
    testReturns('getD .ht', () => d[0].ht, res => res === inst1.sclType);
    testReturns('getD (ht)', () => msgd(d[0],'ht'), res => res === inst1.sclType);
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

console.log('[****] Chained dispatches');
(() => {
    let d;
    if (test('if2/if1(getD)', () => d = inst2('getD'))) {
	testReturns('getD .ht if1', () => d[0].ht, res => res === aif1.ifName);
	testReturns('getD (ht) if1', () => msgd(d[0],'ht'), res => res === aif1.ifName);
	testReturns('getD .rr', () => d[0].rr, res => res === inst2);
	testReturns('getD .rt if2', () => d[0].rt, res => res === aif2.ifName);
	testReturns('getD (rt) if2', () => msgd(d[0],'rt'), res => res === aif2.ifName);
	testReturns('getD .dop', () => d[0].dop, 'getD');
	testReturns('getD (dop)', () => msgd(d[0],'dop'), 'getD');
	testReturns('getD .mop', () => d[0].mop, 'getD');
	testReturns('getD (mop)', () => msgd(d[0],'mop'), 'getD');
    }
})();

(() => {
    let d;
    if (test('if2(only2)', () => d = inst2('only2'))) {
	testReturns('only2 dispatch 1', () => d[1], 'only2');
	testReturns('only2 dispatch 2', () => d[2], undefined);
    }
})();

(() => {
    let d;
    if (test('if2(both)', () => d = inst2('both'))) {
	testReturns('both dispatch 1', () => d[1], 'both');
	if (testReturns('both dispatch 2', () => d[2][1], 'both')) {
	    testReturns('both dispatch 3', () => d[2][2], undefined);
	}
    }
})();

(() => {
    let d;
    if (test('if2(noSuchMessage)', () => d = inst2('noSuchMessage'))) {
	testReturns('noSuchMessage dispatch 1', () => d[1], 'default');
	if (testReturns('noSuchMessage dispatch 2', () => d[2][1], 'default')) {
	    testReturns('noSuchMessage dispatch 3', () => d[2][2], undefined);
	}
    }
})();

testSummary();
