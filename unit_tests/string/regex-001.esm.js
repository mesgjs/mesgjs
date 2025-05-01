import { testReturns, testSummary } from 'syscl/test.esm.js';
import { getInstance, jsToSCL } from 'syscl/runtime.esm.js';

console.log('[****] @regex');

let re1;
if (testReturns('@regex inst', () => {
    re1 = getInstance('@regex', [ '(foo)?(bar)?', 'gi' ]);
}, () => re1?.sclType === '@regex')) {
    testReturns('@regex (source)', () => re1('source'), '(foo)?(bar)?');
    testReturns('@regex (flags)', () => re1('flags'), 'gi');
    if (testReturns('@regex .re type', () => typeof re1.re, 'object')) {
	if (testReturns('@regex .re cons name', () => re1.re.constructor.name, 'RegExp')) {
	    testReturns('@regex .re.source', () => re1.re.source, '(foo)?(bar)?');
	    testReturns('@regex .re.flags', () => re1.re.flags, 'gi');
	}
    }
}

let restr2, re2;
if (testReturns('jts RE string', () => {
    restr2 = jsToSCL('(foo)?(bar)?');
}, () => restr2?.sclType === '@string')) {
    if (testReturns('@string(regex)', () => {
	re2 = restr2('regex', [ 'gi' ]);
    }, () => re2?.sclType === '@regex')) {
	testReturns('@s(re) (source)', () => re2('source'), '(foo)?(bar)?');
	testReturns('@s(re) (flags)', () => re2('flags'), 'gi');
	if (testReturns('@s(re) .re type', () => typeof re2.re, 'object')) {
	    if (testReturns('@s(re) .re cons name', () => re2.re.constructor.name, 'RegExp')) {
		testReturns('@s(re) .re.source', () => re2.re.source, '(foo)?(bar)?');
		testReturns('@s(re) .re.flags', () => re2.re.flags, 'gi');
	    }
	}
    }
}

testSummary();
