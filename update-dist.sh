#!/usr/bin/env bash

stale () {
	cd src/runtime
	for f in *.js
	do
		if [ ! -f ../../dist/runtime-min/$f ]
		then echo $f
		else find $f -newer ../../dist/runtime-min/$f
		fi
	done
}

for f in `stale`
do deno run -A npm:esbuild src/runtime/$f --minify --outdir=dist/runtime-min --format=esm --sourcemap=external
done
