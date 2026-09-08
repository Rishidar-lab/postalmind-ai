import { NextResponse } from 'next/server';
import { SOURCE_BY_ID } from '@/content/sources';
import { detectChange, applyVersion, latestVersion, compareVersions, type ChangeDetectionResult } from '@/lib/sources/versioning';
import { jsonError, securityHeaders } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { clientId } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    const text = await req.text();
    body = JSON.parse(text);
  } catch {
    return jsonError('bad_request', 'Invalid JSON body.', 400);
  }

  const b = body as Record<string, unknown>;
  const action = String(b.action ?? 'detect');

  if (action === 'compare') {
    const sourceId = String(b.sourceId ?? '').trim();
    const versionAId = String(b.versionAId ?? '').trim();
    const versionBId = String(b.versionBId ?? '').trim();

    if (!sourceId || !versionAId || !versionBId) {
      return jsonError('bad_request', 'Provide sourceId, versionAId, versionBId.', 400);
    }

    const source = SOURCE_BY_ID.get(sourceId);
    if (!source) {
      return jsonError('not_found', `Source not found: ${sourceId}`, 404);
    }

    const comparison = compareVersions(source, versionAId, versionBId);
    if (!comparison) {
      return jsonError('bad_request', 'One or both version IDs not found.', 400);
    }

    return NextResponse.json(
      {
        sourceId,
        versionA: comparison.a,
        versionB: comparison.b,
        sameBytes: comparison.sameBytes,
      },
      { headers: securityHeaders() },
    );
  }

  // Default action: detect change
  const sourceId = String(b.sourceId ?? '').trim();
  if (!sourceId) {
    return jsonError('bad_request', 'Provide sourceId.', 400);
  }

  const source = SOURCE_BY_ID.get(sourceId);
  if (!source) {
    return jsonError('not_found', `Source not found: ${sourceId}`, 404);
  }

  const sha256 = String(b.sha256 ?? '');
  if (!sha256) {
    return jsonError('bad_request', 'Provide sha256.', 400);
  }

  const byteLength = typeof b.byteLength === 'number' ? b.byteLength : 0;
  const pageCount = typeof b.pageCount === 'number' ? b.pageCount : null;
  const filename = typeof b.filename === 'string' ? b.filename : 'unknown.pdf';
  const mimeType = typeof b.mimeType === 'string' ? b.mimeType : 'application/pdf';

  const detection: ChangeDetectionResult = detectChange(source, sha256);
  const updatedSource = applyVersion(source, sha256, byteLength, pageCount, filename, mimeType);

  return NextResponse.json(
    {
      ok: true,
      sourceId,
      detection,
      newStatus: updatedSource.status,
      versionCount: updatedSource.versions.length,
      latestVersion: latestVersion(updatedSource)?.versionId ?? null,
      message: detection.changed
        ? `Bytes changed — new version created. Verification invalidated until re-reviewed.`
        : `Bytes unchanged — no new version needed.`,
    },
    { headers: securityHeaders() },
  );
}

/**
 * GET /api/sources/version?sourceId=<id>
 *
 * Returns version history for a source.
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

  return NextResponse.json(
    {
      sourceId,
      versions: source.versions.map((v) => ({
        versionId: v.versionId,
        sha256: v.sha256,
        byteLength: v.byteLength,
        pages: v.pages,
        retrievedAt: v.retrievedAt,
        supersedesVersionId: v.supersedesVersionId,
        ingestedAt: v.ingestedAt,
      })),
      latestVersion: latestVersion(source)?.versionId ?? null,
      totalVersions: source.versions.length,
    },
    { headers: securityHeaders() },
  );
}