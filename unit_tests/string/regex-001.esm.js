import { testReturns, testSummary } from 'syscl/test.esm.js';
import { getInstance, jsToSCL } from 'syscl/runtime.esm.js';

console.log('[****] @regex');

(() => {
    let re;
    if (testReturns('@regex inst', () => {
	re = getInstance('@regex', [ '(foo)?(bar)?', 'gi' ]);
    }, () => re?.sclType === '@regex')) {
	testReturns('@regex (source)', () => re('source'), '(foo)?(bar)?');
	testReturns('@regex (flags)', () => re('flags'), 'gi');
	if (testReturns('@regex .re type', () => typeof re.re, 'object')) {
	    if (testReturns('@regex .re cons name', () => re.re.constructor.name, 'RegExp')) {
		testReturns('@regex .re.source', () => re.re.source, '(foo)?(bar)?');
		testReturns('@regex .re.flags', () => re.re.flags, 'gi');
	    }
	}
    }
})();

(() => {
    let restr, re;
    if (testReturns('jts RE string', () => {
	restr = jsToSCL('(foo)?(bar)?');
    }, () => restr?.sclType === '@string')) {
	if (testReturns('@string(regex)', () => {
	    re = restr('regex', [ 'gi' ]);
	}, () => re?.sclType === '@regex')) {
	    testReturns('@s(re) (source)', () => re('source'), '(foo)?(bar)?');
	    testReturns('@s(re) (flags)', () => re('flags'), 'gi');
	    if (testReturns('@s(re) .re type', () => typeof re.re, 'object')) {
		if (testReturns('@s(re) .re cons name', () => re.re.constructor.name, 'RegExp')) {
		    testReturns('@s(re) .re.source', () => re.re.source, '(foo)?(bar)?');
		    testReturns('@s(re) .re.flags', () => re.re.flags, 'gi');
		}
	    }
	}
    }
})();

testSummary();
