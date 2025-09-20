// Algorithm: SHA-256 / SHA-384 / SHA-512
export async function calcDigest (source, algorithm) {
	const data = (typeof source === 'string') ? new TextEncoder().encode(source) : source;
	const hashBuffer = await crypto.subtle.digest(algorithm, data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const base64Hash = btoa(String.fromCharCode(...hashArray));
	return `${algorithm.toLowerCase().replace('-', '')}-${base64Hash}`;
}

// Return the sha512 hash from a potentially multi-hash integrity value
export function getIntegritySHA512 (integ) {
	const m = typeof integ === 'string' && integ.match(/(?:^|\s)(sha512-\S+)/);
	if (m) return m[1];
}

// END
