# Tutorial: Creating a Bilingual Mesgjs/JavaScript Interface

This tutorial will guide you through the process of creating a "bilingual" interface in Mesgjs. A bilingual interface allows an object to be controlled both by standard Mesgjs messages and by conventional JavaScript method calls, providing a seamless experience for developers working in either language.

There are two primary patterns for building such interfaces, depending on where you want the "source of truth" for your object's state to live. We will explore both.

## Prerequisites

Before you begin, you should have a solid understanding of Mesgjs syntax and messaging. It is highly recommended to review the following documents first:

*   [`docs/Mesgjs-Syntax.md`](docs/Mesgjs-Syntax.md)
*   [`docs/Mesgjs-Language-Overview.md`](docs/Mesgjs-Language-Overview.md)
*   [`docs/interfaces/@core-etc.md`](docs/interfaces/@core-etc.md)
*   [`docs/interfaces/@list.md`](docs/interfaces/@list.md)

## The Goal

Our goal is to create a `counter` object that works identically from both Mesgjs and JavaScript:

**In Mesgjs:**

```mesgjs
# Get a new counter instance and store it in scratch space.
#(nset counter=@c(get counter init=[initialValue=10]))

# Increment the counter.
#counter(increment)

# Get the current value and log it to the console.
@c(log #counter(value))
```

**In JavaScript:**

```javascript
const myCounter = getInstance('counter', { initialValue: 10 });
myCounter.increment();
console.log(myCounter.value());
```

---

## Pattern 1: JavaScript-Managed State (Open State)

This pattern is best for components where the state is not sensitive and is primarily managed by JavaScript logic. The Mesgjs interface acts as a thin wrapper around a standard JavaScript class or object.

**Use Case:** UI components, non-critical application state, wrappers for existing JS libraries.

### Step 1: The JavaScript Class

First, we create a standard JavaScript class to manage the counter's state and logic.

```javascript
// In counter.esm.js
class Counter {
    constructor(initialValue = 0) {
        this.count = initialValue;
    }

    increment() {
        this.count++;
    }

    decrement() {
        this.count--;
    }

    value() {
        return this.count;
    }
}
```

### Step 2: The Bilingual Interface

Now, we create the Mesgjs interface. The `@init` handler will create an instance of our `Counter` class and attach it to the Mesgjs object's context (`d.octx.js`). The other handlers will simply delegate to this JS instance.

```javascript
// In counter.esm.js, inside loadMSJS()

// The @init handler creates the JS class instance
function opInit_JS(d) {
    const initialValue = d.mp.has('initialValue') ? d.mp.at('initialValue') : 0;
    d.octx.js = new Counter(initialValue);
    Object.setPrototypeOf(d.rr, d.octx.js); // Attach the JS instance as the prototype
}

const counterInterface_JS = getInterface('counter_js');
counterInterface_JS.set({
    lock: true,
    pristine: true,
    handlers: {
        '@init': opInit_JS,
        'increment': d => d.js.increment(),
        'decrement': d => d.js.decrement(),
        'value': d => d.js.value()
    }
});
```
*Note: By setting the prototype to our `Counter` instance, we directly expose its methods (`increment`, `value`, etc.) on the Mesgjs object (`d.rr`) for the JavaScript side to call.*

---

## Pattern 2: Mesgjs-Managed State (Protected State)

This pattern is ideal when the state should be protected by Mesgjs's security model. The state lives in the Mesgjs object's private persistent storage (`%`). The JavaScript methods send messages *to themselves* to trigger the Mesgjs handlers, which are the only code that can access the state.

**Use Case:** Interfaces dealing with sensitive data, business logic that must be enforced, or when the primary interaction model is Mesgjs-first.

### Step 1: The JavaScript Prototype

First, we define a JavaScript prototype. Its methods don't contain logic; they just send messages back to the Mesgjs object (`this`).

```javascript
// In counter.esm.js, inside loadMSJS()

const CounterPrototype = Object.setPrototypeOf({
    increment() {
        return this('increment'); // 'this' is the Mesgjs object
    },
    decrement() {
        return this('decrement');
    },
    value() {
        return this('value');
    }
}, Function.prototype);
```

### Step 2: The Bilingual Interface

Now, we create the Mesgjs interface. The handlers contain the actual logic and manipulate the private persistent storage (`d.p`).

```javascript
// In counter.esm.js, inside loadMSJS()

// The @init handler sets up the private state and attaches the prototype
function opInit_Mesgjs(d) {
    const initialValue = d.mp.has('initialValue') ? d.mp.at('initialValue') : 0;
    d.p.set('count', initialValue); // State is in d.p
    Object.setPrototypeOf(d.rr, CounterPrototype);
}

const counterInterface_Mesgjs = getInterface('counter_mesgjs');
counterInterface_Mesgjs.set({
    lock: true,
    pristine: true,
    handlers: {
        '@init': opInit_Mesgjs,
        'increment': d => {
            d.p.set('count', d.p.get('count') + 1);
            return d.rr; // Return self for chaining
        },
        'decrement': d => {
            d.p.set('count', d.p.get('count') - 1);
            return d.rr;
        },
        'value': d => d.p.get('count')
    }
});
```

## Conclusion

You have now seen the two primary patterns for creating bilingual interfaces in Mesgjs.

*   **JavaScript-Managed State:** Quick, easy, and familiar for JS developers. Ideal for open, non-sensitive data.
*   **Mesgjs-Managed State:** Leverages Mesgjs's inherent security and data protection. The preferred model for sensitive data and business logic.

Choosing the right pattern depends on the specific needs of your interface. By understanding both, you can build powerful, flexible, and secure applications that seamlessly bridge the Mesgjs and JavaScript worlds.