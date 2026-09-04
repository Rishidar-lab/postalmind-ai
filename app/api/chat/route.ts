import { getConfig } from '@/lib/config';
import { ask } from '@/lib/ask/answer';
import { clientId, jsonError, readJsonBounded, securityHeaders } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface InMessage {
  role?: string;
  content?: unknown;
}

/**
 * POST /api/chat
 * Source-grounded assistant. Streams the answer as SSE, then a final `meta`
 * event carrying the classification and citations.
 *
 * Body: { messages: [{ role: 'user'|'assistant', content: string }] }
 */
export async function POST(req: Request) {
  const cfg = getConfig();
  const id = clientId(req);
  const limit = rateLimit(id, 20);
  if (!limit.allowed) {
    return jsonError('rate_limited', 'Rate limit exceeded. Try again in a minute.', 429);
  }

  const parsed = await readJsonBounded<{ messages?: InMessage[] }>(req);
  if (!parsed.ok) return parsed.response;
  const { messages } = parsed.data;

  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError('bad_request', 'Provide a non-empty "messages" array.', 400);
  }
  if (messages.length > cfg.limits.maxMessages) {
    return jsonError('bad_request', `Too many messages (max ${cfg.limits.maxMessages}).`, 400);
  }

  const clean = messages
    .map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: String(m.content ?? '').slice(0, cfg.limits.maxMessageChars).trim(),
    }))
    .filter((m) => m.content.length > 0);

  const lastUser = [...clean].reverse().find((m) => m.role === 'user');
  if (!lastUser) return jsonError('bad_request', 'No user message found.', 400);

  const history = clean.slice(0, clean.lastIndexOf(lastUser));

  let result;
  try {
    result = await ask(lastUser.content, { history });
  } catch (err) {
    console.error('[chat] ask failed:', err instanceof Error ? err.message : 'unknown');
    return jsonError('internal', 'Could not produce an answer. Please try again.', 500);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      // Stream the answer text in chunks for a typing feel.
      const text = result.answer;
      const step = 60;
      for (let i = 0; i < text.length; i += step) {
        send('delta', { text: text.slice(i, i + step) });
        await new Promise((r) => setTimeout(r, 10));
      }
      send('meta', {
        classification: result.classification,
        notice: result.notice,
        citations: result.citations,
        retrieval: result.retrieval,
        mode: result.mode,
        model: result.model,
        uncitedClaimWarnings: result.uncitedClaimWarnings,
      });
      send('done', {});
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-RateLimit-Remaining': String(limit.remaining),
      ...securityHeaders(),
    },
  });
}

export function GET() {
  return jsonError('method_not_allowed', 'Use POST with a messages array.', 405);
}
