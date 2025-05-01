import { test, testReturns, testSummary } from 'syscl/test.esm.js';
import { jsToSCL, NANOS } from 'syscl/runtime.esm.js';

console.log('[****] jsToSCL');

testReturns('jts true', () => jsToSCL(true).sclType, '@true');
testReturns('jts false', () => jsToSCL(false).sclType, '@false');
testReturns('jts null', () => jsToSCL(null).sclType, '@null');
testReturns('jts undefined', () => jsToSCL(undefined).sclType, '@undefined');
testReturns('jts bigint', () => jsToSCL(10n).sclType, '@number');
testReturns('jts number', () => jsToSCL(10).sclType, '@number');
testReturns('jts string', () => jsToSCL('text').sclType, '@string');
const n1 = new NANOS(); let n1o;
testReturns('jts NANOS', () => (n1o = jsToSCL(n1)).sclType, '@list');
testReturns('jts same NANOS', () => jsToSCL(n1), res => res === n1o);
const a1 = []; let a1o;
testReturns('jts []', () => (a1o = jsToSCL(a1)).sclType, '@jsArray');
testReturns('jts same []', () => jsToSCL(a1), res => res === a1o);

testSummary();
