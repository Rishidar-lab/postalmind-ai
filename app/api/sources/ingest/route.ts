import { NextResponse } from 'next/server';
import { ingestPdf, sanitiseFilename, type DocumentIngestionResult } from '@/lib/sources/ingest';
import { SOURCES, SOURCE_BY_ID } from '@/content/sources';
import { CORPUS } from '@/content/corpus';
import { jsonError, securityHeaders } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { clientId } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/sources/ingest
 *
 * Body: multipart/form-data with `file` (PDF) and `sourceId`.
 *
 * Ingests a PDF, computes SHA-256, extracts text page-by-page,
 * generates draft UNVERIFIED passages.
 *
 * Security:
 *  - Only maintainer-side (rate-limited)
 *  - Size limit enforced
 *  - Magic-byte PDF validation
 *  - Path traversal protection on filename
 */
export async function POST(req: Request) {
  const id = clientId(req);
  const limit = rateLimit(id, 10);
  if (!limit.allowed) {
    return jsonError('rate_limited', 'Rate limit exceeded.', 429);
  }

  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return jsonError('bad_request', 'Expected multipart/form-data.', 400);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonError('bad_request', 'Cannot parse multipart body.', 400);
  }

  const file = formData.get('file') as File | null;
  const sourceId = String(formData.get('sourceId') ?? '').trim();

  if (!file) {
    return jsonError('bad_request', 'Provide a file.', 400);
  }
  if (!sourceId) {
    return jsonError('bad_request', 'Provide a sourceId.', 400);
  }
  if (!SOURCE_BY_ID.has(sourceId)) {
    return jsonError('bad_request', `Unknown sourceId: ${sourceId}`, 400);
  }

  if (file.size === 0) {
    return jsonError('bad_request', 'Empty file.', 400);
  }

  if (file.size > 50 * 1024 * 1024) {
    return jsonError('bad_request', `File too large (${file.size} bytes). Max 50 MB.`, 400);
  }

  // MIME validation: accept application/pdf and common variants
  const mime = file.type ?? '';
  if (mime !== 'application/pdf' && mime !== '' && !mime.includes('pdf')) {
    return jsonError('bad_request', `Unexpected MIME type: ${mime}. Expected application/pdf.`, 400);
  }

  // Check extension
  const filename = file.name ?? 'upload.pdf';
  if (!filename.toLowerCase().endsWith('.pdf')) {
    return jsonError('bad_request', 'File must have a .pdf extension.', 400);
  }

  // Read file into buffer
  let buffer: Buffer;
  try {
    const arrayBuf = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuf);
  } catch {
    return jsonError('internal', 'Cannot read file content.', 500);
  }

  // Write to temp file for ingestion (pdf-parse needs a file path or buffer)
  const { writeFileSync, unlinkSync, mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const tmpDir = mkdtempSync(join(tmpdir(), 'postalmind-ingest-'));
  const tmpPath = join(tmpDir, sanitiseFilename(filename));
  writeFileSync(tmpPath, buffer);

  let result: DocumentIngestionResult;
  try {
    result = await ingestPdf(tmpPath, sourceId);
  } catch (e) {
    result = {
      sourceId,
      sha256: '',
      byteLength: buffer.length,
      mimeType: 'application/pdf',
      pageCount: null,
      pages: [],
      passages: [],
      errors: [{ phase: 'ingest', message: e instanceof Error ? e.message : 'Unknown ingestion error' }],
      ok: false,
    };
  } finally {
    try { unlinkSync(tmpPath); } catch { /* ignore */ }
    try { unlinkSync(tmpDir); } catch { /* ignore */ }
  }

  return NextResponse.json(
    {
      ok: result.ok,
      sourceId,
      sha256: result.sha256,
      byteLength: result.byteLength,
      pageCount: result.pageCount,
      passageCount: result.passages.length,
      passages: result.passages.map((p) => ({
        id: p.id,
        page: p.page,
        section: p.section,
        status: p.status,
        textPreview: p.text.slice(0, 300),
        textLength: p.text.length,
      })),
      errors: result.errors,
    },
    { headers: securityHeaders() },
  );
}

export function GET() {
  return jsonError('method_not_allowed', 'Use POST with multipart/form-data.', 405);
}