// Mesgjs runtime vendor dependencies [#SDEV#]

// Development (src) vendor dependencies
export { isIndex, NANOS, parseQJSON, parseSLID } from 'https://cdn.jsdelivr.net/gh/mesgjs/nanos@0.0.12/src/nanos.esm.js';
export { reactive } from 'https://cdn.jsdelivr.net/gh/mesgjs/reactive@0.0.3/src/reactive.esm.js';

`// Production (dist) vendor dependencies [#EDEV#]
export { isIndex, NANOS, parseQJSON, parseSLID } from 'https://cdn.jsdelivr.net/gh/mesgjs/nanos@0.0.12/dist/nanos.min.esm.js';
export { reactive } from 'https://cdn.jsdelivr.net/gh/mesgjs/reactive@0.0.3/dist/reactive.min.esm.js';
//`; // #DEV#
