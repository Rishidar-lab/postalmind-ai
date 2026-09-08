/**
 * Evidence integrity primitives — ISOMORPHIC (browser + Node + Edge).
 *
 * Every imported original gets a SHA-256 over its exact bytes, computed on the
 * device. This module has **no Node imports** so it is safe in a client bundle:
 * it uses the Web Crypto API (`crypto.subtle`), which is available in every
 * modern browser, in Node 20+, and on the Edge runtime.
 *
 * The synchronous Node-only helper lives in `hash-sync.ts` (used by the demo
 * seed and tests only — never by client code).
 */

function getSubtle(): SubtleCrypto {
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (!c?.subtle) {
    throw new Error('Web Crypto (crypto.subtle) is not available in this environment.');
  }
  return c.subtle;
}

/** SHA-256 hex digest of a string (UTF-8) or bytes. */
export async function sha256Hex(input: string | Uint8Array | ArrayBuffer): Promise<string> {
  const bytes =
    typeof input === 'string'
      ? new TextEncoder().encode(input)
      : input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : input;
  const digest = await getSubtle().digest('SHA-256', bytes as unknown as ArrayBuffer);
  return bufToHex(new Uint8Array(digest));
}

/** SHA-256 hex digest of a Blob/File, streamed via arrayBuffer(). */
export async function sha256HexOfBlob(blob: Blob): Promise<string> {
  return sha256Hex(await blob.arrayBuffer());
}

function bufToHex(buf: Uint8Array): string {
  let out = '';
  for (let i = 0; i < buf.length; i++) out += buf[i].toString(16).padStart(2, '0');
  return out;
}

/**
 * A short, human-quotable fingerprint of a full hash, e.g. "9f86d081…a08".
 * Never used for verification — the full hash is the record.
 */
export function shortHash(hex: string): string {
  if (hex.length <= 12) return hex;
  return `${hex.slice(0, 8)}…${hex.slice(-3)}`;
}
