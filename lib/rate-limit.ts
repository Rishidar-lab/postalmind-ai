/**
 * In-process fixed-window rate limiter.
 *
 * NOTE: this is per-instance and resets on cold starts. On serverless it is a
 * soft guard, not a hard control. A shared limiter (Upstash / Vercel KV) is the
 * production path — see docs/THREAT-MODEL.md. Kept because it still blunts
 * accidental loops and single-instance bursts.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60_000;
const DEFAULT_MAX = 20;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

export function rateLimit(key: string, max = DEFAULT_MAX): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: max - 1, resetAt: now + WINDOW_MS, limit: max };
  }
  if (entry.count >= max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, limit: max };
  }
  entry.count += 1;
  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt, limit: max };
}

// Periodic cleanup of expired entries.
if (typeof setInterval === 'function') {
  const timer = setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (now > entry.resetAt) store.delete(key);
    });
  }, 300_000);
  // Do not keep the event loop alive for this.
  (timer as unknown as { unref?: () => void }).unref?.();
}
