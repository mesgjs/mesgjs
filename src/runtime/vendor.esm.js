// Mesgjs runtime vendor dependencies [#SDEV#]

// Development (src) vendor dependencies
export { isIndex, isNegIndex, NANOS, parseQJSON, parseSLID } from 'https://cdn.jsdelivr.net/gh/mesgjs/nanos@1.1.0/src/nanos.esm.js';
export { reactive } from 'https://cdn.jsdelivr.net/gh/mesgjs/reactive@0.1.3/src/reactive.esm.js';

`// Production (dist) vendor dependencies [#EDEV#]
export { isIndex, isNegIndex, NANOS, parseQJSON, parseSLID } from 'https://cdn.jsdelivr.net/gh/mesgjs/nanos@1.1.0/dist/nanos.min.esm.js';
export { reactive } from 'https://cdn.jsdelivr.net/gh/mesgjs/reactive@0.1.3/dist/reactive.min.esm.js';
//`; // #DEV#
