import { parseArgs } from 'jsr:@std/cli/parse-args';
import { lex, parse } from './lexparse.esm.js';
import { transpileTree, mappingGenerator } from './transpile.esm.js';

// { tokens } = lex(input, loc)
// { tree, errors } = parse(tokens)

const flags = parseArgs(Deno.args, {
    boolean: [ 'tokens', 'tree' ],
    string: [ 'js' ],
});
// console.log(flags);
const inName = flags._[0];
if (!inName?.match(/\.scl$/)) {
    console.log('Expected input file name *.scl');
    Deno.exit(1);
}

const sclSrc = Deno.readTextFileSync(inName);

const { tokens } = lex(sclSrc, { src: inName });
if (flags.tokens) console.dir(tokens, { depth: null });

const { tree, errors: parseErrors } = parse(tokens);
if (parseErrors?.length) {
    console.log(parseErrors.join('\n'));
    Deno.exit(1);
}
if (flags.tree) console.dir(tree, { depth: null });

const { code, errors: txpErrors, fatal, segments } = transpileTree(tree);
if (txpErrors?.length) console.log(txpErrors.join('\n'));
if (fatal) console.log(fatal);
if (txpErrors?.length || fatal) Deno.exit(1);
// console.log(code);

const outName = flags.js || inName.replace(/.*\//, '').replace(/\.scl$/, '.esm.js');
const mapping = mappingGenerator(segments), mapJSON = JSON.stringify(mapping);
console.log(`Writing ${outName} and map`);
Deno.writeTextFileSync(outName, code + `\n//# sourceMappingURL=${outName}.map\n`, { encoding: 'utf8' });
Deno.writeTextFileSync(outName + '.map', mapJSON, { encoding: 'utf8' });
