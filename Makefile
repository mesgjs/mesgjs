all: runtime-min vendor

runtime-min:
	deno task runtime-min

vendor:
	sed -e '/#SDEV#/,/#EDEV/d' -e '/#DEV#/d' src/runtime/vendor.esm.js > dist/runtime-min/vendor.esm.js
	rm -f dist/runtime-min/vendor.esm.js.map
