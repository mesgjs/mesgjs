import { describe, it } from '@compat/test';
import { assertStrictEquals } from '@std/assert';
import { listFromPairs as ls } from '../../src/runtime/runtime.esm.js';
import '../../src/runtime/mesgjs.esm.js';
import { codeBlock } from '../harness.esm.js';

describe('@timestamp Interface', () => {
	const { $c } = globalThis;
	const getInstance = $c.getInstance;
	const ts = getInstance('@timestamp');

	it('(get @timestamp) returns a singleton', () => {
		const ts2 = getInstance('@timestamp');
		assertStrictEquals(ts, ts2, 'should return the same instance each time');
	});

	it('(now) returns a number close to Date.now()', () => {
		const before = Date.now();
		const result = $c.sm(ts, 'now');
		const after = Date.now();

		assertStrictEquals(typeof result, 'number');
		assertStrictEquals(result >= before, true);
		assertStrictEquals(result <= after, true);
	});

	it('(toISOString) converts a timestamp to an ISO 8601 string', () => {
		// 2026-01-15T12:30:00.000Z
		const knownTimestamp = Date.UTC(2026, 0, 15, 12, 30, 0);
		const result = $c.sm(ts, 'toISOString', ls([, knownTimestamp]));

		assertStrictEquals(result, '2026-01-15T12:30:00.000Z');
	});

	it('(fromISOString) parses an ISO 8601 string to a timestamp', () => {
		const result = $c.sm(ts, 'fromISOString', ls([, '2026-01-15T12:30:00.000Z']));

		assertStrictEquals(result, Date.UTC(2026, 0, 15, 12, 30, 0));
	});

	it('(fromISOString) returns NaN for an invalid string', () => {
		const result = $c.sm(ts, 'fromISOString', ls([, 'not-a-date']));

		assertStrictEquals(Number.isNaN(result), true);
	});

	it('(fromUTCYMDHMS) constructs a timestamp from UTC components', () => {
		// 2026-06-26 18:00:00 UTC
		const result = $c.sm(ts, 'fromUTCYMDHMS', ls([, 2026, , 6, , 26, , 18, , 0, , 0]));

		assertStrictEquals(result, Date.UTC(2026, 5, 26, 18, 0, 0));
	});

	it('(fromUTCYMDHMS) month is 1-based (1=January)', () => {
		// January = month 1
		const result = $c.sm(ts, 'fromUTCYMDHMS', ls([, 2026, , 1, , 1, , 0, , 0, , 0]));

		assertStrictEquals(result, Date.UTC(2026, 0, 1, 0, 0, 0));
	});

	it('(toUTCYMDHMS) decomposes a timestamp into 8 components', () => {
		// 2026-01-15T12:30:45.123Z
		// January 15, 2026 is a Thursday (dow=4)
		const timestamp = Date.UTC(2026, 0, 15, 12, 30, 45, 123);
		const result = $c.sm(ts, 'toUTCYMDHMS', ls([, timestamp]));

		assertStrictEquals(result.at(0), 2026,  'year');
		assertStrictEquals(result.at(1), 1,     'month (1=January)');
		assertStrictEquals(result.at(2), 15,    'day of month');
		assertStrictEquals(result.at(3), 12,    'hour');
		assertStrictEquals(result.at(4), 30,    'minute');
		assertStrictEquals(result.at(5), 45,    'second');
		assertStrictEquals(result.at(6), 123,   'milliseconds');
		assertStrictEquals(result.at(7), 4,     'day of week (4=Thursday)');
	});

	it('(toUTCYMDHMS) day-of-week: Sunday=0, Saturday=6', () => {
		// 2026-06-28 is a Sunday
		const sunday = Date.UTC(2026, 5, 28, 0, 0, 0);
		const sundayResult = $c.sm(ts, 'toUTCYMDHMS', ls([, sunday]));

		assertStrictEquals(sundayResult.at(7), 0, 'Sunday should be 0');

		// 2026-07-04 is a Saturday
		const saturday = Date.UTC(2026, 6, 4, 0, 0, 0);
		const saturdayResult = $c.sm(ts, 'toUTCYMDHMS', ls([, saturday]));

		assertStrictEquals(saturdayResult.at(7), 6, 'Saturday should be 6');
	});

	it('(fromUTCYMDHMS) and (toUTCYMDHMS) round-trip', () => {
		const original = $c.sm(ts, 'fromUTCYMDHMS', ls([, 2026, , 3, , 15, , 9, , 45, , 30]));
		const parts = $c.sm(ts, 'toUTCYMDHMS', ls([, original]));
		const reconstructed = $c.sm(ts, 'fromUTCYMDHMS', ls([,
			parts.at(0), , parts.at(1), , parts.at(2), ,
			parts.at(3), , parts.at(4), , parts.at(5),
		]));

		assertStrictEquals(reconstructed, original);
	});

	it('(fromISOString) and (toISOString) round-trip', () => {
		const isoString = '2026-06-26T18:02:38.860Z';
		const timestamp = $c.sm(ts, 'fromISOString', ls([, isoString]));
		const result = $c.sm(ts, 'toISOString', ls([, timestamp]));

		assertStrictEquals(result, isoString);
	});

	it('(elapsed) returns a non-negative number', () => {
		const mockCode = codeBlock(() => {});

		const elapsed = $c.sm(ts, 'elapsed', ls([, mockCode]));

		assertStrictEquals(typeof elapsed, 'number');
		assertStrictEquals(elapsed >= 0, true);
	});

	it('(elapsed) measures time for a code block', async () => {
		// Use a real delay to verify elapsed time is measured
		const start = Date.now();

		let blockRan = false;
		const slowCode = codeBlock(() => {
			blockRan = true;
			while ((Date.now() - start) < 55); // busy-loop for synchronous delay
		});

		const elapsed = $c.sm(ts, 'elapsed', ls([, slowCode]));

		assertStrictEquals(blockRan, true, 'block should have been executed');
		assertStrictEquals(elapsed >= 50, true, 'elapsed should be at least 50 msec');
	});
});
