import { parseArgs } from 'jsr:@std/cli/parse-args';
import { lex, parse } from 'mesgjs/lexparse.esm.js';
import { transpileTree, mappingGenerator } from 'mesgjs/transpile.esm.js';
import { calcDigest } from 'mesgjs/calc_digest.esm.js';
import { parseSLID } from 'mesgjs/nanos.esm.js';

// { tokens } = lex(input, loc)
// { tree, errors } = parse(tokens)

const flags = parseArgs(Deno.args, {
    boolean: [ 'tokens', 'tree' ],
    string: [ 'dir', 'js' ],
});
// console.log(flags);
const inName = flags._[0];
if (!inName?.match(/\.msjs$/)) {
    console.log('Expected input file name *.msjs');
    Deno.exit(1);
}

const msjsSrc = Deno.readTextFileSync(inName);

const { configSLID, tokens } = lex(msjsSrc, { src: inName });
if (flags.tokens) console.dir(tokens, { depth: null });
let version;
if (configSLID) {
    const config = parseSLID(configSLID);
    if (config.has('version')) version = config.at('version');
    if (version) console.log('version', version);
}

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

const outName = flags.js || inName.replace(/.*\//, '').replace(/\.msjs$/, '.esm.js');
const dir = !flags.dir ? '' : (flags.dir + (flags.dir.slice(-1) === '/') ? '' : '/');
const mapping = mappingGenerator(segments);
mapping.file = outName;
mapping.sourcesContent = [ msjsSrc ];
const mapJSON = JSON.stringify(mapping);
const codePlus = code + `\n//# sourceMappingURL=${outName}.map\n`;

console.log(`Writing ${outName} and map`);
console.log(await calcDigest(codePlus, 'SHA-512'));

Deno.writeTextFileSync(dir + outName, codePlus, { encoding: 'utf8' });
Deno.writeTextFileSync(dir + outName + '.map', mapJSON, { encoding: 'utf8' });

// END
