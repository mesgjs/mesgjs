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

case `which esbuild` in
?*) engine=esbuild ;;
*)
	case `which deno` in
	?*) engine=deno ;;
	*)
		echo "ERROR: Cannot find esbuild or deno (for esbuild)"
		exit 1
		;;
	esac
esac

for f in `stale`
do
	case $engine in
	esbuild)
		esbuild src/runtime/$f --minify --outdir=dist/runtime-min --format=esm --sourcemap=external
		;;
	deno)
		deno run -A npm:esbuild src/runtime/$f --minify --outdir=dist/runtime-min --format=esm --sourcemap=external
		;;
	esac
done
