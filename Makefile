all: runtime-min

runtime-min:
	deno task runtime-min

test-deno:
	deno test -A --config webload.json test/

test-bun:
	wicbun --test --isolate ./test/

test-node:
	wicnode --test ./test/

test: test-deno

test-all: test-deno test-bun test-node

.PHONY: all runtime-min test test-deno test-bun test-node test-all
