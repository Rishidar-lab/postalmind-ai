import { NextResponse } from 'next/server';
import { ask } from '@/lib/ask/answer';
import { clientId, jsonError, readJsonBounded, securityHeaders } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ask  { question: string, history?: {role,content}[] }
 * Returns the full structured AskResult (classification + citations).
 */
export async function POST(req: Request) {
  const cfg = getConfig();
  const limit = rateLimit(clientId(req), 30);
  if (!limit.allowed) return jsonError('rate_limited', 'Rate limit exceeded. Try again in a minute.', 429);

  const parsed = await readJsonBounded<{ question?: unknown; history?: unknown }>(req);
  if (!parsed.ok) return parsed.response;

  const question = String(parsed.data.question ?? '').slice(0, cfg.limits.maxMessageChars).trim();
  if (question.length < 3) return jsonError('bad_request', 'Provide a question (at least 3 characters).', 400);

  const history = Array.isArray(parsed.data.history)
    ? (parsed.data.history as unknown[])
        .slice(-6)
        .map((h) => {
          const o = h as { role?: string; content?: unknown };
          return {
            role: o.role === 'assistant' ? ('assistant' as const) : ('user' as const),
            content: String(o.content ?? '').slice(0, cfg.limits.maxMessageChars),
          };
        })
        .filter((h) => h.content.trim().length > 0)
    : [];

  try {
    const result = await ask(question, { history });
    return NextResponse.json(result, { headers: securityHeaders() });
  } catch (err) {
    console.error('[ask] failed:', err instanceof Error ? err.message : 'unknown');
    return jsonError('internal', 'Could not produce an answer.', 500);
  }
}

export function GET() {
  return jsonError('method_not_allowed', 'Use POST with { question }.', 405);
}
