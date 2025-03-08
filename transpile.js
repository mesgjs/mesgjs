// Split raw text input into tokens, parse, and transpile
function transpile (input, loc = {}) {
    const { tree, errors } = parse(lex(input, loc).tokens);
    return transpileTree(tree, errors);
}

// Transpile pre-parsed input
function transpileTree (tree, errors = []) {
    let outBuf = [], nextBlock = 0;
    const blocks = [], outStack = [];

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
	    case '@c': output('core'); break;	// core
	    case '@m': output('m'); break;	// message
	    default: return false;
	    }
	    return true;
	}
	output('sm('.repeat(msgs.length));
	if (!specialBase(base)) generate(base);
	msgs.forEach(m => { output(','); generateMessage(m); output(')'); });
    }

    const generateBlock = node => generateCode(node, 'block');
    const generateDefer = node => generateCode(node, 'defer');
    function generateCode (node, type) {
	const blockNum = nextBlock++;

	// Generate out-of-band (blocks array) content
	pushOut();
	// Code template will be assigned a global block id at first binding
	output(`{cd:m=>{const{mp,ps,sm,ts}=m;`);
	switch (type) {
	case 'block':
	    node.statements.forEach(s => { generate(s); output(';'); });
	    output('}}');
	    break;
	case 'defer':
	    output('return ');
	    generate(node.expr);
	    output(';}}');
	    break;
	}
	blocks[blockNum] = popOut();

	// Generate in-band code content
	output(`m.b(bt[${blockNum}])`);
    }

    function generateFinalOutput () {
	if (blocks.length) {
	    outBuf.unshift('(()=>{const bt=[', blocks.join(','), '];');
	    outBuf.push('})();');
	    blocks.length = 0;
	}
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
	if (node.name) output(`ng(${space},'${escapeJSStr(node.name.text)}')`);
	else output(space);
    }

    function generateWord (node) {
	switch (node.text) {
	case '@f': output('$f'); break;		// false
	case '@mods': output('$mods'); break;	// module storage
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
