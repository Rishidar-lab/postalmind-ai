import { NextResponse } from 'next/server';
import { SOURCES, SOURCE_BY_ID } from '@/content/sources';
import { CORPUS } from '@/content/corpus';
import { verificationViolations } from '@/lib/sources/trust';
import { isGenuinelyVerified } from '@/lib/sources/versioning';
import { jsonError, securityHeaders } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { clientId } from '@/lib/http';
import type { SourceRecord } from '@/lib/sources/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/sources/verify
 *
 * Body: { sourceId, passageIds?: string[], verifiedPages?: number[], verificationNotes?: string }
 *
 * A maintainer explicitly approves passages for verification.
 */
export async function POST(req: Request) {
  const id = clientId(req);
  const limit = rateLimit(id, 5);
  if (!limit.allowed) {
    return jsonError('rate_limited', 'Rate limit exceeded.', 429);
  }

  let body: unknown;
  try {
    const text = await req.text();
    body = JSON.parse(text);
  } catch {
    return jsonError('bad_request', 'Invalid JSON body.', 400);
  }

  const b = body as Record<string, unknown>;
  const sourceId = String(b.sourceId ?? '').trim();
  if (!sourceId) {
    return jsonError('bad_request', 'Provide sourceId.', 400);
  }

  const source = SOURCE_BY_ID.get(sourceId);
  if (!source) {
    return jsonError('bad_request', `Unknown sourceId: ${sourceId}`, 400);
  }

  const passageIds = Array.isArray(b.passageIds) ? (b.passageIds as string[]) : [];
  const verifiedPages = Array.isArray(b.verifiedPages) ? (b.verifiedPages as number[]) : [];
  const verificationNotes = typeof b.verificationNotes === 'string' ? b.verificationNotes : null;
  const verificationMethod = typeof b.verificationMethod === 'string' ? b.verificationMethod : 'manual-primary-document-check';

  const sourcePassages = CORPUS.filter((p) => p.sourceId === sourceId);
  const invalidPassages = passageIds.filter((pid) => !sourcePassages.some((p) => p.id === pid));
  if (invalidPassages.length > 0) {
    return jsonError('bad_request', `Invalid passageIds: ${invalidPassages.join(', ')}`, 400);
  }

  const pageCount = source.pageCount ?? 0;
  const invalidPages = verifiedPages.filter((p) => p < 1 || (pageCount > 0 && p > pageCount));
  if (invalidPages.length > 0) {
    return jsonError('bad_request', `Invalid page numbers: ${invalidPages.join(', ')}`, 400);
  }

  const now = new Date().toISOString();
  const updatedSource: SourceRecord = {
    ...source,
    status: 'VERIFIED',
    verifiedAt: now,
    verificationMethod,
    verificationNotes,
    verifiedPages: verifiedPages.length > 0 ? verifiedPages : source.verifiedPages,
    updatedAt: now,
  };

  const violations = verificationViolations([updatedSource]);
  if (violations.length > 0) {
    return jsonError('verification_failed', `Verification invariants violated: ${violations.join('; ')}`, 422);
  }

  return NextResponse.json(
    {
      ok: true,
      sourceId,
      status: 'VERIFIED',
      verifiedAt: now,
      verificationMethod,
      verifiedPages,
      passageIds,
      verificationNotes,
      violations: [],
      message: `Source ${sourceId} marked VERIFIED. ${passageIds.length} passage(s) approved.`,
    },
    { headers: securityHeaders() },
  );
}

/**
 * GET /api/sources/verify?sourceId=<id>
 *
 * Returns the verification state for a source without modifying it.
 */
export async function GET(req: Request) {
  const id = clientId(req);
  const limit = rateLimit(id, 30);
  if (!limit.allowed) {
    return jsonError('rate_limited', 'Rate limit exceeded.', 429);
  }

  const { searchParams } = new URL(req.url);
  const sourceId = searchParams.get('sourceId')?.trim();
  if (!sourceId) {
    return jsonError('bad_request', 'Provide sourceId query param.', 400);
  }

  const source = SOURCE_BY_ID.get(sourceId);
  if (!source) {
    return jsonError('not_found', `Source not found: ${sourceId}`, 404);
  }

  const passages = CORPUS.filter((p) => p.sourceId === sourceId);
  const violations = verificationViolations([source]);

  return NextResponse.json(
    {
      sourceId,
      status: source.status,
      verifiedAt: source.verifiedAt,
      verificationMethod: source.verificationMethod,
      verifiedPages: source.verifiedPages,
      verificationNotes: source.verificationNotes,
      passageCount: passages.length,
      verifiedPassageCount: passages.filter((p) => p.status === 'VERIFIED').length,
      unverifiedPassageCount: passages.filter((p) => p.status === 'UNVERIFIED').length,
      violations,
      isGenuinelyVerified: isGenuinelyVerified(source),
    },
    { headers: securityHeaders() },
  );
}