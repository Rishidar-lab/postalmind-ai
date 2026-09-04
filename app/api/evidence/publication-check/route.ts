import { NextResponse } from 'next/server';
import { publicationSafetyCheck, type PublicationInput } from '@/lib/evidence/publication';
import { clientId, jsonError, readJsonBounded, securityHeaders } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/evidence/publication-check
 * Body: PublicationInput. Runs the 12-point publication safety check locally.
 * Nothing is stored; text is not sent to any AI provider.
 */
export async function POST(req: Request) {
  const limit = rateLimit(clientId(req), 30);
  if (!limit.allowed) return jsonError('rate_limited', 'Rate limit exceeded.', 429);

  const parsed = await readJsonBounded<PublicationInput>(req);
  if (!parsed.ok) return parsed.response;

  const input = parsed.data;
  if (typeof input.text !== 'string' || input.text.trim().length === 0) {
    return jsonError('bad_request', 'Provide the text to be published.', 400);
  }
  if (input.text.length > 20_000) {
    return jsonError('payload_too_large', 'Text too long for a single check (max 20000 chars).', 413);
  }

  const report = publicationSafetyCheck(input);
  return NextResponse.json(report, { headers: securityHeaders() });
}
