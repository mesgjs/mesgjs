# Message Parameter Normalization

When calling Mesgjs message receivers from JavaScript, the second argument (message parameters) is automatically normalized to a NANOS instance. This allows you to pass parameters in various convenient JavaScript formats while ensuring consistent handling inside Mesgjs message handlers.

## Supported Parameter Formats

You can pass message parameters in any of these formats:

### JavaScript Arrays
```javascript
receiver('operation', [value1, value2, value3]);
```
The array is converted to a NANOS instance with positional values at numeric indices (0, 1, 2, ...).

### Plain JavaScript Objects
```javascript
receiver('operation', { key1: 'value1', key2: 'value2' });
```
The object's properties become named parameters in the NANOS instance.

### JavaScript Maps
```javascript
receiver('operation', new Map([['key1', 'value1'], ['key2', 'value2']]));
```
The Map entries are converted to NANOS key/value pairs.

### JavaScript Sets
```javascript
receiver('operation', new Set([value1, value2, value3]));
```
The Set values become positional parameters with numeric indices.

### NANOS Instances (Native)
```javascript
import { NANOS } from './runtime/vendor.esm.js';
receiver('operation', new NANOS([value1, value2]));
```
NANOS instances are used directly without conversion.

**Note:** If you want to pass an array, object, Map, or Set as a single parameter value (rather than having it assimilated into the parameter structure), wrap it in an array:
```javascript
// This assimilates the array into parameters
receiver('operation', [1, 2, 3]);  // Results in params at indices 0, 1, 2

// This passes the array as a single parameter
receiver('operation', [[1, 2, 3]]);  // Results in the array at index 0
```

### Scalar Values
```javascript
receiver('operation', 'singleValue');
```
A single scalar value is wrapped in a NANOS instance as the first positional parameter (index 0).

### Undefined or Omitted
```javascript
receiver('operation');
// or
receiver('operation', undefined);
```
An empty NANOS instance is created.

## How It Works

The normalization happens automatically in the Mesgjs runtime's message processing pipeline ([`canMesgProps()`](../src/runtime/runtime.esm.js:209) at line 229):

```javascript
if (!(mp instanceof NANOS)) mp = new NANOS(mp ?? []);
```

This means that **inside every message handler**, `d.mp` (the message parameters) is always a NANOS instance, regardless of what format was passed from JavaScript.

## Accessing Parameters in Handlers

Inside a message handler, you access parameters using the NANOS interface:

```javascript
function opMyOperation(d) {
    const { mp } = d;  // mp is always a NANOS instance
    
    // Get positional parameters
    const first = mp.at(0);
    const second = mp.at(1);
    
    // Get named parameters
    const name = mp.at('name');
    const value = mp.at('value');
    
    // Check if a parameter exists
    if (mp.has('optional')) {
        const opt = mp.at('optional');
    }
    
    // Iterate over all parameters
    for (const [key, value] of mp.entries()) {
        console.log(`${key}: ${value}`);
    }
    
    return someResult;
}
```

## Mixed Positional and Named Parameters

You can mix positional and named parameters in several ways:

### From JavaScript Arrays with Named Properties
```javascript
const params = [value1, value2];
params.name = 'Alice';
receiver('operation', params);
```

### From Plain Objects with Numeric Keys
```javascript
receiver('operation', { 0: value1, 1: value2, name: 'Alice' });
```

### Using NANOS Directly
```javascript
import { NANOS } from './runtime/vendor.esm.js';
const params = new NANOS([value1, value2]);
params.set('name', 'Alice');
receiver('operation', params);
```

**Note:** When constructing NANOS instances with multiple arguments, each argument is pushed sequentially. Arrays have their indices offset by the current `.next` value:
```javascript
// More typical patterns:
new NANOS([value1, value2], { name: 'Alice' });  // Key order: 0, 1, 'name'
new NANOS({ name: 'Alice' }, [value1, value2]);  // Key order: 'name', 0, 1

// Array indices are offset by .next:
new NANOS([, value1], [, value2]);  // Values end up at indices 1 and 3
```

All these approaches allow mixing positional and named parameters in the handler.

## List-Op Messages

When using list-op style messages (where the operation itself is part of a list/object), the `params` key can specify the message parameters:

```javascript
// List-op with explicit params
receiver({ op: 'operation', params: [value1, value2] });

// The params value goes through the same normalization
receiver({ op: 'operation', params: { key: 'value' } });
```

See [Mesgjs Messaging Overview](Mesgjs-Messaging-Overview.md) for more details on list-op messages.

## Best Practices

### For Simple Positional Parameters
Use arrays for clarity:
```javascript
receiver('add', [10, 20]);
```

### For Named Parameters
Use plain objects for readability:
```javascript
receiver('configure', { host: 'localhost', port: 8080 });
```

### For Complex Structures
Use NANOS directly when you need fine control:
```javascript
import { NANOS } from './runtime/vendor.esm.js';
const params = new NANOS();
params.set('config', configObject);
params.set('callback', callbackFunction);
receiver('initialize', params);
```

**Better approach:** Use `NANOS.fromPairs()` or the `ls()` convenience wrapper (available in module scope) for more compact parameter construction:
```javascript
import { listFromPairs } from './runtime/runtime.esm.js';
const ls = listFromPairs;

// Compact syntax: empty keys get sequential numeric indices
receiver('initialize', ls([, pos1, 'key1', value1, , pos2]));
// Results in: 0: pos1, key1: value1, 1: pos2
```

This allows easy switching between positional and named parameters in a single, readable expression.

### For No Parameters
Simply omit the second argument:
```javascript
receiver('reset');
```

## See Also

- [Mesgjs Messaging Overview](Mesgjs-Messaging-Overview.md) - Complete guide to message passing
- [JavaScript Interface Development](JavaScript-Interface-Development.md) - Creating message handlers
- [JavaScript Runtime Reference](JavaScript-Runtime-Reference.md) - Runtime API reference
- [`@list` Interface](interfaces/@list.md) - The NANOS/list interface documentation
