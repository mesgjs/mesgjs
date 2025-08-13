// Load the Mesgjs runtime (a side-effect of importing mesgjs.esm.js).
// This is a static import "bridge" to get deno.json import-map functionality.
// await import('./runtime-loader.esm.js');
import 'mesgjs/src/runtime/mesgjs.esm.js';
// Mesgjs runtime globals (such as $c) are now available.