# Addendum: The `js-view` Pattern for Bilingual Interfaces

This document details the standard and most robust pattern for creating "JavaScript-Managed State" bilingual interfaces in the Mesgjs Web Interface (MWI). It supersedes other documented patterns by prioritizing a clean, explicit API contract over prototype manipulation.

The core principle is **explicitness**: JavaScript consumers are made aware that they are interacting with a Mesgjs object and should access its underlying JavaScript instance through a dedicated property.

## The Pattern: The `.jsv` Property

Instead of altering the Mesgjs receiver's prototype chain, we simply attach the underlying JavaScript class instance to a read-only property on the receiver itself. By convention, this property is named `.jsv` (for "JavaScript View").

This approach has several key advantages:
1.  **Simplicity & Robustness:** It requires zero prototype manipulation, eliminating a whole class of potential bugs and edge cases. The Mesgjs receiver (`d.rr`) remains a standard, callable function.
2.  **Explicit API Contract:** It is perfectly clear to a JavaScript developer that they have a Mesgjs object and that the "pure" JavaScript part of it is accessible via `.jsv`. There is no confusing magic.
3.  **Preserves Mesgjs Identity:** The Mesgjs object can still be messaged directly, and its identity as a receiver is never compromised.

### The Key Ingredients

1.  **A JavaScript Class:** Contains the "source of truth" for the state and logic.
2.  **A `d.rr.jsv` Property:** A read-only property on the Mesgjs receiver (`d.rr`) that holds the instance of the JavaScript class.
3.  **A `d.octx.js` Property:** The same JS instance is stored in the object context for efficient access by internal message handlers (via the `d.js` shortcut).

### The `opInit` Implementation

The `@init` handler becomes remarkably simple. It just creates the JS instance and attaches it in two places.

```javascript
// In your component's .esm.js file

function opInit (d) {
    // 1. Create the JS class instance.
    const vnode = new MWICSRVNode(d);

    // 2. Attach it for internal and external access.
    setRO(d.octx, 'js', vnode); // For internal handlers via d.js
    setRO(d.rr, 'jsv', vnode);   // For external JS consumers
}

getInterface('myInterface').set({
    handlers: {
        '@init': opInit,
        // ... other handlers that use d.js ...
    }
});
```

### How it Works in Practice

**From JavaScript:**

The consumer receives the Mesgjs object and accesses the JavaScript view via `.jsv`.

```javascript
// getInstance returns the Mesgjs receiver (d.rr)
const myVNode = getInstance('mwiCsrVnode', { tag: 'p' });

// Access the JS instance directly and call its methods.
myVNode.jsv.setAttr('id', 'my-paragraph');

// The Mesgjs receiver is still available for sending messages.
myVNode('on', 'click', { handler: clickHandler });
```

This pattern is the standard for MWI and should be used for all new bilingual components where state is managed by a JavaScript class.