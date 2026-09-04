import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { analyzeWhatsAppText } from '@/lib/evidence/analyze';
import { clientId, jsonError, securityHeaders } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/evidence/parse — OPTIONAL server-side analysis.
 *
 * The evidence UI does NOT use this for private evidence: it runs
 * `analyzeWhatsAppText` in the browser so the conversation never leaves the
 * device. This endpoint exists for demos, scripts and non-browser callers.
 *
 * Even here: nothing is persisted, and the text is NOT forwarded to any AI
 * provider — the same deterministic pipeline runs, just on the server.
 *
 * Accepts JSON { text, aliases?, workingHours?, eventDate? } or
 * multipart/form-data with a `file` field.
 */
export async function POST(req: Request) {
  const cfg = getConfig();
  const limit = rateLimit(clientId(req), 15);
  if (!limit.allowed) return jsonError('rate_limited', 'Rate limit exceeded. Try again in a minute.', 429);

  let text = '';
  let aliases: Record<string, string> = {};
  let workingHours: { start: string; end: string } | undefined;
  let eventDate: string | null = null;
  let filename = 'pasted.txt';

  const ct = req.headers.get('content-type') ?? '';
  try {
    if (ct.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (file instanceof File) {
        if (file.size > cfg.limits.maxUploadBytes) {
          return jsonError('payload_too_large', `File exceeds ${cfg.limits.maxUploadBytes} bytes.`, 413);
        }
        text = await file.text();
        filename = file.name || filename;
      }
      const a = form.get('aliases');
      if (typeof a === 'string' && a) aliases = JSON.parse(a);
      const wh = form.get('workingHours');
      if (typeof wh === 'string' && wh) workingHours = JSON.parse(wh);
      const ed = form.get('eventDate');
      if (typeof ed === 'string' && ed) eventDate = ed;
    } else {
      const raw = await req.text();
      if (raw.length > cfg.limits.maxUploadBytes) {
        return jsonError('payload_too_large', 'Body too large.', 413);
      }
      const body = JSON.parse(raw) as {
        text?: string;
        aliases?: Record<string, string>;
        workingHours?: { start: string; end: string };
        eventDate?: string;
      };
      text = String(body.text ?? '');
      aliases = body.aliases ?? {};
      workingHours = body.workingHours;
      eventDate = body.eventDate ?? null;
    }
  } catch {
    return jsonError('bad_request', 'Could not read the upload (bad JSON or form).', 400);
  }

  if (!text.trim()) return jsonError('bad_request', 'No chat text provided.', 400);
  if (text.length > cfg.limits.maxUploadBytes) {
    return jsonError('payload_too_large', 'Chat text too large.', 413);
  }

  const result = await analyzeWhatsAppText(text, { aliases, workingHours, eventDate });

  return NextResponse.json(
    {
      source: { filename, ...result.source },
      parse: {
        detectedFormat: result.parse.detectedFormat,
        dateOrder: result.parse.dateOrder,
        participants: result.parse.participants,
        dateRange: result.parse.dateRange,
        totalLines: result.parse.totalLines,
        excludedCount: result.parse.excludedCount,
        counts: result.parse.counts,
        warnings: result.parse.warnings,
        messages: result.parse.messages,
      },
      analysis: result.analysis,
      timeline: result.timeline,
      pii: result.pii,
      notes: [
        'Nothing was saved. This analysis is not persisted anywhere.',
        'This text was not sent to any AI provider — parsing, classification and PII detection ran deterministically on the server.',
        'The web UI analyses private evidence in the browser instead, so it never reaches the server at all.',
        'Classifications are evidence categories, not legal findings.',
      ],
    },
    { headers: securityHeaders() },
  );
}

export function GET() {
  return jsonError('method_not_allowed', 'POST a WhatsApp .txt export.', 405);
}
