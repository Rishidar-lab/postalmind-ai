/**
 * Evidence integrity primitives.
 *
 * Every imported original gets a SHA-256 over its exact bytes. The hash is
 * computed locally (Node crypto on the server, Web Crypto in the browser) and
 * never depends on an external service.
 */

/** SHA-256 hex digest of a string (UTF-8) or bytes. Isomorphic. */
export async function sha256Hex(input: string | Uint8Array | ArrayBuffer): Promise<string> {
  const bytes =
    typeof input === 'string'
      ? new TextEncoder().encode(input)
      : input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : input;

  // Prefer Web Crypto (Edge runtime, browser, modern Node).
  const g = globalThis as unknown as { crypto?: Crypto };
  if (g.crypto?.subtle) {
    const digest = await g.crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
    return bufToHex(new Uint8Array(digest));
  }

  // Node fallback.
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
}

/** Synchronous SHA-256 for Node-only contexts (tests, scripts, API routes on Node runtime). */
export function sha256HexSync(input: string | Uint8Array): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createHash } = require('node:crypto') as typeof import('node:crypto');
  const bytes = typeof input === 'string' ? Buffer.from(input, 'utf8') : Buffer.from(input);
  return createHash('sha256').update(bytes).digest('hex');
}

function bufToHex(buf: Uint8Array): string {
  let out = '';
  for (let i = 0; i < buf.length; i++) out += buf[i].toString(16).padStart(2, '0');
  return out;
}

/**
 * A short, human-quotable fingerprint of a full hash, e.g. for display in a
 * timeline entry ("sha256:9f86d081…a08"). Never used for verification — the
 * full hash is the record.
 */
export function shortHash(hex: string): string {
  if (hex.length <= 12) return hex;
  return `${hex.slice(0, 8)}…${hex.slice(-3)}`;
}
