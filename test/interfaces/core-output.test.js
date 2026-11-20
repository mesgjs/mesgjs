/**
 * Test coverage for @c(output) interface handler:
 * - A single string should always be presented to console[level],
 *   regardless of the number and type of message parameters.
 * - Supported levels: debug, info, log (default), warn, error.
 * - Invalid level fallback: defaults to log.
 * - Separator: sep=' ' by default, or custom separator string.
 * - Transpiled Mesgjs code execution for @c(output).
 */

import { describe, it } from '@compat/test';
import { assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { loadMesgjsModuleSource } from '../harness.esm.js';

const { $toMsjs, $c, $t, $f, $n, $u, NANOS } = globalThis;

/**
 * Helper to intercept console method calls during a callback.
 * Returns an object with calls array for each level: debug, info, log, warn, error.
 */
function captureConsole (fn) {
	const levels = ['debug', 'info', 'log', 'warn', 'error'];
	const original = {};
	const calls = {};

	for (const lvl of levels) {
		calls[lvl] = [];
		original[lvl] = console[lvl];
		console[lvl] = (...args) => {
			calls[lvl].push(args);
		};
	}

	try {
		fn();
	} finally {
		for (const lvl of levels) {
			console[lvl] = original[lvl];
		}
	}

	return calls;
}

/**
 * Async helper to intercept console method calls during an async callback.
 */
async function captureConsoleAsync (fn) {
	const levels = ['debug', 'info', 'log', 'warn', 'error'];
	const original = {};
	const calls = {};

	for (const lvl of levels) {
		calls[lvl] = [];
		original[lvl] = console[lvl];
		console[lvl] = (...args) => {
			calls[lvl].push(args);
		};
	}

	try {
		await fn();
	} finally {
		for (const lvl of levels) {
			console[lvl] = original[lvl];
		}
	}

	return calls;
}

// ─── Single String Invariant & Parameter Count ───────────────────────────────

describe('@c(output) - Single String Presentation and Parameter Count', () => {

	it('zero parameters: presents a single empty string to console.log', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output');
		});

		assertStrictEquals(captured.log.length, 1, 'console.log should be called once');
		assertStrictEquals(captured.log[0].length, 1, 'exactly 1 argument must be passed to console.log');
		assertStrictEquals(typeof captured.log[0][0], 'string', 'argument must be of type string');
		assertStrictEquals(captured.log[0][0], '', 'output must be empty string');

		// Verify no other console methods were called
		for (const lvl of ['debug', 'info', 'warn', 'error']) {
			assertStrictEquals(captured[lvl].length, 0, `console.${lvl} should not be called`);
		}
	});

	it('single parameter: presents exactly 1 string argument', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', 'hello');
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1, 'exactly 1 argument must be passed');
		assertStrictEquals(typeof captured.log[0][0], 'string');
		assertStrictEquals(captured.log[0][0], 'hello');
	});

	it('two parameters: presents a single space-separated string', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', ['hello', 'world']);
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1, 'exactly 1 argument must be passed');
		assertStrictEquals(typeof captured.log[0][0], 'string');
		assertStrictEquals(captured.log[0][0], 'hello world');
	});

	it('many parameters: presents a single space-separated string', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', ['one', 'two', 'three', 'four', 'five', 'six']);
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1, 'exactly 1 argument must be passed');
		assertStrictEquals(typeof captured.log[0][0], 'string');
		assertStrictEquals(captured.log[0][0], 'one two three four five six');
	});
});

// ─── Parameter Types (All Types Stringified) ─────────────────────────────────

describe('@c(output) - Parameter Types Stringification', () => {

	it('number types: integers, floats, zero, negative, NaN, Infinity', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', [0, -0, 42, -100, 3.14159, NaN, Infinity, -Infinity]);
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1, 'must be a single argument');
		assertStrictEquals(typeof captured.log[0][0], 'string');
		assertStrictEquals(captured.log[0][0], '0 0 42 -100 3.14159 NaN Infinity -Infinity');
	});

	it('boolean primitives: true and false', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', [true, false]);
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1, 'must be a single argument');
		assertStrictEquals(typeof captured.log[0][0], 'string');
		assertStrictEquals(captured.log[0][0], 'true false');
	});

	it('Mesgjs singletons: @t, @f, @n, @u', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', [$t, $f, $n, $u]);
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1, 'must be a single argument');
		assertStrictEquals(typeof captured.log[0][0], 'string');
		assertStrictEquals(captured.log[0][0], 'true false null undefined');
	});

	it('null and undefined primitives', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', [null, undefined]);
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1, 'must be a single argument');
		assertStrictEquals(typeof captured.log[0][0], 'string');
		assertStrictEquals(captured.log[0][0], 'null undefined');
	});

	it('bigint and symbol types', () => {
		const sym = Symbol('mySymbol');
		const captured = captureConsole(() => {
			$c.sm($c, 'output', [12345678901234567890n, sym]);
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1, 'must be a single argument');
		assertStrictEquals(typeof captured.log[0][0], 'string');
		assertStrictEquals(captured.log[0][0], `12345678901234567890 ${String(sym)}`);
	});

	it('objects, arrays, and custom toString implementations', () => {
		const customObj = {
			toString () {
				return 'CustomObjectRepresentation';
			}
		};
		const plainObj = { key: 'val' };
		const arr = [1, 2, 3];

		const captured = captureConsole(() => {
			$c.sm($c, 'output', [plainObj, arr, customObj]);
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1, 'must be a single argument');
		assertStrictEquals(typeof captured.log[0][0], 'string');
		assertStrictEquals(captured.log[0][0], '[object Object] 1,2,3 CustomObjectRepresentation');
	});

	it('Error objects', () => {
		const err = new Error('test error message');
		const captured = captureConsole(() => {
			$c.sm($c, 'output', ['Encountered:', err]);
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1, 'must be a single argument');
		assertStrictEquals(typeof captured.log[0][0], 'string');
		assertStrictEquals(captured.log[0][0], `Encountered: ${String(err)}`);
	});

	it('NANOS list values', () => {
		const list = new NANOS('alpha', 'beta');
		const captured = captureConsole(() => {
			$c.sm($c, 'output', ['List:', list]);
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1, 'must be a single argument');
		assertStrictEquals(typeof captured.log[0][0], 'string');
		assertStrictEquals(captured.log[0][0], `List: ${String(list)}`);
	});

	it('heterogeneous mixed types in a single output call', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', [
				'Header:',
				42,
				true,
				$t,
				null,
				undefined,
				$u,
				999n,
				['item1', 'item2']
			]);
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1, 'must be a single argument');
		assertStrictEquals(typeof captured.log[0][0], 'string');
		assertStrictEquals(captured.log[0][0], 'Header: 42 true true null undefined undefined 999 item1,item2');
	});
});

// ─── Level Parameter (debug, info, log, warn, error, fallback) ───────────────

describe('@c(output) - Level Parameter Handling', () => {

	it('level="log" explicitly specified', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', new NANOS('message text', { level: 'log' }));
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1);
		assertStrictEquals(typeof captured.log[0][0], 'string');
		assertStrictEquals(captured.log[0][0], 'message text');

		for (const lvl of ['debug', 'info', 'warn', 'error']) {
			assertStrictEquals(captured[lvl].length, 0);
		}
	});

	it('level="debug" presents single string to console.debug', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', new NANOS('debug details', 123, { level: 'debug' }));
		});

		assertStrictEquals(captured.debug.length, 1);
		assertStrictEquals(captured.debug[0].length, 1);
		assertStrictEquals(typeof captured.debug[0][0], 'string');
		assertStrictEquals(captured.debug[0][0], 'debug details 123');

		for (const lvl of ['log', 'info', 'warn', 'error']) {
			assertStrictEquals(captured[lvl].length, 0);
		}
	});

	it('level="info" presents single string to console.info', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', new NANOS('info message', { level: 'info' }));
		});

		assertStrictEquals(captured.info.length, 1);
		assertStrictEquals(captured.info[0].length, 1);
		assertStrictEquals(typeof captured.info[0][0], 'string');
		assertStrictEquals(captured.info[0][0], 'info message');

		for (const lvl of ['log', 'debug', 'warn', 'error']) {
			assertStrictEquals(captured[lvl].length, 0);
		}
	});

	it('level="warn" presents single string to console.warn', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', new NANOS('warning message', 'caution', { level: 'warn' }));
		});

		assertStrictEquals(captured.warn.length, 1);
		assertStrictEquals(captured.warn[0].length, 1);
		assertStrictEquals(typeof captured.warn[0][0], 'string');
		assertStrictEquals(captured.warn[0][0], 'warning message caution');

		for (const lvl of ['log', 'debug', 'info', 'error']) {
			assertStrictEquals(captured[lvl].length, 0);
		}
	});

	it('level="error" presents single string to console.error', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', new NANOS('error message', 500, { level: 'error' }));
		});

		assertStrictEquals(captured.error.length, 1);
		assertStrictEquals(captured.error[0].length, 1);
		assertStrictEquals(typeof captured.error[0][0], 'string');
		assertStrictEquals(captured.error[0][0], 'error message 500');

		for (const lvl of ['log', 'debug', 'info', 'warn']) {
			assertStrictEquals(captured[lvl].length, 0);
		}
	});

	it('invalid/unknown level falls back to console.log', () => {
		for (const invalidLevel of ['trace', 'dir', 'unknown', 'CRITICAL', '', 42, null, undefined, {}]) {
			const captured = captureConsole(() => {
				$c.sm($c, 'output', new NANOS('fallback test', { level: invalidLevel }));
			});

			assertStrictEquals(captured.log.length, 1, `level ${String(invalidLevel)} should fall back to console.log`);
			assertStrictEquals(captured.log[0].length, 1);
			assertStrictEquals(typeof captured.log[0][0], 'string');
			assertStrictEquals(captured.log[0][0], 'fallback test');

			for (const lvl of ['debug', 'info', 'warn', 'error']) {
				assertStrictEquals(captured[lvl].length, 0);
			}
		}
	});
});

// ─── Separator (sep) Parameter ───────────────────────────────────────────────

describe('@c(output) - Separator (sep) Parameter Handling', () => {

	it('default separator is a single space', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', ['a', 'b', 'c']);
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1);
		assertStrictEquals(captured.log[0][0], 'a b c');
	});

	it('custom separator: comma and space', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', new NANOS('a', 'b', 'c', { sep: ', ' }));
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1);
		assertStrictEquals(captured.log[0][0], 'a, b, c');
	});

	it('custom separator: empty string (concatenation)', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', new NANOS('a', 'b', 'c', { sep: '' }));
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1);
		assertStrictEquals(captured.log[0][0], 'abc');
	});

	it('custom separator: newline', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', new NANOS('line1', 'line2', 'line3', { sep: '\n' }));
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1);
		assertStrictEquals(captured.log[0][0], 'line1\nline2\nline3');
	});

	it('custom separator: tab', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', new NANOS('col1', 'col2', 'col3', { sep: '\t' }));
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1);
		assertStrictEquals(captured.log[0][0], 'col1\tcol2\tcol3');
	});

	it('custom separator: multi-character delimiter', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', new NANOS('foo', 'bar', 'baz', { sep: ' <-> ' }));
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1);
		assertStrictEquals(captured.log[0][0], 'foo <-> bar <-> baz');
	});

	it('separator with single value: no separator appended', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', new NANOS('onlyOne', { sep: '---' }));
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1);
		assertStrictEquals(captured.log[0][0], 'onlyOne');
	});

	it('separator with zero values: outputs empty string', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', new NANOS({ sep: '---' }));
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1);
		assertStrictEquals(captured.log[0][0], '');
	});
});

// ─── Combined Options & Named Parameters ─────────────────────────────────────

describe('@c(output) - Combinations of Level and Sep with Varied Types', () => {

	it('custom level and custom separator with mixed types', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', new NANOS('STATUS', 200, 'OK', $t, { level: 'warn', sep: ' | ' }));
		});

		assertStrictEquals(captured.warn.length, 1);
		assertStrictEquals(captured.warn[0].length, 1);
		assertStrictEquals(typeof captured.warn[0][0], 'string');
		assertStrictEquals(captured.warn[0][0], 'STATUS | 200 | OK | true');
	});

	it('error level with custom separator and no positional values', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', new NANOS({ level: 'error', sep: ':::' }));
		});

		assertStrictEquals(captured.error.length, 1);
		assertStrictEquals(captured.error[0].length, 1);
		assertStrictEquals(typeof captured.error[0][0], 'string');
		assertStrictEquals(captured.error[0][0], '');
	});

	it('debug level with empty separator', () => {
		const captured = captureConsole(() => {
			$c.sm($c, 'output', new NANOS(1, 0, 1, 0, { level: 'debug', sep: '' }));
		});

		assertStrictEquals(captured.debug.length, 1);
		assertStrictEquals(captured.debug[0].length, 1);
		assertStrictEquals(typeof captured.debug[0][0], 'string');
		assertStrictEquals(captured.debug[0][0], '1010');
	});
});

// ─── Mesgjs Source Code / Transpiled Integration ─────────────────────────────

describe('@c(output) - Mesgjs Transpiled Integration', () => {

	it('executes @c(output) from Mesgjs source code', async () => {
		const source = `
		@c(output 'mesgjs' 'transpiled' 'output')
		`;

		const captured = await captureConsoleAsync(async () => {
			await loadMesgjsModuleSource(source);
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1);
		assertStrictEquals(typeof captured.log[0][0], 'string');
		assertStrictEquals(captured.log[0][0], 'mesgjs transpiled output');
	});

	it('executes @c(output level=warn sep=":") from Mesgjs source code', async () => {
		const source = `
		@c(output level=warn sep=':' 'port' 8080)
		`;

		const captured = await captureConsoleAsync(async () => {
			await loadMesgjsModuleSource(source);
		});

		assertStrictEquals(captured.warn.length, 1);
		assertStrictEquals(captured.warn[0].length, 1);
		assertStrictEquals(typeof captured.warn[0][0], 'string');
		assertStrictEquals(captured.warn[0][0], 'port:8080');
	});

	it('executes @c(output level=error) with zero params from Mesgjs source code', async () => {
		const source = `
		@c(output level=error)
		`;

		const captured = await captureConsoleAsync(async () => {
			await loadMesgjsModuleSource(source);
		});

		assertStrictEquals(captured.error.length, 1);
		assertStrictEquals(captured.error[0].length, 1);
		assertStrictEquals(typeof captured.error[0][0], 'string');
		assertStrictEquals(captured.error[0][0], '');
	});

	it('executes @c(output) with Mesgjs singletons (@t, @f, @n, @u)', async () => {
		const source = `
		@c(output @t @f @n @u)
		`;

		const captured = await captureConsoleAsync(async () => {
			await loadMesgjsModuleSource(source);
		});

		assertStrictEquals(captured.log.length, 1);
		assertStrictEquals(captured.log[0].length, 1);
		assertStrictEquals(typeof captured.log[0][0], 'string');
		assertStrictEquals(captured.log[0][0], 'true false null undefined');
	});
});
