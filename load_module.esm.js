// SysCL server-side module loader with integrity checking

const loaded = new Set();
let loadMap;

// Algorithm: SHA-256 / SHA-384 / SHA-512
export async function calcIntegrity (source, algorithm) {
  const encoder = new TextEncoder();
  const data = encoder.encode(source);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const base64Hash = btoa(String.fromCharCode(...hashArray));
  return `${algorithm.toLowerCase().replace('-', '')}-${base64Hash}`;
}

export async function loadModule (url) {
    url = remap(url);
    if (!url.startsWith('./') && !url.startsWith('../') && !url.startsWith('https://')) throw new Error(`loadModule: Invalid module URL "${url}"`);

    const urlMat = url.match(/^(https:\/\/[^/]+\/)?(.*)/), host = urlMat[1] || '', path = urlMat[2];
    const integrity = host ? (loadMap?.host?.[host]?.integrity?.[path] || loadMap?.integrity?.[host + path]) : loadMap?.integrity?.[path];
    const intMat = integrity?.match(/(?:\s|^)(sha512-[^\s]+)/), sig = intMat && intMat[1];

    if (!sig) throw new Error('loadModule: Missing sha512 integrity value');
    if (loaded.has(sig)) return;	// Already loaded

    const code = await (host ? fetch(url).then(r => r.text()) : Deno.readTextFile(url)), check = await calcIntegrity(code, 'SHA-512');
    // console.log('code', code);
    // console.log(`integrity: expecting ${sig} got ${check}`);
    if (sig !== check) throw new Error(`loadModule: Integrity mismatch for "${url}"`);
    loaded.add(sig);
    return await import(`data:application/javascript;base64,${btoa(code)}`);
}

function remap (url) {
    let best, len = 0;
    for (const key of Object.keys(loadMap?.modules || {})) {
	if (key === url) return loadMap.modules[key];
	if (key.slice(-1) === '/' && url.startsWith(key) && key.length > len) [ best, len ] = [ key, key.length ];
    }
    if (len) return url.replace(best, loadMap.modules[best]);
    return url;
}

export function setLoadMap (map) {
    if (!loadMap) loadMap = JSON.parse(JSON.stringify(map));
}
