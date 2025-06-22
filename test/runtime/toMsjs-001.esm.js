import 'mesgjs/runtime/mesgjs.esm.js'
import { testReturns, testSummary } from 'mesgjs/test/test.esm.js';
import { NANOS } from 'mesgjs/runtime/vendor.esm.js';

console.log('[****] $toMsjs');

testReturns('toMsjs true', () => $toMsjs(true).msjsType, '@true');
testReturns('toMsjs false', () => $toMsjs(false).msjsType, '@false');
testReturns('toMsjs null', () => $toMsjs(null).msjsType, '@null');
testReturns('toMsjs undefined', () => $toMsjs(undefined).msjsType, '@undefined');
testReturns('toMsjs bigint', () => $toMsjs(10n).msjsType, '@number');
testReturns('toMsjs number', () => $toMsjs(10).msjsType, '@number');
testReturns('toMsjs string', () => $toMsjs('text').msjsType, '@string');
const n1 = new NANOS(); let n1o;
testReturns('toMsjs NANOS', () => (n1o = $toMsjs(n1)).msjsType, '@list');
testReturns('toMsjs same NANOS', () => $toMsjs(n1), res => res === n1o);
const a1 = []; let a1o;
testReturns('toMsjs []', () => (a1o = $toMsjs(a1)).msjsType, '@jsArray');
testReturns('toMsjs same []', () => $toMsjs(a1), res => res === a1o);

testSummary();
