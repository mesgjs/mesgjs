import 'mesgjs/runtime/mesgjs.esm.js';
import { testReturns, testSummary } from 'mesgjs/test/test.esm.js';
import { getInstance, jsToSCL } from 'mesgjs/runtime/runtime.esm.js';

console.log('[****] @regex');

(() => {
    let re;
    if (testReturns('@regex inst', () => {
	re = getInstance('@regex', [ '(foo)?(bar)?', 'gi' ]);
    }, () => re?.sclType === '@regex')) {
	testReturns('@regex (source)', () => re('source'), '(foo)?(bar)?');
	testReturns('@regex (flags)', () => re('flags'), 'gi');
	if (testReturns('@regex .jsv type', () => typeof re.jsv, 'object')) {
	    if (testReturns('@regex .jsv cons name', () => re.jsv.constructor.name, 'RegExp')) {
		testReturns('@regex .jsv.source', () => re.jsv.source, '(foo)?(bar)?');
		testReturns('@regex .jsv.flags', () => re.jsv.flags, 'gi');
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
	    if (testReturns('@s(re) .jsv type', () => typeof re.jsv, 'object')) {
		if (testReturns('@s(re) .jsv cons name', () => re.jsv.constructor.name, 'RegExp')) {
		    testReturns('@s(re) .jsv.source', () => re.jsv.source, '(foo)?(bar)?');
		    testReturns('@s(re) .jsv.flags', () => re.jsv.flags, 'gi');
		}
	    }
	}
    }
})();

testSummary();
