import 'mesgjs/runtime/mesgjs.esm.js';
import { getInstance } from 'mesgjs/runtime/runtime.esm.js';
import { loadModuleCode, test, testAsync, testReturns, testSummary, testTranspile } from 'mesgjs/test/test.esm.js';

console.log('[****] @try');

await (async () => {
    let txp;
    if (testReturns('get @try', () => getInstance('@try'), res => res.sclType === '@try')) {
	if ((txp = testTranspile('@try 1st txp',
`%(nset t=@c(get @try)) @gss(nset alw=@f) @gss(nset r=%t(try mainLiteral always={@gss(nset alw=@t)}))`)) &&
	  await testAsync('@try 1st load', () => loadModuleCode(txp.code))) {
	    testReturns('@try 1st result', () => $gss.at('r'), 'mainLiteral');
	    testReturns('@try 1st always', () => $gss.at('alw'), true);
	}

	if ((txp = testTranspile('@try 2nd txp',
`%(nset t=@c(get @try)) @gss(nset r=%t(try {returns1!} {returns2!}))`)) &&
	  await testAsync('@try 2nd load', () => loadModuleCode(txp.code))) {
	    testReturns('@try 2nd result', () => $gss.at('r'), 'returns2');
	    testReturns('@try 2nd always', () => $gss.at('alw'), true);
	}

	if ((txp = testTranspile('@try set+throw txp',
`%(nset t=@c(get @try)) @gss(nset alw=@f v=@f) %t(try {@gss(nset v=@t)} {@c(throw Oops)} catch={@gss(nset type=%t(name) mesg=%t(message))} always={@gss(nset alw=@t)})`)) &&
	  await testAsync('@try set+throw load', () => loadModuleCode(txp.code))) {
	    testReturns('@try set+throw v', () => $gss.at('v'), true);
	    testReturns('@try set+throw type', () => $gss.at('type'), 'Error');
	    testReturns('@try set+throw mesg', () => $gss.at('mesg'), 'Oops');
	    testReturns('@try set+throw always', () => $gss.at('alw'), true);
	}

	if ((txp = testTranspile('@try CATCHERS+catch txp',
`%(nset t=@c(get @try)) @gss(nset alw=@f res=@u)
%t(try {@c(throw x)} catchers=[Error={@gss(nset res=good)}] catch={@gss(nset res=bad)} always={@gss(nset alw=@t)})`)) &&
	  await testAsync('@try CATCHERS+catch load', () => loadModuleCode(txp.code))) {
	    testReturns('@try CATCHERS+catch handler', () => $gss.at('res'), 'good');
	    testReturns('@try CATCHERS+catch always', () => $gss.at('alw'), true);
	}

	if ((txp = testTranspile('@try catchers+CATCH txp',
`%(nset t=@c(get @try)) @gss(nset alw=@f res=@u)
%t(try {@c(throw x)} catchers=[TypeError={@gss(nset res=bad)}] catch={@gss(nset res=good)} always={@gss(nset alw=@t)})`)) &&
	  await testAsync('@try catchers+CATCH load', () => loadModuleCode(txp.code))) {
	    testReturns('@try catchers+CATCH handler', () => $gss.at('res'), 'good');
	    testReturns('@try catchers+CATCH always', () => $gss.at('alw'), true);
	}

    }
})();

testSummary();
