/*
 * SysCL2-to-JavaScript Transpilation Functions
 * Copyright 2024-2025 Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 */

import { lex, parse } from 'syscl/lexparse.esm.js';
import { encode as vlenc } from 'syscl/vlq.esm.js';

// Generate string escapes for JavaScript
export function escapeJSStr (s) {
    return s.replace(/[\x00-\x1f'"\\\u0200-\uffff]/g, c => {
	switch (c) {
	case '\b': return '\\b';
	case '\n': return '\\n';
	case '\r': return '\\r';
	case '\t': return '\\t';
	case "'": return "\\'";
	case '"': return '\\"';
	case '\\': return '\\\\';
	}
	const cc = c.charCodeAt(), ccs = cc.toString(16);
	if (cc < 0x10) return '\\x0' + ccs;
	if (cc < 0x100) return '\\x' + ccs;
	if (cc < 0x1000) return '\\u0' + ccs;
	return '\\u' + ccs;
    });
}

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
    const { tree, errors } = parse(lex(input, loc).tokens);
    return transpileTree(tree, { ...opts, errors });
}

// Transpile pre-parsed input to JavaScript code (text)
export function transpileTree (tree, opts = {}) {
    let outBuf = [], nextBlock = 0, blocksIP = 0, usedMods;
    const errors = Array.isArray(opts.errors) ? opts.errors : [];
    const blocks = [], outStack = [];
    const aws = opts.addWhiteSpace;

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
	case 'js':	// Embedded JavaScript
	    generateJS(node);
	    break;
	case 'num':	// Number
	    generateNumber(node);
	    break;
	case 'stm':	// Statement
	    generate(node.node);
	    output(aws ? ';\n' : ';');
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
	    case '@mps':			// module persistent storage
		if (!usedMods) usedMods = base;
		output('mps');
		break;
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

	// Generate out-of-band (blocks array) content
	pushOut();
	// Code template will be assigned a global block id at first binding
	output(`{cd:d=>{const{b,mp,ps,sm,ts}=d;`);
	const count = node.statements.length, rtn = node.return ? (count - 1) : -1;
	for (let i = 0; i < count; ++i) {
	    if (i === rtn) output('return ');
	    generate(node.statements[i]);
	}
	output('}}');
	blocks[blockNum] = popOut();
	if (blockNum) blocks[blockNum].unshift(',');

	// Generate in-band code content
	output(`b(c[${blockNum}])`);
    }

    function generateFinalOutput () {
	if (blocks.length) {
	    outBuf.splice(blocksIP, 0, 'const c=[', ...blocks.flat(1), '];');
	    blocks.length = 0;
	}
	if (usedMods) outBuf.unshift(segment('const mps=ls();', usedMods, true));
	outBuf.unshift(segment(`import {moduleScope} from 'syscl/runtime.esm.js';const {d,ls,na}=moduleScope(), {b,mp,ps,sm,ts}=d;\n`));
    }

    function generateJS (node) {
	if (opts.enableJS) {
	    outseg(node.text, node, true);
	    if (!nextBlock) blocksIP = outBuf.length;
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
	output(`'${escapeJSStr(node.text)}'`);
    }

    function generateVar (node) {
	const opt = node.isOpt ? ',1' : '';
	let space;
	switch (node.space) {
	case '!': space = 'mp'; break;	// Mespar (message parameters)
	case '%': space = 'ps'; break;	// Persto (persistent storage)
	case '#': space = 'ts'; break;	// Scratch (transient storage)
	default:
	    error(`Error: Unknown namespace ${node.space} at ${tls(node)}`, true);
	}
	if (node.name) outseg(`na(${space},'${escapeJSStr(node.name.text)}'${opt})`, node, true);
	else output(space);
    }

    function generateWord (node) {
	switch (node.text) {
	case '@f': output('$f'); break;		// false
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
	else if (file) {
	    if (line) {
		mesg += ` at ${file}:${line}`;
		if (col !== undefined) mesg += ':' + col;
	    }
	}
	generateFinalOutput();
	// Return partial result on fatal error
	return { code: outBuf.join(''), errors, fatal: mesg, segments: outBuf };
    }
}

export function mappingGenerator (segments, loc = {}) {
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
	sources: Object.assign([], Object.fromEntries(Object.entries(sources).map(e => [e[1], e[0]]))),
	mappings: mappings.join(''),
    };
}

// END
