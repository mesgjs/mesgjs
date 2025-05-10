// Algorithm: SHA-256 / SHA-384 / SHA-512
export async function calcDigest (source, algorithm) {
  const encoder = new TextEncoder();
  const data = encoder.encode(source);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const base64Hash = btoa(String.fromCharCode(...hashArray));
  return `${algorithm.toLowerCase().replace('-', '')}-${base64Hash}`;
}

export function getIntegritySHA512 (integ) {
    const m = integ?.match(/(?:^|\s)(sha512-\S+)/);
    if (m) return m[1];
}

// END
