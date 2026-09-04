/**
 * Shared HTTP helpers for API routes: bounded body reading, structured errors,
 * a hashed client identifier for rate limiting / logs (never the raw IP).
 */

import { NextResponse } from 'next/server';
import { getConfig } from './config';
import { sha256HexSync } from './evidence/hash-sync';

export interface ApiError {
  error: string;
  code: string;
  detail?: string;
}

export function jsonError(code: string, message: string, status: number, detail?: string) {
  const body: ApiError = { error: message, code };
  if (detail) body.detail = detail;
  return NextResponse.json(body, { status });
}

/** Hashed, salted client id — safe to log, not reversible to an IP. */
export function clientId(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  const ip = (fwd ? fwd.split(',')[0] : req.headers.get('x-real-ip') || 'unknown').trim();
  const { hashSalt } = getConfig();
  return sha256HexSync(`${hashSalt}:${ip}`).slice(0, 16);
}

/** Read and parse a JSON body, rejecting oversized or malformed payloads. */
export async function readJsonBounded<T = unknown>(
  req: Request,
  maxBytes?: number,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  const limit = maxBytes ?? getConfig().limits.maxRequestBytes;
  const lenHeader = req.headers.get('content-length');
  if (lenHeader && Number(lenHeader) > limit) {
    return { ok: false, response: jsonError('payload_too_large', 'Request body is too large.', 413) };
  }
  const text = await req.text();
  if (text.length > limit) {
    return { ok: false, response: jsonError('payload_too_large', 'Request body is too large.', 413) };
  }
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, response: jsonError('bad_json', 'Request body is not valid JSON.', 400) };
  }
}

export function securityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
  };
}
