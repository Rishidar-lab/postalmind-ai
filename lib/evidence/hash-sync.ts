/**
 * Synchronous SHA-256 — Node runtime only.
 *
 * Imported by the demo seed (`lib/store/seed.ts`) and tests. NEVER import this
 * from a client component or a module reachable from one — it pulls in
 * `node:crypto`. Client code uses the async `sha256Hex` from `./hash`.
 */

import { createHash } from 'node:crypto';

export function sha256HexSync(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? Buffer.from(input, 'utf8') : Buffer.from(input);
  return createHash('sha256').update(bytes).digest('hex');
}
