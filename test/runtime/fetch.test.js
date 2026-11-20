import { describe, it, beforeAll, afterAll } from '@compat/test';
import { assertEquals, assertRejects, assertStrictEquals } from '@std/assert';
import { makeTempDir, removeDir, writeFile } from '@compat/file';
import * as path from '@compat/path';
import { calcIntegrity, fetchModule } from '../../src/runtime/runtime.esm.js';

const testContent = 'export const value = 42;';
const testContentBuffer = new TextEncoder().encode(testContent);
const testContentSha512 = 'sha512-Jjmwazwmg67EwNPViCBwvSIxhENfS6gwufXoQLrB0B/JDA4v1p+p2S5Y6IGP4SzZqqVTsROlU8meD6ep3q6MTA==';

describe('fetch and integrity', () => {
	let tempDir;
	let tempFile;

	beforeAll(async () => {
		tempDir = await makeTempDir({ prefix: 'mesgjs-fetch-test-' });
		tempFile = path.join(tempDir, 'test-module.js');
		await writeFile(tempFile, testContentBuffer);
	});

	afterAll(async () => {
		if (tempDir) {
			try {
				await removeDir(tempDir, { recursive: true });
			} catch {
				// ignore cleanup error
			}
		}
	});

	it('calcIntegrity should compute SHA-512 digest for a local file', async () => {
		const integrity = await calcIntegrity(tempFile);
		assertStrictEquals(integrity, testContentSha512);
	});

	it('fetchModule should fetch and decode a local module', async () => {
		const content = await fetchModule(tempFile);
		assertStrictEquals(content, testContent);
	});

	it('fetchModule should fetch a local module without decoding', async () => {
		const content = await fetchModule(tempFile, { decode: false });
		assertEquals(content, testContentBuffer);
	});

	it('fetchModule should reject for non-existent local module', async () => {
		const nonExistent = path.join(tempDir, 'non-existent.js');
		await assertRejects(
			() => fetchModule(nonExistent),
			new RegExp(`fetchModule: File "${nonExistent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" not found`)
		);
	});
});
