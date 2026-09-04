/**
 * Evidence integrity primitives.
 *
 * Every imported original gets a SHA-256 over its exact bytes. The hash is
 * computed locally and never depends on an external service.
 *
 * `sha256Hex` is isomorphic (prefers Web Crypto, falls back to Node). The
 * synchronous helper is Node-only and used by API routes (runtime = 'nodejs'),
 * the demo seed, and tests — no client module imports this file.
 */

import { createHash } from 'node:crypto';

/** SHA-256 hex digest of a string (UTF-8) or bytes. */
export async function sha256Hex(input: string | Uint8Array | ArrayBuffer): Promise<string> {
  const bytes =
    typeof input === 'string'
      ? new TextEncoder().encode(input)
      : input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : input;

  const g = globalThis as unknown as { crypto?: Crypto };
  if (g.crypto?.subtle) {
    const digest = await g.crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
    return bufToHex(new Uint8Array(digest));
  }
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
}

/** Synchronous SHA-256 (Node runtime only). */
export function sha256HexSync(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? Buffer.from(input, 'utf8') : Buffer.from(input);
  return createHash('sha256').update(bytes).digest('hex');
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
