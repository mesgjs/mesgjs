import 'mesgjs/runtime/mesgjs.esm.js'
import { testReturns, testSummary } from 'mesgjs/test/test.esm.js';
import { NANOS } from 'mesgjs/runtime/vendor.esm.js';

console.log('[****] $toMSJS');

testReturns('toMSJS true', () => $toMSJS(true).msjsType, '@true');
testReturns('toMSJS false', () => $toMSJS(false).msjsType, '@false');
testReturns('toMSJS null', () => $toMSJS(null).msjsType, '@null');
testReturns('toMSJS undefined', () => $toMSJS(undefined).msjsType, '@undefined');
testReturns('toMSJS bigint', () => $toMSJS(10n).msjsType, '@number');
testReturns('toMSJS number', () => $toMSJS(10).msjsType, '@number');
testReturns('toMSJS string', () => $toMSJS('text').msjsType, '@string');
const n1 = new NANOS(); let n1o;
testReturns('toMSJS NANOS', () => (n1o = $toMSJS(n1)).msjsType, '@list');
testReturns('toMSJS same NANOS', () => $toMSJS(n1), res => res === n1o);
const a1 = []; let a1o;
testReturns('toMSJS []', () => (a1o = $toMSJS(a1)).msjsType, '@jsArray');
testReturns('toMSJS same []', () => $toMSJS(a1), res => res === a1o);

testSummary();
