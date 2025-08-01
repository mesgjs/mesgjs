/*
 * Mesgjs-to-JavaScript Transpilation Functions
 * Copyright 2024-2025 Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 */

import { lex, parse, tokenLocStr } from './lexparse.esm.js';
import { encode as vlenc } from './vendor/vlq.esm.js';
import { escapeJSString } from './vendor.esm.js';

class Segment {
    constructor (gen, src, pending) {
	this.gen = gen;
	if (src?.loc) this.src = src.loc;
	if (pending) this.pdg = true;
    }
    toString () { return this.gen; }
}
const segment = (gen, src, pdg) => new Segment(gen, src, pdg);

// Split raw text input into tokens, parse, and transpile
export function transpile (input, opts = {}) {
    const loc = opts.location || {};
    const { shebang, configSLID, tokens } = lex(input, loc);
    const { tree, errors } = parse(tokens);
    return { shebang, configSLID, ...transpileTree(tree, { ...opts, errors }) };
}

// Potentially cross-transpilation next-block for REPL
let nextBlock = 0;

// Transpile pre-parsed input to JavaScript code (text)
export function transpileTree (tree, opts = {}) {
    const errors = Array.isArray(opts.errors) ? opts.errors : [];
    const outBuf = [], blocks = opts.repl ? {} : [], outStack = [];
    const aws = opts.addWhiteSpace;
    let jsFirst = false;
    if (!opts.repl) nextBlock = 0;

    const error = (message, fatal = false) => {
	    if (fatal) throw new Error(message);
	    errors.push(message);
	},
	output = (...c) => outBuf.push(...c),
	outseg = (gen, src, pdg) => output(segment(gen, src, pdg)),
	pushOut = () => outStack.push(outBuf.length),
	popOut = () => outBuf.splice(outStack.pop()),
	tls = token => tokenLocStr(token);

    /*
     * Node types:
     * '{' - block
     * chn - message chain
     * dbg - debug-mode block
     * js  - JS embed
     * '[' - list
     * '=' - named value
     * num - number
     * txt - text
     * var - variable
     * wrd - word
     */
    function generate (node) {	// Generate a single node
	// console.log(`generating type ${node?.type}`);
	switch (node?.type) {
	case 'dbg':	// Debug-mode block
	    if (!opts.debugBlocks) break;
	    // Fall through...
	case '{':	// Block
	    generateBlock(node);
	    break;
	case 'chn':	// (Message) chain
	    generateChain(node);
	    break;
	case '[':	// List
	    generateList(node);
	    break;
	case '=':	// Named value(!)
	    // This should only occur in a list or message
	    error(`Error: Named-value outside of list/message at ${tls(node)}`, true);
	    break;
	case 'js':	// Embedded JavaScript
	    generateJS(node);
	    break;
	case 'num':	// Number
	    generateNumber(node);
	    break;
	case 'stm':	// Statement
	    generate(node.node);
	    if (node.node.type !== 'dbg') output(aws ? ';\n' : ';');
	    break;
	case 'txt':	// Text literal
	    generateText(node);
	    break;
	case 'var':	// Var
	    generateVar(node);
	    break;
	case 'wrd':	// Word
	    generateWord(node);
	    break;
	default:
	    error(`Error: Unknown node type ${node?.type} at ${tls(node)}`, true);
	}
    }

    function generateChain (node) {
	const base = node.base, msgs = node.messages;
	function specialBase (base) {
	    switch (base.type === 'wrd' && base.text) {
	    case '@c': output('$c'); break;	// core
	    case '@d': output('d'); break;	// dispatch object
	    case '@gss': output('$gss'); break;	// global shared storage
	    case '@mps': output('m.p'); break;	// module private storage
	    default: return false;
	    }
	    return true;
	}
	msgs.forEach(m => outseg('sm(', m, true));
	if (!specialBase(base)) generate(base);
	msgs.forEach(m => { output(','); generateMessage(m); output(')'); });
    }

    function generateBlock (node) {
	const blockNum = nextBlock++;

	if (node.type !== 'dbg') {
	    // Generate out-of-band (blocks array) content
	    pushOut();
	    // Code template will be assigned a global block id at first binding
	    output(`{cd:d=>{const{mp,sm}=d;`);
	}

	const count = node.statements.length, rtn = node.return ? (count - 1) : -1;
	for (let i = 0; i < count; ++i) {
	    if (i === rtn) output('return ');
	    generate(node.statements[i]);
	}

	if (node.type !== 'dbg') {
	    output('}}');
	    blocks[blockNum] = popOut();
	    if (blockNum && !opts.repl) blocks[blockNum].unshift(',');
	    // Generate in-band code content
	    output(`d.b(c[${blockNum}])`);
	}
    }

    function generateFinalOutput () {
	const repl = opts.repl, initialJS = jsFirst && outBuf.shift();
	if (blocks.length || repl) {
	    if (repl) for (const en of Object.entries(blocks)) outBuf.unshift(`c[${en[0]}] = ${en[1].join('')};\n`);
	    else outBuf.unshift('const c=Object.freeze([', ...blocks.flat(1), ']);');
	    blocks.length = 0;
	}
	if (!repl) outBuf.unshift(segment(`export async function loadMsjs(mid){const{d,ls,m,na}=$modScope(),{mp,sm}=d;\n`));
	if (jsFirst) outBuf.unshift(initialJS);
	if (!repl) outBuf.push(segment(`}if(!globalThis.msjsNoSelfLoad)loadMsjs();\n`));
    }

    function generateJS (node) {
	if (opts.enableJS) {
	    if (!outBuf.length) jsFirst = true;
	    outseg(node.text, node, true);
	}
	else error(`Error: JavaScript is not enabled at ${tls(node)}`);
    }

    function generateList (node) {
	outseg('ls([', node, true);
	node.items.forEach(i => {
	    if (i.type === '=') {
		generate(i.name); output(',');
		generate(i.value); output(',');
	    } else {
		output(',');
		switch (i.type === 'wrd' && i.text) {
		case '@e': break;
		default: generate(i); break;
		}
		output(',');
	    }
	});
	output('])');
    }

    function generateMessage (node) {
	generate(node.message);
	if (node.params.length) {
	    output(',');
	    generateList({ items: node.params, loc: node.params[0].loc });
	}
    }

    function generateNumber (node) {
	output(node.text);
    }

    function generateText (node) {
	output(`'${escapeJSString(node.text)}'`);
    }

    function generateVar (node) {
	const opt = (node.space.slice(-1) === '?') ? ',1' : '';
	let space;
	switch (node.space) {
	// Message parameters
	case '!': case '!?': space = 'mp'; break;
	// Object persistent properties
	case '%': case '%?': space = 'd.p'; break;
	// Scratch (transient) storage
	case '#': case '#?': space = 'd.t'; break;
	// Global shared storage
	case '%*': case '%*?': space = '$gss'; break;
	// Module private/persistent storage
	case '%/': case '%/?': space = 'm.p'; break;
	default:
	    error(`Error: Unknown namespace ${node.space} at ${tls(node)}`, true);
	}
	if (!node.name) output(space)
	else if (node.name.type === 'num') outseg(`na(${space},${node.name.value}${opt})`, node, true);
	else outseg(`na(${space},'${escapeJSString(node.name.text)}'${opt})`, node, true);
    }

    function generateWord (node) {
	switch (node.text) {
	case '@f': output('$f'); break;		// false
	case '@mid': output('mid'); break;	// module id
	case '@n': output('$n'); break;		// null
	case '@nan': output('NaN'); break;	// NaN (not a number)
	case '@neginf': output('-Infinity'); break;
	case '@posinf': output('Infinity'); break;
	case '@t': output('$t'); break;		// true
	case '@u': output('$u'); break;		// undefined
	default: generateText(node); break;
	}
    }

    // Transpilation main code

    try {
	tree.forEach(node => generate(node));
	generateFinalOutput();
	// Normal return (no fatal errors)
	return { code: outBuf.join(''), errors, segments: outBuf };
    } catch (e) {
	const { fileName: file, lineNumber: line, columnNumber: col } = e;
	let mesg = e.message;
	if (e.stack) mesg = e.stack;
	else if (file && line) {
	    mesg += ` at ${file}:${line}`;
	    if (col !== undefined) mesg += ':' + col;
	}
	generateFinalOutput();
	// Return partial result on fatal error
	return { code: outBuf.join(''), errors, fatal: mesg, segments: outBuf };
    }
}

export function mappingGenerator (segments) {
    let nextSrc = 0, genCol = 0, genLine = 0, genSeg = 0;
    let lastGenCol = 0, lastGenLine = 0;
    let lastSrcCol = 0, lastSrcLine = 0, lastSrcNum = 0;
    let didSingle = false, pending = false;
    const sources = {}, mappings = [];

    // Advance output position
    function advGen (str) {
	str.split(/([\r\n\t])/).forEach(part => {
	    switch (part) {
	    case '\r': genCol = 0; break;
	    case '\n': genCol = 0; ++genLine; break;
	    case '\t': genCol = (genCol & ~7) + 8; break;
	    default: genCol += part.length; break;
	    }
	});
    }

    // Advance map position and (maybe) generate entry
    function advMap (seg) {
	const sloc = seg.src;
	// Avoid consecutive entries for unmapped code
	if (didSingle && !sloc) return;
	if (!sloc && seg.gen === '') {
	    // See what's next before committing
	    pending = true;
	    return;
	}
	pending = false;
	if (genLine !== lastGenLine) {
	    mappings.push(';'.repeat(genLine - lastGenLine));
	    genSeg = lastGenCol = 0;
	}
	if (genSeg++) mappings.push(',');
	mappings.push(vlenc(genCol - lastGenCol));
	if (sloc) {
	    if (sources[sloc.src] === undefined) sources[sloc.src] = nextSrc++;
	    const srcNum = sources[sloc.src];
	    mappings.push(vlenc(srcNum - lastSrcNum), vlenc(sloc.line - lastSrcLine), vlenc(sloc.col - lastSrcCol));
	    [ lastSrcNum, lastSrcCol, lastSrcLine ] = [ srcNum, sloc.col, sloc.line ];
	    didSingle = false;
	} else didSingle = true;
	[ lastGenLine, lastGenCol ] = [ genLine, genCol ];
	if (seg.pdg) pending = true;
    }

    for (const seg of segments) {
	if (typeof seg === 'string') {
	    if (pending) advMap({ gen: seg });
	    advGen(seg);
	} else {
	    advMap(seg);
	    advGen(seg.gen);
	}
    }

    return {
	version: 3,
	sources: Object.assign([], Object.fromEntries(Object.entries(sources).map(e => [e[1], e[0]]))),
	mappings: mappings.join(''),
    };
}

// END
