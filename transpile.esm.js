/*
 * SysCL2-to-JavaScript Transpilation Functions
 * Copyright 2024-2025 Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 */

import { lex, parse } from 'syscl/lexparse.esm.js';

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

// Split raw text input into tokens, parse, and transpile
export function transpile (input, opts = {}) {
    const loc = opts.location || {};
    const { tree, errors } = parse(lex(input, loc).tokens);
    return transpileTree(tree, { ...opts, errors });
}

// Transpile pre-parsed input to JavaScript code (text)
export function transpileTree (tree, opts = {}) {
    let outBuf = [], nextBlock = 0, blocksIP = 0, usedMods = false;
    const errors = Array.isArray(opts.errors) ? opts.errors : [];
    const blocks = [], outStack = [];
    const aws = opts.addWhiteSpace;

    const error = (message, fatal = false) => {
	    if (fatal) throw new Error(message);
	    errors.push(message);
	},
	output = (...c) => outBuf.push(...c),
	pushOut = () => { outStack.push(outBuf); outBuf = []; },
	popOut = () => {
	    const out = outBuf.join('');
	    outBuf = outStack.pop();
	    return out;
	},
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
	case '&':	// Defer
	    generateDefer(node);
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
	    default: return false;
	    }
	    return true;
	}
	output('sm('.repeat(msgs.length));
	if (!specialBase(base)) generate(base);
	msgs.forEach(m => { output(','); generateMessage(m); output(')'); });
	if (node.isStmt) output(aws ? ';\n' : ';');
    }

    const generateBlock = node => generateCode(node, 'block');
    const generateDefer = node => generateCode(node, 'defer');
    function generateCode (node, type) {
	const blockNum = nextBlock++;

	// Generate out-of-band (blocks array) content
	pushOut();
	// Code template will be assigned a global block id at first binding
	output(`{cd:d=>{const{b,mp,ps,sm,ts}=d;`);
	switch (type) {
	case 'block':
	    node.statements.forEach(s => generate(s));
	    output('}}');
	    break;
	case 'defer':
	    output('return ');
	    generate(node.expr);
	    output(aws ? ';\n}}' : ';}}');
	    break;
	}
	blocks[blockNum] = popOut();

	// Generate in-band code content
	output(`b(c[${blockNum}])`);
    }

    function generateFinalOutput () {
	if (blocks.length) {
	    outBuf.splice(blocksIP, 0, 'const c=[', blocks.join(','), '];');
	    blocks.length = 0;
	}
	if (usedMods) outBuf.unshift('const $mods=ls();');
	outBuf.unshift(`import {moduleScope} from 'syscl/runtime.esm.js';const {d,ls,na}=moduleScope(), {b,mp,ps,sm,ts}=d;\n`);
    }

    function generateJS (node) {
	if (opts.enableJS) {
	    output(node.text);
	    if (!nextBlock) blocksIP = outBuf.length;
	}
	else error(`Error: JavaScript is not enabled at ${tls(node)}`);
    }

    function generateList (node) {
	output('ls([');
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
	    generateList({ items: node.params });
	}
    }

    function generateNumber (node) {
	output(node.text);
    }

    function generateText (node) {
	output(`'${escapeJSStr(node.text)}'`);
    }

    function generateVar (node) {
	let space;
	switch (node.space) {
	case '!': space = 'mp'; break;	// Mespar (message parameters)
	case '%': space = 'ps'; break;	// Persto (persistent storage)
	case '#': space = 'ts'; break;	// Scratch (transient storage)
	default:
	    error(`Error: Unknown namespace ${node.space} at ${tls(node)}`, true);
	}
	if (node.name) output(`na(${space},'${escapeJSStr(node.name.text)}')`);
	else output(space);
    }

    function generateWord (node) {
	switch (node.text) {
	case '@f': output('$f'); break;		// false
	case '@mods':				// module storage
	    usedMods = true; output('$mods'); break;
	case '@n': output('$n'); break;		// null
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
	return { code: outBuf.join(''), errors };
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
	return { code: outBuf.join(''), errors, fatal: mesg };
    }
}

// END
