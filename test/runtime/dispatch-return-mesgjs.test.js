import {
	assertEquals,
	assert,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import '../../src/runtime/mesgjs.esm.js';
import { loadMesgjsModuleSource } from "../harness.esm.js";

Deno.test("@d(return) in Mesgjs code", async (t) => {
	const { $gss } = globalThis;

	await t.step("should work in function with no value", async () => {
		await loadMesgjsModuleSource(`
			%*(nset r1={
				@d(return)
				@c(throw flow)
			}(fn)(call))
		`);
		assertEquals($gss.at('r1'), undefined, "Expected undefined from function return with no value");
	});

	await t.step("should work in function with value", async () => {
		await loadMesgjsModuleSource(`
			%*(nset r2={
				@d(return test-value)
				@c(throw flow)
			}(fn)(call))
		`);
		assertEquals($gss.at('r2'), 'test-value', "Expected 'test-value' from function return");
	});

	await t.step("should work in function from returning block with no value", async () => {
		await loadMesgjsModuleSource(`
			%*(nset r3={
				@d(return)
				default-value !}(fn)(call))
		`);
		assertEquals($gss.at('r3'), undefined, "Expected undefined from function (returning block) with return()");
	});

	await t.step("should work in function from returning block with value", async () => {
		await loadMesgjsModuleSource(`
			%*(nset r4={
				@d(return test-value)
				default-value !}(fn)(call))
		`);
		assertEquals($gss.at('r4'), 'test-value', "Expected 'test-value' from function (returning block)");
	});

	await t.step("should return numeric values", async () => {
		await loadMesgjsModuleSource(`
			%*(nset r5={
				@d(return 42)
				99 !}(fn)(call))
		`);
		assertEquals($gss.at('r5'), 42, "Expected 42 from return");
	});

	await t.step("should return boolean true", async () => {
		await loadMesgjsModuleSource(`
			%*(nset r6={
				@d(return @t)
				@f !}(fn)(call))
		`);
		assertEquals($gss.at('r6'), true, "Expected true from return");
	});

	await t.step("should return boolean false", async () => {
		await loadMesgjsModuleSource(`
			%*(nset r7={
				@d(return @f)
				@t !}(fn)(call))
		`);
		assertEquals($gss.at('r7'), false, "Expected false from return");
	});

	await t.step("should return null", async () => {
		await loadMesgjsModuleSource(`
			%*(nset r8={
				@d(return @n)
				not-null !}(fn)(call))
		`);
		assertEquals($gss.at('r8'), null, "Expected null from return");
	});

	await t.step("should return zero (not confused with undefined)", async () => {
		await loadMesgjsModuleSource(`
			%*(nset r9={
				@d(return 0)
				99 !}(fn)(call))
		`);
		assertEquals($gss.at('r9'), 0, "Expected 0 from return");
	});

	await t.step("should return empty string (not confused with undefined)", async () => {
		await loadMesgjsModuleSource(`
			%*(nset r10={
				@d(return "")
				not-empty !}(fn)(call))
		`);
		assertEquals($gss.at('r10'), '', "Expected empty string from return");
	});

	await t.step("should return list values", async () => {
		await loadMesgjsModuleSource(`
			%*(nset r11={
				@d(return [a b c])
				[x y z] !}(fn)(call))
		`);
		const result = $gss.at('r11');
		assert(result instanceof globalThis.NANOS, "Expected NANOS instance");
		assertEquals(result.at(0), 'a');
		assertEquals(result.at(1), 'b');
		assertEquals(result.at(2), 'c');
	});

	await t.step("should skip code after return in function", async () => {
		await loadMesgjsModuleSource(`
			%*(nset sideEffect12=@f)
			%*(nset r12={
				@d(return early-exit)
				%*(nset sideEffect12=@t)
				@c(throw flow)
			}(fn)(call))
		`);
		assertEquals($gss.at('r12'), 'early-exit', "Expected early-exit value");
		assertEquals($gss.at('sideEffect12'), false, "Side effect should not occur after return");
	});

	await t.step("should work with conditional return", async () => {
		await loadMesgjsModuleSource(`
			#(nset fn={
				@c(if !0 {
					@d(return early)
					default-early !}
					@f {}
				)
				normal-return !}(fn))
			%*(nset r13a=#fn(call @t))
			%*(nset r13b=#fn(call @f))
		`);
		assertEquals($gss.at('r13a'), 'early', "Expected early return when condition is true");
		assertEquals($gss.at('r13b'), 'normal-return', "Expected normal return when condition is false");
	});

	await t.step("should work in interface handler", async () => {
		await loadMesgjsModuleSource(`
			@c(interface test-return-handler14)(set handlers=[
				test={
					@d(return handler-value)
					default-value !}
			])
			%*(nset inst14=@c(get test-return-handler14))
			%*(nset r14=%*inst14(test))
		`);
		assertEquals($gss.at('r14'), 'handler-value', "Expected value from handler return");
	});

	await t.step("should work in interface handler with redispatch", async () => {
		await loadMesgjsModuleSource(`
			@c(interface test-return-super15)(set handlers=[
				test={
					@d(return super-value)
					default-super !}
			])
			@c(interface test-return-sub15)(set
				chain=[test-return-super15]
				handlers=[
					test={
						#(nset superResult=@d(redis))
						@c(if #superResult(eq super-value)
							{
								@d(return sub-got-super)
								default-sub !}
							{
								@d(return unexpected)
								default-unexpected !}
						)
					}
				]
			)
			%*(nset inst15=@c(get test-return-sub15))
			%*(nset r15=%*inst15(test))
		`);
		assertEquals($gss.at('r15'), 'sub-got-super', "Expected sub handler to process super's return value");
	});

	await t.step("should work with function parameters", async () => {
		await loadMesgjsModuleSource(`
			#(nset fn={
				@c(if !0(eq early)
					{
						@d(return early-exit)
						default-early !}
					{
						@d(return normal-exit)
						default-normal !}
				)
			}(fn))
			%*(nset r16a=#fn(call early))
			%*(nset r16b=#fn(call normal))
		`);
		assertEquals($gss.at('r16a'), 'early-exit', "Expected early-exit for 'early' parameter");
		assertEquals($gss.at('r16b'), 'normal-exit', "Expected normal-exit for 'normal' parameter");
	});

	await t.step("should work with nested function calls", async () => {
		await loadMesgjsModuleSource(`
			#(nset innerFn={
				@d(return inner-value)
				default-inner !}(fn))
			%*(nset r17={
				#(nset innerResult=%innerFn(call))
				@c(if #innerResult(eq inner-value)
					{
						@d(return outer-got-inner)
						default-outer !}
					{
						@d(return unexpected)
						default-unexpected !}
				)
			}(fn innerFn=#innerFn)(call))
		`);
		assertEquals($gss.at('r17'), 'outer-got-inner', "Expected outer function to process inner return value");
	});

	await t.step("should work with multiple returns in different branches", async () => {
		await loadMesgjsModuleSource(`
			#(nset fn={
				@c(case !0
					a {
						@d(return result-a)
						default-a !}
					b {
						@d(return result-b)
						default-b !}
					c {
						@d(return result-c)
						default-c !}
					else={
						@d(return result-default)
						default-default !}
				)
			}(fn))
			%*(nset r18a=#fn(call a))
			%*(nset r18b=#fn(call b))
			%*(nset r18c=#fn(call c))
			%*(nset r18d=#fn(call d))
		`);
		assertEquals($gss.at('r18a'), 'result-a', "Expected result-a for 'a' parameter");
		assertEquals($gss.at('r18b'), 'result-b', "Expected result-b for 'b' parameter");
		assertEquals($gss.at('r18c'), 'result-c', "Expected result-c for 'c' parameter");
		assertEquals($gss.at('r18d'), 'result-default', "Expected result-default for 'd' parameter");
	});

	await t.step("should work with expression as return value", async () => {
		await loadMesgjsModuleSource(`
			%*(nset r19={
				@d(return 2(add 3))
				99 !}(fn)(call))
		`);
		assertEquals($gss.at('r19'), 5, "Expected 5 from expression return");
	});

	await t.step("should work with list-op message format", async () => {
		await loadMesgjsModuleSource(`
			%*(nset r20={
				@d([op=return params=[list-op-value]])
				default-value !}(fn)(call))
		`);
		assertEquals($gss.at('r20'), 'list-op-value', "Expected list-op-value from list-op format");
	});

	await t.step("should return value from scratch storage (#)", async () => {
		await loadMesgjsModuleSource(`
			%*(nset r23={
				#(nset temp=scratch-value)
				@d(return #temp)
				default-value !}(fn)(call))
		`);
		assertEquals($gss.at('r23'), 'scratch-value', "Expected value from scratch storage");
	});

	await t.step("should return value from protected storage (%) in function", async () => {
		await loadMesgjsModuleSource(`
			%*(nset r24={
				%(nset stored=protected-value)
				@d(return %stored)
				default-value !}(fn)(call))
		`);
		assertEquals($gss.at('r24'), 'protected-value', "Expected value from protected storage");
	});

	await t.step("should return value from function params (!) in call", async () => {
		await loadMesgjsModuleSource(`
			%*(nset r25={
				@d(return !0)
				default-value !}(fn)(call param-value))
		`);
		assertEquals($gss.at('r25'), 'param-value', "Expected value from call parameters");
	});

	await t.step("should return value from named function params", async () => {
		await loadMesgjsModuleSource(`
			%*(nset r26={
				@d(return %key)
				default-value !}(fn key=named-value)(call))
		`);
		assertEquals($gss.at('r26'), 'named-value', "Expected value from named function parameters");
	});

	await t.step("should return value from call params overriding function params", async () => {
		await loadMesgjsModuleSource(`
			%*(nset r27={
				@d(return !(at key else=%key))
				default-value !}(fn key=fn-value)(call key=call-value))
		`);
		assertEquals($gss.at('r27'), 'call-value', "Expected call params to override function params");
	});
});
