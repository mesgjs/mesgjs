/*
 * Mesgjs Lexical Analyzer And Parsing Functions
 * Copyright 2024-2025 Kappa Computer Solutions, LLC and Brian Katzung
 * Author: Brian Katzung <briank@kappacs.com>
 */

import { unescapeJSString } from './vendor.esm.js';

// Mesgjs lexical token regexps
// Group 1:  ! # %
// Group 1B: =
// Group 2:  @ :
// Group 3:  ` ~ ! # $ % ^ & * | . : , ; < > ?
// Group 3B: + - = /
//
// Group 1:  Interrupts a regular word in progress
// Group 1B: Not followed by ! # or %
// Group 2:  Cannot start an op-word
// Group 3:  Word/op-word cross-over group
// Group 3B: Context-sensitive cross-overs

const MSJSPats = {
    ejs: '@js\\{.*?@}',		// Embedded JavaScript
    mlc: '/\\*.*?\\*/',		// Multi-line comment
    slc: '//.*?(?:\r*\n|$)',	// Single-line comment
    // Numbers
    flt: '[+-]?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?(?![0-9a-zA-Z])',
    int: '[+-]?(?:0[bB][01]+|0[oO][0-7]+|0[xX][0-9a-fA-F]+|\\d+)n?(?![0-9a-zA-Z])',
    sqs: "'(?:\\\\'|[^'])*'",	// Single-quoted string
    dqs: '"(?:\\\\"|[^"])*"',	// Double-quoted string
    dbg: '@debug\\{',		// Start debug-mode code
    spc: '\\s+',		// Space
    net: '!}|[[({})\\]]',	// Non-eager tokens
    // "Operator"-style words
    opw: '=(?=[!#%@:]|[+-]\\d)|(?![@:])(?:[`~@#$%^&*=|.:,;<>?]|/(?![/*])|!(?![}])|[+-](?!\\d))+',
    wrd: '(?:[^\\s(){}[\\]!#%=\'"/]|/(?![/*]))+', // "Regular" words
};

const MSJSRE = new RegExp('(' + 'ejs mlc slc flt int sqs dqs dbg spc net opw wrd'.split(' ').map(k => MSJSPats[k]).join('|') + ')', 's');
const MSJSNum = new RegExp(`^(${MSJSPats.flt}|${MSJSPats.int})$`);

// Simple lexical analyzer
export function lex (input, loc = {}) {
    let { src = undefined, line = 0, col = 0 } = loc;

    // Advance input position based on input
    function adv (str) {
	str.split(/([\r\n\t])/).forEach(part => {
	    switch (part) {
	    case '\r': col = 0; break;
	    case '\n': col = 0; ++line; break;
	    case '\t': col = (col & ~7) + 8; break;
	    default: col += part.length; break;
	    }
	});
    }

    let match = input.match(/^(#![^\n]*\n)?(\[\(.*?\)\])?/s);
    const shebang = match[1] || '', configSLID = match[2] || '';
    match = undefined;
    if (shebang || configSLID) {
	input = input.slice(shebang.length + configSLID.length);
	adv(shebang);
	adv(configSLID);
    }

    return { shebang, configSLID, tokens: input.split(MSJSRE).map(text => {
	const loc = { src, line, col };
	adv(text);

	switch (text) {			// Standalone, full-match cases
	case undefined:
	case '':
	    return false;
	case '@debug{':
	    return { type: 'dbg', loc };
	case '!}':
	    return { type: '}', loc, return: true };
	case '{':			// Block
	case '}':
	case '(':			// Message call
	case ')':
	case '[':			// List
	case ']':
	    return { type: text, loc };
	case "'":			// Unterminated quote :-(
	case '"':
	    return { type: 'utq', loc, text };
	}

	switch (text[0] + text[1]) {	// Two-char-prefix cases
	case '//':
	case '/*':
	    return false;
	}

	switch (text[0]) {		// Single-char-prefix cases
	case "'":			// Quoted strings
	case '"':
	    {
	    const uesl = unescapeJSString(text.slice(1, -1));
	    return { type: 'txt', loc, text: uesl };
	    }
	}

	if (/^\s/.test(text)) return false; // White space
	if (MSJSNum.test(text)) return { type: 'num', loc, text, value: parseFloat(text) }; // Numbers
	if (/^@js\{.*@}$/s.test(text)) return { type: 'js', loc, text: text.slice(4, -2) }; // JS Embed
	// Some form of word
	return { type: 'wrd', loc, text };
    }).
    filter(t => t), loc: { src, line, col } };
}

function showToken (t) {
    if (!t) return 'end';
    if (t.text) return '"' + t.text + '"';
    return t.type;
}

// Generate parse tree from lexical tokens
export function parse (tokens) {
    const end = tokens.length, output = [], errors = [], cache = {};
    let read = 0, blkDep = 0, lstDep = 0, msgDep = 0;

    // Support functions

    function error (message, fatal = false) {
	errors.push(message);
	if (fatal) throw new Error(message);
    }

    function tls (token = tokens[read]) { return tokenLocStr(token); }

    function save (read0, node) {	// Cache parsed node
	cache[read0] ||= {};
	cache[read0][node.type] = { node, readNext: read };
	return node;
    }

    // Check for a previously-parsed node at the current position
    function lookup (type) {
	const hit = cache[read]?.[type];
	if (hit) {
	    read = hit.readNext;
	    return hit.node;
	}
	return null;
    }

    // General parsing

    function parseBlock (allow = '{') {
	// { block }
	const type = tokens[read]?.type;
	if (type !== allow) return null;
	const hit = lookup(type);
	if (hit) return hit;
	const statements = [], read0 = read++, cur = tokens[read0];
	const node = { type, loc: cur.loc, statements };

	++blkDep;
	// deno-lint-ignore no-cond-assign
	for (let cur; cur = tokens[read]; ) {
	    if (cur.type === '}') {
		++read; --blkDep;
		if (cur.return) node.return = true;
		return save(read0, node);
	    }
	    if ((msgDep && cur.type === ')') || (lstDep && cur.type === ']')) break;
	    const statement = parseStatement();
	    if (statement) node.statements.push(statement);
	    else {
		error(`Syntax error: Unexpected ${showToken(cur)} at ${tls()}`);
		++read;
	    }
	}
	error(`Unterminated block at ${tls(cur)}`);
	--blkDep;
	return save(read0, node);
    }

    function parseChain () {
	// base ( message-and-optional-params ) ...
	const hit = lookup('chn');
	if (hit) return hit;
	const read0 = read, base = parseVar() || parseLiteral();
	if (!base) return null;
	const messages = [], node = { type: 'chn', loc: base.loc, base, messages };
	// deno-lint-ignore no-cond-assign
	for (let message; message = parseMessage(); ) messages.push(message);
	if (messages.length) return save(read0, node);
	read = read0;
	return null;
    }

    function parseJS () {
	const cur = tokens[read];
	if (cur?.type === 'js') {
	    ++read;
	    return cur;
	}
	return null;
    }

    function parseList () {
	// [ name=value value ... ]
	if (tokens[read]?.type !== '[') return null;
	const hit = lookup('[');
	if (hit) return hit;
	const read0 = read++, cur = tokens[read0], items = [],
	    node = { type: '[', loc: cur.loc, items };

	++lstDep;
	// deno-lint-ignore no-cond-assign
	for (let cur; cur = tokens[read]; ) {
	    if (cur.type === ']') {
		++read; --lstDep;
		return save(read0, node);
	    }
	    if ((msgDep && cur.type === ')') || (blkDep && cur.type === '}')) break;
	    const item = parseNamedValue() || parseValue();
	    if (item) items.push(item);
	    else {
		error(`Syntax error: Unexpected ${showToken(cur)} at ${tls()}`);
		++read;
	    }
	}
	error(`Unterminated list at ${tls(cur)}`);
	--lstDep;
	return save(read0, node);
    }

    function parseLiteral () {
	// Text, word, number, list, or block
	const cur = tokens[read];
	switch (cur?.type) {
	case 'num':
	case 'txt':
	case 'wrd':
	    return tokens[read++];
	}
	return parseList() || parseBlock();
    }

    function parseMessage () {
	// ( message params )
	if (tokens[read]?.type !== '(') return null;
	const hit = lookup('(');
	if (hit) return hit;
	const read0 = read, cur = tokens[read++];
	const message = parseValue(), params = [], node = {
	    type: '(', loc: cur.loc, message, params
	};

	++msgDep;
	// deno-lint-ignore no-cond-assign
	for (let cur; cur = tokens[read]; ) {
	    if (cur.type === ')') {
		++read; --msgDep;
		return save(read0, node);
	    }
	    if ((lstDep && cur.type === ']') || (blkDep && cur.type === '}')) break;
	    const param = parseNamedValue() || parseValue();
	    if (param) params.push(param);
	    else {
		error(`Syntax error: Unexpected ${showToken(cur)} at ${tls()}`);
		++read;
	    }
	}
	error(`Unterminated message at ${tls(cur)}`);
	--msgDep;
	return save(read0, node);
    }

    function parseName () {
	// Chain, number, text, or word
	const chain = parseChain();
	if (chain) return chain;
	const cur = tokens[read];
	switch (cur?.type) {
	case 'num':
	case 'txt':
	case 'wrd':
	    return tokens[read++];
	}
	return null;
    }

    function parseNamedValue () {
	// name=value
	const hit = lookup('=');
	if (hit) return hit;
	const read0 = read, name = parseName(), cur = tokens[read];
	if (!name || cur?.type !== 'wrd' || cur.text != '=') {
	    read = read0;
	    return null;
	}
	const eq = tokens[read++], value = parseValue();
	if (!value) {
	    error(`Missing value in named value at ${tls(eq)}`);
	    return null;
	}
	return save(read0, {
	    type: '=', loc: eq.loc, name, value
	});
    }

    function parseStatement () {
	const js = parseJS();
	if (js) return js;
	const node = parseValue() || parseBlock('dbg');
	if (node) return { type: 'stm', loc: node.loc, node };
    }

    function parseValue () {
	// Chain, literal, or variable
	return parseChain() || parseVar(true) || parseLiteral();
    }

    function parseVar (reqName = false) {
	// % / %name / %?name, etc
	const read0 = read, hit = lookup('var');
	if (hit) {
	    if (hit.name || !reqName) return hit;
	    read = read0;
	    return null;
	}
	const ns = tokens[read], space = ns?.text;
	if (ns?.type !== 'wrd') return null;
	switch (space) {
	case '%': case '%?':		// Object persistent properties
	case '#': case '#?':		// Transient (scratch) storage
	case '!': case '!?':		// Message parameters
	case '%*': case '%*?':		// Global (@gss alias)
	case '%/': case '%/?':		// Module (@mps alias)
	    break;
	default:
	    return null;
	}
	const name = tokens[++read], nType = name?.type;
	if (nType === 'txt' || nType === 'wrd' || (nType === 'num' && Number.isInteger(name.value))) {
	    ++read;
	    return save(read0, { type: 'var', loc: ns.loc, space, name });
	}
	if (reqName) --read;
	return (reqName ? null : save(read0, { type: 'var', loc: ns.loc, space }));
    }

    // ----------

    while (read < end) {
	const res = parseStatement();
	if (res) output.push(res);
	else {
	    const cur = tokens[read];
	    if (cur?.type === 'utq') {
		error(`Unterminated ${cur.text} at ${tls()}`);
		break;
	    }
	    error(`Syntax error: Unexpected ${showToken(cur)} at ${tls()}`);
	    ++read;
	}
    }
    return { tree: output, errors };
}

// Return a token's location string
export function tokenLocStr (token) {
    const loc = token?.loc;
    return (loc ? `${loc.src || 'unknown'}:${loc.line + 1}:${loc.col + 1}` : 'end of input');
}

// END
