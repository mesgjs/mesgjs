# Message Parameter Normalization

When sending messages to Mesgjs objects from JavaScript, the third argument (message parameters) is automatically normalized to a NANOS instance. This allows you to pass parameters in various convenient JavaScript formats while ensuring consistent handling inside Mesgjs message handlers.

## Supported Parameter Formats

You can pass message parameters in any of these formats:

### JavaScript Arrays
```javascript
$c.sm(receiver, 'operation', [value1, value2, value3]);
```
The array is converted to a NANOS instance with positional values at numeric indices (0, 1, 2, ...).

### Plain JavaScript Objects
```javascript
$c.sm(receiver, 'operation', { key1: 'value1', key2: 'value2' });
```
The object's properties become named parameters in the NANOS instance.

### JavaScript Maps
```javascript
$c.sm(receiver, 'operation', new Map([['key1', 'value1'], ['key2', 'value2']]));
```
The Map entries are converted to NANOS key/value pairs.

### JavaScript Sets
```javascript
$c.sm(receiver, 'operation', new Set([value1, value2, value3]));
```
The Set values become positional parameters with numeric indices.

### NANOS Instances (Native)
```javascript
import { NANOS } from './runtime/vendor.esm.js';
$c.sm(receiver, 'operation', new NANOS([value1, value2]));
```
NANOS instances are used directly without conversion.

**Note:** If you want to pass an array, object, Map, or Set as a single parameter value (rather than having it assimilated into the parameter structure), wrap it in an array:
```javascript
// This assimilates the array into parameters
$c.sm(receiver, 'operation', [1, 2, 3]);  // Results in params at indices 0, 1, 2

// This passes the array as a single parameter
$c.sm(receiver, 'operation', [[1, 2, 3]]);  // Results in the array at index 0
```

### Scalar Values
```javascript
$c.sm(receiver, 'operation', 'singleValue');
```
A single scalar value is wrapped in a NANOS instance as the first positional parameter (index 0).

### Undefined or Omitted
```javascript
$c.sm(receiver, 'operation');
// or
$c.sm(receiver, 'operation', undefined);
```
An empty NANOS instance is created.

## How It Works

The normalization happens automatically in [`MsjsObject.sm()`](../src/runtime/runtime.esm.js:981) (the static send-message method):

```javascript
if (!(mp instanceof NANOS)) mp = (mp == null) ? new NANOS() : new NANOS(mp);
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
    
    // Use default values for optional parameters
    // (at returns undefined for missing keys, or the default if provided)
    const optional = mp.at('optional', 'defaultValue');
    const count = mp.at('count', 0);
    
    // Check if a parameter exists (only needed if undefined is a valid value)
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

**Note:** The `at` method accepts an optional default value as its second parameter. If the key doesn't exist, the default is returned instead of `undefined`. The `has` method can often be skipped unless you need to distinguish between a missing key and a key with an `undefined` value.

## Mixed Positional and Named Parameters

You can mix positional and named parameters in several ways:

### From JavaScript Arrays with Named Properties
```javascript
const params = [value1, value2];
params.name = 'Alice';
$c.sm(receiver, 'operation', params);
```

### From Plain Objects with Numeric Keys
```javascript
$c.sm(receiver, 'operation', { 0: value1, 1: value2, name: 'Alice' });
```

### Using NANOS Directly
```javascript
import { NANOS } from './runtime/vendor.esm.js';
const params = new NANOS([value1, value2]);
params.set('name', 'Alice');
$c.sm(receiver, 'operation', params);
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
$c.sm(receiver, { op: 'operation', params: [value1, value2] });

// The params value goes through the same normalization
$c.sm(receiver, { op: 'operation', params: { key: 'value' } });
```

See [Mesgjs Messaging Overview](Mesgjs-Messaging-Overview.md) for more details on list-op messages.

## Best Practices

### For Simple Positional Parameters
Use arrays for clarity:
```javascript
$c.sm(receiver, 'add', [10, 20]);
```

### For Named Parameters
Use plain objects for readability:
```javascript
$c.sm(receiver, 'configure', { host: 'localhost', port: 8080 });
```

### For Complex Structures
Use NANOS directly when you need fine control:
```javascript
import { NANOS } from './runtime/vendor.esm.js';
const params = new NANOS();
params.set('config', configObject);
params.set('callback', callbackFunction);
$c.sm(receiver, 'initialize', params);
```

**Better approach:** Use `NANOS.fromPairs()` or the `ls()` convenience wrapper (available in module scope) for more compact parameter construction:
```javascript
import { listFromPairs } from './runtime/runtime.esm.js';
const ls = listFromPairs;

// Compact syntax: empty keys get sequential numeric indices
$c.sm(receiver, 'initialize', ls([, pos1, 'key1', value1, , pos2]));
// Results in: 0: pos1, key1: value1, 1: pos2
```

This allows easy switching between positional and named parameters in a single, readable expression.

### For No Parameters
Simply omit the third argument:
```javascript
$c.sm(receiver, 'reset');
```

## See Also

- [Mesgjs Messaging Overview](Mesgjs-Messaging-Overview.md) - Complete guide to message passing
- [JavaScript Interface Development](JavaScript-Interface-Development.md) - Creating message handlers
- [JavaScript Runtime Reference](JavaScript-Runtime-Reference.md) - Runtime API reference
- [`@list` Interface](interfaces/@list.md) - The NANOS/list interface documentation
