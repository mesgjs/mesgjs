/**
 * Test Mesgjs @list interface push/unshift operations
 * Tests (push)/(|+), (pushx)/(|*), (unshift)/(+|), and (unshx)/(*|)
 *
 * Key behaviors:
 * - (push) / (|+): Receives d.mp (NANOS), expands it one level (flattens)
 * - (pushx) / (|*): Uses expand() to get actual values from d.mp parameters
 * - (unshift) / (+|): Receives d.mp (NANOS), expands it one level (flattens)
 * - (unshx) / (*|): Uses expand() to get actual values from d.mp parameters
 *
 * Implementation details:
 * - push: (d) => d.js.push(d.mp) - passes NANOS d.mp, which gets expanded
 * - pushx: (d) => d.js.push(...expand(d.mp)) - expands d.mp to get values
 * - unshift: (d) => d.js.unshift(d.mp) - passes NANOS d.mp, which gets expanded
 * - unshx: (d) => d.js.unshift(...expand(d.mp)) - expands d.mp to get values
 */

import { assertEquals } from 'jsr:@std/assert';
import '../../src/runtime/mesgjs.esm.js';
import { loadMesgjsModuleSource } from "../harness.esm.js";

Deno.test('Mesgjs @list push/unshift operations', async (t) => {
	const $gss = globalThis.$gss;

	await t.step('(push) should add simple values to end of list', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[a b c])
			#list(push d e f)
			%*(nset r1=#list)
		`);

		const result = $gss.at('r1');
		assertEquals(result.at(0), 'a', 'Original element 0');
		assertEquals(result.at(1), 'b', 'Original element 1');
		assertEquals(result.at(2), 'c', 'Original element 2');
		assertEquals(result.at(3), 'd', 'Pushed element 0');
		assertEquals(result.at(4), 'e', 'Pushed element 1');
		assertEquals(result.at(5), 'f', 'Pushed element 2');
		assertEquals(result.next, 6, 'Next index is 6');
	});

	await t.step('(push) should expand d.mp one level when pushing list', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[a b])
			#(nset toPush=[c d e])
			// #list(push #toPush) means d.mp contains #toPush
			// push receives d.mp (a NANOS) and expands it one level
			#list(push #toPush)
			%*(nset r2=#list)
		`);

		const result = $gss.at('r2');
		assertEquals(result.at(0), 'a', 'Original element 0');
		assertEquals(result.at(1), 'b', 'Original element 1');
		// d.mp gets expanded one level, so the list itself is pushed as an item
		const pushed = result.at(2);
		assertEquals(pushed.at(0), 'c', 'Pushed list element 0');
		assertEquals(pushed.at(1), 'd', 'Pushed list element 1');
		assertEquals(pushed.at(2), 'e', 'Pushed list element 2');
		assertEquals(result.next, 3, 'Next index is 3');
	});

	await t.step('(push) should handle named values in d.mp', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[a b])
			// d.mp will contain: 0=c, 1=d, x=10, y=20
			#list(push c d x=10 y=20)
			%*(nset r3=#list)
		`);

		const result = $gss.at('r3');
		assertEquals(result.at(0), 'a', 'Original element 0');
		assertEquals(result.at(1), 'b', 'Original element 1');
		assertEquals(result.at(2), 'c', 'Pushed positional 0');
		assertEquals(result.at(3), 'd', 'Pushed positional 1');
		assertEquals(result.at('x'), 10, 'Pushed named value x');
		assertEquals(result.at('y'), 20, 'Pushed named value y');
		assertEquals(result.next, 4, 'Next index is 4');
	});

	await t.step('(push) should preserve gaps from d.mp', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[a b])
			#(nset sparse=[x y 5=z])
			#list(push #sparse)
			%*(nset r4=#list)
		`);

		const result = $gss.at('r4');
		assertEquals(result.at(0), 'a', 'Original element 0');
		assertEquals(result.at(1), 'b', 'Original element 1');
		// The sparse list is pushed as a single item
		const pushed = result.at(2);
		assertEquals(pushed.at(0), 'x', 'Pushed sparse list element 0');
		assertEquals(pushed.at(1), 'y', 'Pushed sparse list element 1');
		assertEquals(pushed.at(5), 'z', 'Pushed sparse list element 5');
		assertEquals(result.next, 3, 'Next index is 3');
	});

	await t.step('(pushx) should expand d.mp values when pushing list', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[a b])
			#(nset inner=[x y z])
			// pushx uses expand(d.mp) to get the actual values
			#list(pushx #inner)
			%*(nset r5=#list)
		`);

		const result = $gss.at('r5');
		assertEquals(result.at(0), 'a', 'Original element 0');
		assertEquals(result.at(1), 'b', 'Original element 1');
		// expand() extracts the values from #inner
		assertEquals(result.at(2), 'x', 'Expanded element 0');
		assertEquals(result.at(3), 'y', 'Expanded element 1');
		assertEquals(result.at(4), 'z', 'Expanded element 2');
		assertEquals(result.next, 5, 'Next index is 5');
	});

	await t.step('(pushx) should expand multiple list arguments', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[a])
			#(nset list1=[b c])
			#(nset list2=[d e])
			// pushx expands both list1 and list2
			#list(pushx #list1 #list2)
			%*(nset r6=#list)
		`);

		const result = $gss.at('r6');
		assertEquals(result.at(0), 'a', 'Original element');
		assertEquals(result.at(1), 'b', 'From list1');
		assertEquals(result.at(2), 'c', 'From list1');
		assertEquals(result.at(3), 'd', 'From list2');
		assertEquals(result.at(4), 'e', 'From list2');
		assertEquals(result.next, 5, 'Next index is 5');
	});

	await t.step('(pushx) should handle nested lists', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[a])
			#(nset nested=[[inner1 inner2] [inner3 inner4]])
			// pushx expands nested, pushing the two inner lists
			#list(pushx #nested)
			%*(nset r7=#list)
		`);

		const result = $gss.at('r7');
		assertEquals(result.at(0), 'a', 'Original element');
		const inner1 = result.at(1);
		assertEquals(inner1.at(0), 'inner1', 'First nested list element 0');
		assertEquals(inner1.at(1), 'inner2', 'First nested list element 1');
		const inner2 = result.at(2);
		assertEquals(inner2.at(0), 'inner3', 'Second nested list element 0');
		assertEquals(inner2.at(1), 'inner4', 'Second nested list element 1');
		assertEquals(result.next, 3, 'Next index is 3');
	});

	await t.step('(unshift) should add simple values to beginning of list', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[d e f])
			#list(unshift a b c)
			%*(nset r8=#list)
		`);

		const result = $gss.at('r8');
		// unshift processes from last to first
		assertEquals(result.at(0), 'a', 'Unshifted element 0');
		assertEquals(result.at(1), 'b', 'Unshifted element 1');
		assertEquals(result.at(2), 'c', 'Unshifted element 2');
		assertEquals(result.at(3), 'd', 'Original element 0');
		assertEquals(result.at(4), 'e', 'Original element 1');
		assertEquals(result.at(5), 'f', 'Original element 2');
		assertEquals(result.next, 6, 'Next index is 6');
	});

	await t.step('(unshift) should expand d.mp one level when unshifting list', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[d e])
			#(nset toUnshift=[a b c])
			// unshift receives d.mp (a NANOS) and expands it one level
			#list(unshift #toUnshift)
			%*(nset r9=#list)
		`);

		const result = $gss.at('r9');
		// The list itself is unshifted as a single item
		const unshifted = result.at(0);
		assertEquals(unshifted.at(0), 'a', 'Unshifted list element 0');
		assertEquals(unshifted.at(1), 'b', 'Unshifted list element 1');
		assertEquals(unshifted.at(2), 'c', 'Unshifted list element 2');
		assertEquals(result.at(1), 'd', 'Original element 0');
		assertEquals(result.at(2), 'e', 'Original element 1');
		assertEquals(result.next, 3, 'Next index is 3');
	});

	await t.step('(unshift) should handle named values in d.mp', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[c d])
			// d.mp will contain: 0=a, 1=b, x=10, y=20
			#list(unshift a b x=10 y=20)
			%*(nset r10=#list)
		`);

		const result = $gss.at('r10');
		assertEquals(result.at(0), 'a', 'Unshifted positional 0');
		assertEquals(result.at(1), 'b', 'Unshifted positional 1');
		assertEquals(result.at(2), 'c', 'Original element 0');
		assertEquals(result.at(3), 'd', 'Original element 1');
		assertEquals(result.at('x'), 10, 'Unshifted named value x');
		assertEquals(result.at('y'), 20, 'Unshifted named value y');
		assertEquals(result.next, 4, 'Next index is 4');
	});

	await t.step('(unshift) should preserve gaps from d.mp', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[d e])
			#(nset sparse=[a b 4=c])
			#list(unshift #sparse)
			%*(nset r11=#list)
		`);

		const result = $gss.at('r11');
		// The sparse list is unshifted as a single item
		const unshifted = result.at(0);
		assertEquals(unshifted.at(0), 'a', 'Unshifted sparse list element 0');
		assertEquals(unshifted.at(1), 'b', 'Unshifted sparse list element 1');
		assertEquals(unshifted.at(4), 'c', 'Unshifted sparse list element 4');
		assertEquals(result.at(1), 'd', 'Original element 0');
		assertEquals(result.at(2), 'e', 'Original element 1');
		assertEquals(result.next, 3, 'Next index is 3');
	});

	await t.step('(unshx) should expand d.mp values when unshifting list', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[d e])
			#(nset inner=[a b c])
			// unshx uses expand(d.mp) to get the actual values
			#list(unshx #inner)
			%*(nset r12=#list)
		`);

		const result = $gss.at('r12');
		// expand() extracts the values from #inner
		assertEquals(result.at(0), 'a', 'Expanded element 0');
		assertEquals(result.at(1), 'b', 'Expanded element 1');
		assertEquals(result.at(2), 'c', 'Expanded element 2');
		assertEquals(result.at(3), 'd', 'Original element 0');
		assertEquals(result.at(4), 'e', 'Original element 1');
		assertEquals(result.next, 5, 'Next index is 5');
	});

	await t.step('(unshx) should expand multiple list arguments', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[e])
			#(nset list1=[a b])
			#(nset list2=[c d])
			// unshx expands both list1 and list2
			#list(unshx #list1 #list2)
			%*(nset r13=#list)
		`);

		const result = $gss.at('r13');
		// unshx processes from last to first
		assertEquals(result.at(0), 'a', 'From list1');
		assertEquals(result.at(1), 'b', 'From list1');
		assertEquals(result.at(2), 'c', 'From list2');
		assertEquals(result.at(3), 'd', 'From list2');
		assertEquals(result.at(4), 'e', 'Original element');
		assertEquals(result.next, 5, 'Next index is 5');
	});

	await t.step('(unshx) should handle nested lists', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[e])
			#(nset nested=[[inner1 inner2] [inner3 inner4]])
			// unshx expands nested, unshifting the two inner lists
			#list(unshx #nested)
			%*(nset r14=#list)
		`);

		const result = $gss.at('r14');
		const inner1 = result.at(0);
		assertEquals(inner1.at(0), 'inner1', 'First nested list element 0');
		assertEquals(inner1.at(1), 'inner2', 'First nested list element 1');
		const inner2 = result.at(1);
		assertEquals(inner2.at(0), 'inner3', 'Second nested list element 0');
		assertEquals(inner2.at(1), 'inner4', 'Second nested list element 1');
		assertEquals(result.at(2), 'e', 'Original element');
		assertEquals(result.next, 3, 'Next index is 3');
	});

	await t.step('(|+) alias should work like (push)', async () => {
		await loadMesgjsModuleSource(`
			#(nset list1=[a b])
			#(nset list2=[a b])
			#(nset toPush=[c d])
			#list1(push #toPush)
			#list2(|+ #toPush)
			%*(nset r15a=#list1)
			%*(nset r15b=#list2)
		`);

		const result1 = $gss.at('r15a');
		const result2 = $gss.at('r15b');
		// Both should have the list pushed as a single item
		assertEquals(result1.next, result2.next, 'Next index matches');
		assertEquals(result1.at(0), result2.at(0), 'Element 0 matches');
		assertEquals(result1.at(1), result2.at(1), 'Element 1 matches');
		const p1 = result1.at(2);
		const p2 = result2.at(2);
		assertEquals(p1.at(0), p2.at(0), 'Pushed list element 0 matches');
		assertEquals(p1.at(1), p2.at(1), 'Pushed list element 1 matches');
	});

	await t.step('(|*) alias should work like (pushx)', async () => {
		await loadMesgjsModuleSource(`
			#(nset list1=[a b])
			#(nset list2=[a b])
			#(nset toPush=[c d])
			#list1(pushx #toPush)
			#list2(|* #toPush)
			%*(nset r16a=#list1)
			%*(nset r16b=#list2)
		`);

		const result1 = $gss.at('r16a');
		const result2 = $gss.at('r16b');
		assertEquals(result1.at(0), result2.at(0), 'Element 0 matches');
		assertEquals(result1.at(1), result2.at(1), 'Element 1 matches');
		assertEquals(result1.at(2), result2.at(2), 'Element 2 matches');
		assertEquals(result1.at(3), result2.at(3), 'Element 3 matches');
		assertEquals(result1.next, result2.next, 'Next index matches');
	});

	await t.step('(+|) alias should work like (unshift)', async () => {
		await loadMesgjsModuleSource(`
			#(nset list1=[c d])
			#(nset list2=[c d])
			#(nset toUnshift=[a b])
			#list1(unshift #toUnshift)
			#list2(+| #toUnshift)
			%*(nset r17a=#list1)
			%*(nset r17b=#list2)
		`);

		const result1 = $gss.at('r17a');
		const result2 = $gss.at('r17b');
		// Both should have the list unshifted as a single item
		assertEquals(result1.next, result2.next, 'Next index matches');
		const u1 = result1.at(0);
		const u2 = result2.at(0);
		assertEquals(u1.at(0), u2.at(0), 'Unshifted list element 0 matches');
		assertEquals(u1.at(1), u2.at(1), 'Unshifted list element 1 matches');
		assertEquals(result1.at(1), result2.at(1), 'Element 1 matches');
		assertEquals(result1.at(2), result2.at(2), 'Element 2 matches');
	});

	await t.step('(*|) alias should work like (unshx)', async () => {
		await loadMesgjsModuleSource(`
			#(nset list1=[c d])
			#(nset list2=[c d])
			#(nset toUnshift=[a b])
			#list1(unshx #toUnshift)
			#list2(*| #toUnshift)
			%*(nset r18a=#list1)
			%*(nset r18b=#list2)
		`);

		const result1 = $gss.at('r18a');
		const result2 = $gss.at('r18b');
		assertEquals(result1.at(0), result2.at(0), 'Element 0 matches');
		assertEquals(result1.at(1), result2.at(1), 'Element 1 matches');
		assertEquals(result1.at(2), result2.at(2), 'Element 2 matches');
		assertEquals(result1.at(3), result2.at(3), 'Element 3 matches');
		assertEquals(result1.next, result2.next, 'Next index matches');
	});

	await t.step('(push) with mixed types should handle all values', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[])
			#list(push 42 'text' @t @n [nested list])
			%*(nset r19=#list)
		`);

		const result = $gss.at('r19');
		assertEquals(result.at(0), 42, 'Number value');
		assertEquals(result.at(1), 'text', 'Text value');
		assertEquals(result.at(2), true, 'Boolean value');
		assertEquals(result.at(3), null, 'Null value');
		const nested = result.at(4);
		assertEquals(nested.at(0), 'nested', 'Nested list element 0');
		assertEquals(nested.at(1), 'list', 'Nested list element 1');
		assertEquals(result.next, 5, 'Next index is 5');
	});

	await t.step('(push) on empty list should work correctly', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[])
			#list(push a b c)
			%*(nset r20=#list)
		`);

		const result = $gss.at('r20');
		assertEquals(result.at(0), 'a', 'Element 0');
		assertEquals(result.at(1), 'b', 'Element 1');
		assertEquals(result.at(2), 'c', 'Element 2');
		assertEquals(result.next, 3, 'Next index is 3');
	});

	await t.step('chaining push operations should work correctly', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[a])
			#list(push b)(push c)(push d)
			%*(nset r21=#list)
		`);

		const result = $gss.at('r21');
		assertEquals(result.at(0), 'a', 'Element 0');
		assertEquals(result.at(1), 'b', 'Element 1');
		assertEquals(result.at(2), 'c', 'Element 2');
		assertEquals(result.at(3), 'd', 'Element 3');
		assertEquals(result.next, 4, 'Next index is 4');
	});

	await t.step('chaining unshift operations should work correctly', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[d])
			#list(unshift c)(unshift b)(unshift a)
			%*(nset r22=#list)
		`);

		const result = $gss.at('r22');
		assertEquals(result.at(0), 'a', 'Element 0');
		assertEquals(result.at(1), 'b', 'Element 1');
		assertEquals(result.at(2), 'c', 'Element 2');
		assertEquals(result.at(3), 'd', 'Element 3');
		assertEquals(result.next, 4, 'Next index is 4');
	});

	await t.step('(push) and (unshift) should work together', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[c d])
			#list(unshift a b)
			#list(push e f)
			%*(nset r23=#list)
		`);

		const result = $gss.at('r23');
		assertEquals(result.at(0), 'a', 'Unshifted element 0');
		assertEquals(result.at(1), 'b', 'Unshifted element 1');
		assertEquals(result.at(2), 'c', 'Original element 0');
		assertEquals(result.at(3), 'd', 'Original element 1');
		assertEquals(result.at(4), 'e', 'Pushed element 0');
		assertEquals(result.at(5), 'f', 'Pushed element 1');
		assertEquals(result.next, 6, 'Next index is 6');
	});

	await t.step('(pushx) should expand JS Set arguments', async () => {
		$gss.set('jset1', new Set(['b', 'c', 'd']));
		await loadMesgjsModuleSource(`
			#(nset list=[a])
			#list(pushx %*jset1)
			%*(nset r24=#list)
		`);

		const result = $gss.at('r24');
		assertEquals(result.at(0), 'a', 'Original element');
		assertEquals(result.at(1), 'b', 'From JS Set');
		assertEquals(result.at(2), 'c', 'From JS Set');
		assertEquals(result.at(3), 'd', 'From JS Set');
		assertEquals(result.next, 4, 'Next index is 4');
	});

	await t.step('(pushx) should expand @set arguments', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[a])
			#(nset msSet=@c(get @set init=[from=[x y z]]))
			#list(pushx #msSet)
			%*(nset r25=#list)
		`);

		const result = $gss.at('r25');
		assertEquals(result.at(0), 'a', 'Original element');
		assertEquals(result.at(1), 'x', 'From @set');
		assertEquals(result.at(2), 'y', 'From @set');
		assertEquals(result.at(3), 'z', 'From @set');
		assertEquals(result.next, 4, 'Next index is 4');
	});

	await t.step('(pushx) should expand JS Map arguments', async () => {
		$gss.set('jmap1', new Map([['k1', 'v1'], ['k2', 'v2']]));
		await loadMesgjsModuleSource(`
			#(nset list=[a])
			#list(pushx %*jmap1)
			%*(nset r26=#list)
		`);

		const result = $gss.at('r26');
		assertEquals(result.at(0), 'a', 'Original element');
		assertEquals(result.at('k1'), 'v1', 'From JS Map value 1');
		assertEquals(result.at('k2'), 'v2', 'From JS Map value 2');
		assertEquals(result.size, 3, 'Size is 3');
		assertEquals(result.next, 1, 'Next index is 1');
	});

	await t.step('(pushx) should expand @map arguments', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[a])
			#(nset msMap=@c(get @map))
			#msMap(nset k1=v1 k2=v2)
			#list(pushx #msMap)
			%*(nset r27=#list)
		`);

		const result = $gss.at('r27');
		assertEquals(result.at(0), 'a', 'Original element');
		assertEquals(result.at('k1'), 'v1', 'From @map value 1');
		assertEquals(result.at('k2'), 'v2', 'From @map value 2');
		assertEquals(result.size, 3, 'Size is 3');
		assertEquals(result.next, 1, 'Next index is 1');
	});

	await t.step('(unshx) should expand JS Set arguments', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[d])
			@js{
				const jsSet = new Set(['a', 'b', 'c']);
				globalThis.$gss.set('jsSet2', jsSet);
			@}
			#list(unshx %*jsSet2)
			%*(nset r28=#list)
		`);

		const result = $gss.at('r28');
		assertEquals(result.at(0), 'a', 'From JS Set');
		assertEquals(result.at(1), 'b', 'From JS Set');
		assertEquals(result.at(2), 'c', 'From JS Set');
		assertEquals(result.at(3), 'd', 'Original element');
		assertEquals(result.next, 4, 'Next index is 4');
	});

	await t.step('(unshx) should expand @set arguments', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[d])
			#(nset msSet=@c(get @set init=[from=[x y z]]))
			#list(unshx #msSet)
			%*(nset r29=#list)
		`);

		const result = $gss.at('r29');
		assertEquals(result.at(0), 'x', 'From @set');
		assertEquals(result.at(1), 'y', 'From @set');
		assertEquals(result.at(2), 'z', 'From @set');
		assertEquals(result.at(3), 'd', 'Original element');
		assertEquals(result.next, 4, 'Next index is 4');
	});

	await t.step('(unshx) should expand JS Map arguments', async () => {
		$gss.set('jmap2', new Map([['k1', 'v1'], ['k2', 'v2']]));
		await loadMesgjsModuleSource(`
			#(nset list=[c])
			#list(unshx %*jmap2)
			%*(nset r30=#list)
		`);

		const result = $gss.at('r30');
		assertEquals(result.at('k1'), 'v1', 'From JS Map value 1');
		assertEquals(result.at('k2'), 'v2', 'From JS Map value 2');
		assertEquals(result.at(0), 'c', 'Original element');
		assertEquals(result.size, 3, 'Size is 3');
		assertEquals(result.next, 1, 'Next index is 1');
	});

	await t.step('(unshx) should expand @map arguments', async () => {
		await loadMesgjsModuleSource(`
			#(nset list=[c])
			#(nset msMap=@c(get @map))
			#msMap(nset k1=v1 k2=v2)
			#list(unshx #msMap)
			%*(nset r31=#list)
		`);

		const result = $gss.at('r31');
		assertEquals(result.at('k1'), 'v1', 'From @map value 1');
		assertEquals(result.at('k2'), 'v2', 'From @map value 2');
		assertEquals(result.at(0), 'c', 'Original element');
		assertEquals(result.size, 3, 'Size is 3');
		assertEquals(result.next, 1, 'Next index is 1');
	});
});
