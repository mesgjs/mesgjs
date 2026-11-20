import { describe, it } from '@compat/test';
import { assert, assertStrictEquals } from '@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { listFromPairs as ls } from '../../src/runtime/runtime.esm.js';

describe('@list Interface', () => {
	const { $c, NANOS } = globalThis;
	const { getInstance } = $c;
	const listBox = getInstance('@list');

	const newList = (list = ls()) => list;

	it('consistent receivers', () => {
		const n = getInstance('@list');
		assertStrictEquals(n, listBox);
	});

	it('consistent JS value of @list', () => {
		// It should also be the one we supply when we supply one
		const n = new NANOS();
		const js = $c.sm(n, '@jsv');
		assertStrictEquals(n, js, '(@jsv)');
	});

	it('should initialize and retrieve values with (at)', () => {
		const list = newList(ls([,'a',,'b'])); // [0]: "a", [1]: "b"
		assertStrictEquals($c.sm(list, 'at', ls([,0])), 'a');
		assertStrictEquals($c.sm(list, 'at', ls([,1])), 'b');
	});

	it('should set values with (set)', () => {
		const list = newList(ls([,'a',,'b']));
		$c.sm(list, 'set', ls([,1, 'to', 'B']));
		assertStrictEquals($c.sm(list, 'at', ls([,1])), 'B');
	});

	it('(set) should auto-nest lists', () => {
		const list = newList();
		$c.sm(list, 'set', ls([,'key1', ,'key2', 'to', 'value']));
		const nested = $c.sm(list, 'at', ls([,'key1']));
		assert(nested instanceof globalThis.NANOS, 'Should have created a nested list');
		assertStrictEquals(nested.at('key2'), 'value');
	});

	it("(set) with 'first' should unshift into a nested list", () => {
		const list = newList(ls(['key1', ls([,'a'])]));
		$c.sm(list, 'set', ls([,'key1', 'first', 'z']));
		const nested = $c.sm(list, 'at', ls([,'key1']));
		assertStrictEquals(nested.at(0), 'z');
		assertStrictEquals(nested.at(1), 'a');
	});

	it("(set) with 'next' should push into a nested list", () => {
		const list = newList(ls(['key1', ls([,'a'])]));
		$c.sm(list, 'set', ls([,'key1', 'next', 'z']));
		const nested = $c.sm(list, 'at', ls([,'key1']));
		assertStrictEquals(nested.at(0), 'a');
		assertStrictEquals(nested.at(1), 'z');
	});

	it('should handle named values with (nset)', () => {
		const list = newList();
		$c.sm(list, 'nset', ls(['key1', 'value1', 'key2', 'value2']));
		assertStrictEquals($c.sm(list, 'at', ls([,'key1'])), 'value1');
		assertStrictEquals($c.sm(list, 'size'), 2);
	});

	it('(push) should add elements to the end', () => {
		const list = newList(ls([,'a']));
		$c.sm(list, 'push', ls([,'b',,'c']));
		assertStrictEquals($c.sm(list, 'at', ls([,1])), 'b');
		assertStrictEquals($c.sm(list, 'at', ls([,2])), 'c');
		assertStrictEquals($c.sm(list, 'size'), 3);
	});

	it('(pop) should remove and return the last element', () => {
		const list = newList(ls([,'a',,'b']));
		assertStrictEquals($c.sm(list, 'pop'), 'b');
		assertStrictEquals($c.sm(list, 'size'), 1);
	});

	it('(unshift) should add elements to the beginning', () => {
		const list = newList(ls([,'c']));
		$c.sm(list, 'unshift', ls([,'a',,'b']));
		assertStrictEquals($c.sm(list, 'at', ls([,0])), 'a');
		assertStrictEquals($c.sm(list, 'at', ls([,1])), 'b');
		assertStrictEquals($c.sm(list, 'at', ls([,2])), 'c');
		assertStrictEquals($c.sm(list, 'size'), 3);
	});

	it('(shift) should remove and return the first element', () => {
		const list = newList(ls([,'a',,'b',,'c']));
		assertStrictEquals($c.sm(list, 'shift'), 'a');
		assertStrictEquals($c.sm(list, 'at', ls([,0])), 'b');
		assertStrictEquals($c.sm(list, 'size'), 2);
	});

	it('(slice) should return a shallow copy of a portion', () => {
		const list = newList(ls([,'a',,'b',,'c',,'d',,'e']));
		const sliced = $c.sm(list, 'slice', ls([,1,,4]));
		assert(sliced instanceof NANOS, 'Should return a NANOS instance');
		assertStrictEquals(sliced.at(0), 'b');
		assertStrictEquals(sliced.at(1), 'c');
		assertStrictEquals(sliced.at(2), 'd');
		assertStrictEquals(sliced.size, 3);
	});

	it('(slice) with no arguments should copy entire list', () => {
		const list = newList(ls([,'a',,'b',,'c']));
		const sliced = $c.sm(list, 'slice');
		assertStrictEquals(sliced.size, 3);
		assertStrictEquals(sliced.at(0), 'a');
		assertStrictEquals(sliced.at(1), 'b');
		assertStrictEquals(sliced.at(2), 'c');
	});

	it('(slice) with only start should slice to end', () => {
		const list = newList(ls([,'a',,'b',,'c',,'d']));
		const sliced = $c.sm(list, 'slice', ls([,2]));
		assertStrictEquals(sliced.size, 2);
		assertStrictEquals(sliced.at(0), 'c');
		assertStrictEquals(sliced.at(1), 'd');
	});

	it('(slice) with negative start should count from end', () => {
		const list = newList(ls([,'a',,'b',,'c',,'d',,'e']));
		const sliced = $c.sm(list, 'slice', ls([,-2]));
		assertStrictEquals(sliced.size, 2);
		assertStrictEquals(sliced.at(0), 'd');
		assertStrictEquals(sliced.at(1), 'e');
	});

	it('(slice) with negative end should count from end', () => {
		const list = newList(ls([,'a',,'b',,'c',,'d',,'e']));
		const sliced = $c.sm(list, 'slice', ls([,1,,-1]));
		assertStrictEquals(sliced.size, 3);
		assertStrictEquals(sliced.at(0), 'b');
		assertStrictEquals(sliced.at(1), 'c');
		assertStrictEquals(sliced.at(2), 'd');
	});

	it('(slice) should preserve sparseness', () => {
		const list = newList();
		$c.sm(list, 'set', ls([,0, 'to', 'a']));
		$c.sm(list, 'set', ls([,2, 'to', 'c']));
		$c.sm(list, 'set', ls([,4, 'to', 'e']));
		const sliced = $c.sm(list, 'slice', ls([,0, 5]));
		assertStrictEquals(sliced.size, 3);
		assertStrictEquals(sliced.at(0), 'a');
		assertStrictEquals(sliced.at(2), 'c');
		assertStrictEquals(sliced.at(4), 'e');
		assert(!sliced.has(1), 'Should not have index 1');
		assert(!sliced.has(3), 'Should not have index 3');
	});

	it('(slice) should not modify original list', () => {
		const list = newList(ls([,'a',,'b',,'c']));
		const sliced = $c.sm(list, 'slice', ls([,1, 2]));
		sliced.set(0, 'modified');
		assertStrictEquals($c.sm(list, 'at', ls([,1])), 'b', 'Original should be unchanged');
		assertStrictEquals(sliced.at(0), 'modified', 'Slice should be modified');
	});

	// Tests for num option
	it('(entries) with num=@t should return numeric index keys', () => {
		const list = newList(ls([,'a',,'b', 'name', 'value']));
		const entries = $c.sm(list, 'entries', ls(['num', true]));
		// Check that index keys are numeric
		assertStrictEquals(entries.at(0).at(0), 0, 'First entry key should be numeric 0');
		assertStrictEquals(entries.at(1).at(0), 1, 'Second entry key should be numeric 1');
		// Named keys should remain strings
		assertStrictEquals(entries.at(2).at(0), 'name', 'Named key should remain string');
	});

	it('(entries) with num=@f should return string index keys', () => {
		const list = newList(ls([,'a',,'b']));
		const entries = $c.sm(list, 'entries', ls(['num', false]));
		assertStrictEquals(entries.at(0).at(0), '0', "First entry key should be string '0'");
		assertStrictEquals(entries.at(1).at(0), '1', "Second entry key should be string '1'");
	});

	it('(indexEntries) with num=@t should return numeric keys', () => {
		const list = newList(ls([,'a',,'b', 'name', 'value']));
		const entries = $c.sm(list, 'indexEntries', ls(['num', true]));
		assertStrictEquals(entries.size, 2, 'Should only have index entries');
		assertStrictEquals(entries.at(0).at(0), 0, 'First key should be numeric 0');
		assertStrictEquals(entries.at(1).at(0), 1, 'Second key should be numeric 1');
	});

	it('(indexEntries) with num=@f should return string keys', () => {
		const list = newList(ls([,'a',,'b']));
		const entries = $c.sm(list, 'indexEntries', ls(['num', false]));
		assertStrictEquals(entries.at(0).at(0), '0', "First key should be string '0'");
		assertStrictEquals(entries.at(1).at(0), '1', "Second key should be string '1'");
	});

	it('(indexKeys) with num=@t should return numeric keys', () => {
		const list = newList(ls([,'a',,'b', 'name', 'value']));
		const keys = $c.sm(list, 'indexKeys', ls([,true]));
		assertStrictEquals(keys.size, 2, 'Should have 2 index keys');
		assertStrictEquals(keys.at(0), 0, 'First key should be numeric 0');
		assertStrictEquals(keys.at(1), 1, 'Second key should be numeric 1');
	});

	it('(indexKeys) with num=@f should return string keys', () => {
		const list = newList(ls([,'a',,'b']));
		const keys = $c.sm(list, 'indexKeys', ls([,false]));
		assertStrictEquals(keys.at(0), '0', "First key should be string '0'");
		assertStrictEquals(keys.at(1), '1', "Second key should be string '1'");
	});

	it('(keys) with num=@t should return numeric index keys', () => {
		const list = newList(ls([,'a',,'b', 'name', 'value']));
		const keys = $c.sm(list, 'keys', ls(['num', true]));
		assertStrictEquals(keys.size, 3, 'Should have 3 keys total');
		assertStrictEquals(keys.at(0), 0, 'First key should be numeric 0');
		assertStrictEquals(keys.at(1), 1, 'Second key should be numeric 1');
		assertStrictEquals(keys.at(2), 'name', 'Named key should remain string');
	});

	it('(keys) with num=@f should return string index keys', () => {
		const list = newList(ls([,'a',,'b']));
		const keys = $c.sm(list, 'keys', ls(['num', false]));
		assertStrictEquals(keys.at(0), '0', "First key should be string '0'");
		assertStrictEquals(keys.at(1), '1', "Second key should be string '1'");
	});

	it('(keyOf) with num=@t should return numeric key for index', () => {
		const list = newList(ls([,'a',,'b',,'c']));
		const key = $c.sm(list, 'keyOf', ls([,'b', 'num', true]));
		assertStrictEquals(key, 1, 'Should return numeric 1');
	});

	it('(keyOf) with num=@f should return string key for index', () => {
		const list = newList(ls([,'a',,'b',,'c']));
		const key = $c.sm(list, 'keyOf', ls([,'b', 'num', false]));
		assertStrictEquals(key, '1', "Should return string '1'");
	});

	it('(keyOf) should return string key for named entry regardless of num', () => {
		const list = newList(ls(['name', 'value']));
		const key1 = $c.sm(list, 'keyOf', ls([,'value', 'num', true]));
		const key2 = $c.sm(list, 'keyOf', ls([,'value', 'num', false]));
		assertStrictEquals(key1, 'name', "Should return string 'name' with num=@t");
		assertStrictEquals(key2, 'name', "Should return string 'name' with num=@f");
	});

	it('(lastKeyOf) with num=@t should return numeric key for index', () => {
		const list = newList(ls([,'a',,'b',,'a']));
		const key = $c.sm(list, 'lastKeyOf', ls([,'a', 'num', true]));
		assertStrictEquals(key, 2, 'Should return numeric 2 (last occurrence)');
	});

	it('(lastKeyOf) with num=@f should return string key for index', () => {
		const list = newList(ls([,'a',,'b',,'a']));
		const key = $c.sm(list, 'lastKeyOf', ls([,'a', 'num', false]));
		assertStrictEquals(key, '2', "Should return string '2' (last occurrence)");
	});

	it('(pairs) with num=@t should return numeric index keys', () => {
		const list = newList(ls([,'a',,'b', 'name', 'value']));
		const pairs = $c.sm(list, 'pairs', ls(['num', true]));
		// Pairs are flattened: [key1, value1, key2, value2, ...]
		assertStrictEquals(pairs.at(0), 0, 'First key should be numeric 0');
		assertStrictEquals(pairs.at(1), 'a', "First value should be 'a'");
		assertStrictEquals(pairs.at(2), 1, 'Second key should be numeric 1');
		assertStrictEquals(pairs.at(3), 'b', "Second value should be 'b'");
		assertStrictEquals(pairs.at(4), 'name', 'Named key should remain string');
		assertStrictEquals(pairs.at(5), 'value', "Named value should be 'value'");
	});

	it('(pairs) with num=@f should return string index keys', () => {
		const list = newList(ls([,'a',,'b']));
		const pairs = $c.sm(list, 'pairs', ls(['num', false]));
		assertStrictEquals(pairs.at(0), '0', "First key should be string '0'");
		assertStrictEquals(pairs.at(1), 'a', "First value should be 'a'");
		assertStrictEquals(pairs.at(2), '1', "Second key should be string '1'");
		assertStrictEquals(pairs.at(3), 'b', "Second value should be 'b'");
	});
});
