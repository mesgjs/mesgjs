# Unified List Utilities (Runtime Developer Reference)

The unified list utilities ([`src/runtime/unified-list.esm.js`](../../src/runtime/unified-list.esm.js:1)) provide internal runtime functions for working uniformly with various JavaScript data structures (arrays, plain objects, Maps, Sets, and NANOS instances). These utilities are used internally by the Mesgjs runtime and are **not part of the public API**.

## Purpose

These utilities enable runtime code to handle different JavaScript collection types with a consistent interface, which is particularly useful when:

1. Implementing interface operations that need to traverse nested structures
2. Processing debug configuration that might come from various sources
3. Working with data that could be in any of several JavaScript formats

## Key Functions

### `unifiedList(value, promote)`

Wraps various data structures in a consistent `ListProxy` interface.

**Parameters:**
- `value`: The value to wrap (Array, Object, Map, Set, NANOS, or scalar)
- `promote`: If `true`, promotes scalar values to single-element lists; `undefined` becomes an empty list

**Returns:**
- The original value if it's already a NANOS or ListProxy
- A new `ListProxy` wrapping the value if it's a supported collection type
- The raw value if `promote` is false and the value is not a collection
- An empty list if `promote` is true and value is `undefined`
- A single-element list if `promote` is true and value is a scalar

**Usage in Runtime:**
```javascript
import { unifiedList } from './unified-list.esm.js';

// In debugConfig (runtime.esm.js:241)
function debugConfig(set) {
    set = unifiedList(set);  // Accept any collection type
    for (const k of Object.keys(dbgCfg)) {
        if (set?.has?.(k)) dbgCfg[k] = !!set.at(k);
    }
    return new NANOS(dbgCfg);
}

// In path-based operations (msjs-list.esm.js:18)
function opAt(d) {
    const { mp } = d;
    const path = mp.has('path') ? 
        unifiedList(mp.at('path')).values() : 
        mp.values();
    return uniAt(d.js, [...path], { wrap: true });
}
```

### `uniAt(obj, keyPath, opts)`

Traverses mixed-type object structures using a key path, working across NANOS, Arrays, Objects, Maps, and Sets.

**Parameters:**
- `obj`: The object to traverse
- `keyPath`: A single key or array/list of keys defining the path
- `opts`: Options object
  - `default`: Default value if key not found
  - `defaultFn`: Function to call if key not found (takes precedence over `default`)
  - `wrap`: If `true`, wraps negative indices relative to the object's "next" index
  - `raw`: For NANOS objects, returns raw values without Mesgjs wrapping

**Returns:** The value at the specified path, or the default value if not found

**Usage in Runtime:**
```javascript
import { uniAt } from './unified-list.esm.js';

// In @list(at) operation (msjs-list.esm.js:17-21)
function opAt(d) {
    const { mp } = d;
    const path = mp.has('path') ? 
        unifiedList(mp.at('path')).values() : 
        mp.values();
    return uniAt(d.js, [...path], { 
        wrap: true, 
        raw: mp.at('raw'),
        defaultFn: () => {
            if (mp.has('default')) return mp.at('default');
            throw new ReferenceError('Key not found');
        }
    });
}
```

### `uniHas(obj, key)`

Checks if an object has a specific key, working across different data structure types.

**Parameters:**
- `obj`: The object to check
- `key`: The key to look for

**Returns:** `true` if the key exists, `false` otherwise, `undefined` for unsupported types

**Implementation Details:**
- For NANOS, Map, Set: Uses their native `.has()` method
- For Arrays and plain Objects: Uses `Object.hasOwn()`
- Automatically unwraps Mesgjs objects to access their `.jsv` property

### `uniNext(obj)`

Returns the next available numeric index for map-like values.

**Parameters:**
- `obj`: The object to check

**Returns:** 
- For NANOS: Returns the `.next` property
- For Arrays: Returns `.length`
- For Objects/Maps: Returns one more than the highest numeric key (or 0 if none)

**Usage:**
```javascript
import { uniNext } from './unified-list.esm.js';

const arr = [1, 2, 3];
uniNext(arr);  // 3

const obj = { 0: 'a', 2: 'b', name: 'test' };
uniNext(obj);  // 3 (highest numeric key is 2)
```

### `wrapKey(obj, key)`

Wraps negative index keys relative to the object's "next" index, enabling Python-style negative indexing.

**Parameters:**
- `obj`: The object to check
- `key`: The key to wrap (if negative)

**Returns:** The wrapped key, or `undefined` if the wrapped key would be negative

**Example:**
```javascript
import { wrapKey } from './unified-list.esm.js';

const arr = [1, 2, 3, 4, 5];
wrapKey(arr, -1);   // 4 (last element)
wrapKey(arr, -2);   // 3 (second to last)
wrapKey(arr, -10);  // undefined (would be negative)
```

### `isPlainObject(obj)`

Determines if a value is a plain JavaScript object (not an array, Map, Set, or other special object).

**Parameters:**
- `obj`: The value to check

**Returns:** `true` if the value is a plain object, `false` otherwise

**Implementation:**
```javascript
export const isPlainObject = (obj) => {
    const type = typeof obj;
    const consName = obj?.constructor?.name;
    return (type === 'object' && obj !== null && 
            (consName === undefined || consName === 'Object'));
};
```

**Note:** This function is re-exported through [`mesgjs.esm.js`](../../src/runtime/mesgjs.esm.js:29) and used in the `toMsjs()` conversion function.

## The ListProxy Class

The `ListProxy` class provides a unified interface over various JavaScript data structures. It is returned by `unifiedList()` for supported collection types.

### Methods

- **`at(key, def)`**: Get value for key, with optional default
- **`get(key, def)`**: Alias for `at()`
- **`has(key)`**: Check if key exists
- **`entries()`**: Iterator over all key/value pairs
- **`keys()`**: Iterator over all keys
- **`values()`**: Iterator over positional (numeric-indexed) values only
- **`indexes()`**: Iterator over numeric keys only
- **`indexEntries()`**: Iterator over numeric key/value pairs
- **`namedEntries()`**: Iterator over non-numeric key/value pairs

### Properties

- **`next`**: The next available numeric index
- **`size`**: Total number of keys in the structure

### Internal Implementation

The `ListProxy` wraps the underlying collection and delegates operations appropriately:

```javascript
class ListProxy {
    constructor(list) {
        this._list = list;
    }
    
    at(key, def) {
        return uniAt(this._list, key, { default: def, wrap: true });
    }
    
    entries() {
        const list = this._list;
        if (list instanceof NANOS || list instanceof Map || list instanceof Set) 
            return list.entries();
        if (isPlainObject(list) || Array.isArray(list)) 
            return Object.entries(list).values();
        return [].entries();
    }
    
    // ... other methods
}
```

## Common Usage Patterns in Runtime

### Pattern 1: Path-Based Traversal

Used in [`@list(at)`](../../src/runtime/msjs-list.esm.js:17), [`@jsArray(at)`](../../src/runtime/js-array.esm.js:17), [`@jsObject(at)`](../../src/runtime/js-object.esm.js:16), and [`@map(at)`](../../src/runtime/js-map.esm.js:17):

```javascript
function opAt(d) {
    const { mp } = d;
    const path = mp.has('path') ? 
        unifiedList(mp.at('path')).values() : 
        mp.values();
    return uniAt(d.js, [...path], { 
        wrap: true,
        defaultFn: () => {
            if (mp.has('default')) return mp.at('default');
            throw new ReferenceError('Key not found');
        }
    });
}
```

### Pattern 2: Debug Configuration

Used in [`debugConfig()`](../../src/runtime/runtime.esm.js:240):

```javascript
function debugConfig(set) {
    set = unifiedList(set);
    for (const k of Object.keys(dbgCfg)) {
        const type = typeof dbgCfg[k];
        if (type === 'boolean' && set?.has?.(k)) {
            dbgCfg[k] = !!set.at(k);
        }
    }
    return new NANOS(dbgCfg);
}
```

### Pattern 3: Type-Agnostic Iteration

Used in [`fmtDispParams()`](../../src/runtime/runtime.esm.js:362):

```javascript
function fmtDispParams(inc, list) {
    if (!inc) return '';
    return [...unifiedList(list).entries()]
        .map((en) => (isIndex(en[0]) ? 
            ` ${loggedType(en[1])}` : 
            ` ${en[0]}=${loggedType(en[1])}`))
        .join('');
}
```

### Pattern 4: KV Iterator Construction

Used in [`@kvIter`](../../src/runtime/msjs-kv-iter.esm.js:88):

```javascript
obj = unifiedList(obj);
if (typeof obj?.keys === 'function') {
    return getInstance('@kvIter', ls([, obj.keys()]));
}
```

## Scope and Visibility

The unified-list utilities are **internal to the runtime** and are not exposed through the public API:

- **Not exported** from [`mesgjs.esm.js`](../../src/runtime/mesgjs.esm.js:1) (except `isPlainObject`)
- **Not exported** from [`runtime.esm.js`](../../src/runtime/runtime.esm.js:1)
- Used only within runtime implementation files

If you're developing a Mesgjs interface and need similar functionality, you should:
1. Import the utilities directly from `unified-list.esm.js` in your runtime module
2. Or use NANOS methods directly, as message parameters are already normalized to NANOS

## See Also

- [Message Parameter Normalization](../Message-Parameter-Normalization.md) - User-facing documentation on parameter handling
- [JavaScript Interface Development](../JavaScript-Interface-Development.md) - Guide for creating interfaces
- [JavaScript Runtime Reference](../JavaScript-Runtime-Reference.md) - Complete runtime API reference
- [`@list` Interface](../interfaces/@list.md) - The NANOS/list interface documentation
