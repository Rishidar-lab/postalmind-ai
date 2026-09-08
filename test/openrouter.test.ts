import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetConfigCache } from '@/lib/config';
import { resetProviderCache } from '@/lib/ai';

/**
 * OpenRouter provider — unit tests against a mocked global.fetch.
 * No live network calls are made; CI must never depend on a real OpenRouter key.
 */

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function sseResponse(lines: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line));
      controller.close();
    },
  });
  return new Response(stream, { status, headers: { 'Content-Type': 'text/event-stream' } });
}

async function collectStream(gen: AsyncGenerator<string, void, unknown>): Promise<string> {
  let out = '';
  for await (const chunk of gen) out += chunk;
  return out;
}

const OPTS = { system: 'You are helpful.', turns: [{ role: 'user' as const, content: 'question' }] };

describe('OpenRouter provider', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    resetConfigCache();
    resetProviderCache();
  });

  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.AI_REQUEST_TIMEOUT_MS;
    resetConfigCache();
    resetProviderCache();
  });

  it('missing OPENROUTER_API_KEY selects the demo provider, not openrouter', async () => {
    delete process.env.OPENROUTER_API_KEY;
    resetConfigCache();
    resetProviderCache();
    const { getProvider } = await import('@/lib/ai');
    const provider = getProvider();
    expect(provider.name).toBe('demo');
  });

  it('successful non-streaming response records the actual selected model', async () => {
    global.fetch = (async () =>
      jsonResponse({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        choices: [{ message: { content: 'Answer text [S1].' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      })) as typeof fetch;
    const { createOpenRouterProvider } = await import('@/lib/ai/openrouter');
    const result = await createOpenRouterProvider().generate(OPTS);
    expect(result.provider).toBe('openrouter');
    // The actual OpenRouter-selected model, not just the configured default.
    expect(result.model).toBe('meta-llama/llama-3.1-8b-instruct:free');
    expect(result.text).toBe('Answer text [S1].');
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
  });

  it('streams OpenAI-compatible SSE delta chunks and stops cleanly at [DONE]', async () => {
    global.fetch = (async () =>
      sseResponse([
        ': OPENROUTER PROCESSING\n\n',
        `data: ${JSON.stringify({ model: 'x/y:free', choices: [{ delta: { content: 'Hel' } }] })}\n\n`,
        `data: ${JSON.stringify({ choices: [{ delta: { content: 'lo' } }] })}\n\n`,
        'data: [DONE]\n\n',
      ])) as typeof fetch;
    const { createOpenRouterProvider } = await import('@/lib/ai/openrouter');
    const text = await collectStream(createOpenRouterProvider().stream!(OPTS));
    expect(text).toBe('Hello');
  });

  it('malformed JSON lines in the stream are ignored, not fatal', async () => {
    global.fetch = (async () =>
      sseResponse([
        'data: {not valid json\n\n',
        `data: ${JSON.stringify({ choices: [{ delta: { content: 'ok' } }] })}\n\n`,
        'data: [DONE]\n\n',
      ])) as typeof fetch;
    const { createOpenRouterProvider } = await import('@/lib/ai/openrouter');
    const text = await collectStream(createOpenRouterProvider().stream!(OPTS));
    expect(text).toBe('ok');
  });

  it('empty stream (no deltas at all) rejects with an empty ProviderError', async () => {
    global.fetch = (async () => sseResponse(['data: [DONE]\n\n'])) as typeof fetch;
    const { createOpenRouterProvider } = await import('@/lib/ai/openrouter');
    await expect(collectStream(createOpenRouterProvider().stream!(OPTS))).rejects.toMatchObject({
      kind: 'empty',
    });
  });

  it('empty non-streaming completion rejects with an empty ProviderError', async () => {
    global.fetch = (async () =>
      jsonResponse({ model: 'x', choices: [{ message: { content: '' }, finish_reason: 'stop' }] })) as typeof fetch;
    const { createOpenRouterProvider } = await import('@/lib/ai/openrouter');
    await expect(createOpenRouterProvider().generate(OPTS)).rejects.toMatchObject({ kind: 'empty' });
  });

  it('401 maps to an auth ProviderError', async () => {
    global.fetch = (async () => new Response('unauthorized', { status: 401 })) as typeof fetch;
    const { createOpenRouterProvider } = await import('@/lib/ai/openrouter');
    await expect(createOpenRouterProvider().generate(OPTS)).rejects.toMatchObject({ kind: 'auth', status: 502 });
  });

  it('429 maps to a retryable rate_limited ProviderError', async () => {
    global.fetch = (async () => new Response('too many requests', { status: 429 })) as typeof fetch;
    const { createOpenRouterProvider } = await import('@/lib/ai/openrouter');
    await expect(createOpenRouterProvider().generate(OPTS)).rejects.toMatchObject({
      kind: 'rate_limited',
      retryable: true,
    });
  });

  it('402 maps to a payment_required ProviderError (account/credit condition)', async () => {
    global.fetch = (async () => new Response('payment required', { status: 402 })) as typeof fetch;
    const { createOpenRouterProvider } = await import('@/lib/ai/openrouter');
    await expect(createOpenRouterProvider().generate(OPTS)).rejects.toMatchObject({ kind: 'payment_required' });
  });

  it('404 maps to a bad_request ProviderError (model not found)', async () => {
    global.fetch = (async () => new Response('not found', { status: 404 })) as typeof fetch;
    const { createOpenRouterProvider } = await import('@/lib/ai/openrouter');
    await expect(createOpenRouterProvider().generate(OPTS)).rejects.toMatchObject({ kind: 'bad_request' });
  });

  it('5xx maps to a retryable upstream ProviderError (provider unavailable)', async () => {
    global.fetch = (async () => new Response('server error', { status: 503 })) as typeof fetch;
    const { createOpenRouterProvider } = await import('@/lib/ai/openrouter');
    await expect(createOpenRouterProvider().generate(OPTS)).rejects.toMatchObject({
      kind: 'upstream',
      retryable: true,
    });
  });

  it('a 200 OK body carrying an in-band error object is still mapped, not treated as success', async () => {
    global.fetch = (async () => jsonResponse({ error: { message: 'insufficient credits', code: 402 } })) as typeof fetch;
    const { createOpenRouterProvider } = await import('@/lib/ai/openrouter');
    await expect(createOpenRouterProvider().generate(OPTS)).rejects.toMatchObject({ kind: 'payment_required' });
  });

  it('an in-stream error object aborts the stream with a mapped ProviderError', async () => {
    global.fetch = (async () =>
      sseResponse([`data: ${JSON.stringify({ error: { message: 'rate limited mid-stream', code: 429 } })}\n\n`])) as typeof fetch;
    const { createOpenRouterProvider } = await import('@/lib/ai/openrouter');
    await expect(collectStream(createOpenRouterProvider().stream!(OPTS))).rejects.toMatchObject({
      kind: 'rate_limited',
    });
  });

  it('network failure maps to a retryable network ProviderError', async () => {
    global.fetch = (async () => {
      throw new Error('getaddrinfo ENOTFOUND');
    }) as typeof fetch;
    const { createOpenRouterProvider } = await import('@/lib/ai/openrouter');
    await expect(createOpenRouterProvider().generate(OPTS)).rejects.toMatchObject({
      kind: 'network',
      retryable: true,
    });
  });

  it('a request that never resolves times out with a timeout ProviderError', async () => {
    process.env.AI_REQUEST_TIMEOUT_MS = '50';
    resetConfigCache();
    global.fetch = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      })) as typeof fetch;
    const { createOpenRouterProvider } = await import('@/lib/ai/openrouter');
    await expect(createOpenRouterProvider().generate(OPTS)).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('never sends the API key in the request URL', async () => {
    let calledUrl = '';
    global.fetch = (async (url: string) => {
      calledUrl = String(url);
      return jsonResponse({ model: 'x', choices: [{ message: { content: 'ok' }, finish_reason: 'stop' } ] });
    }) as typeof fetch;
    const { createOpenRouterProvider } = await import('@/lib/ai/openrouter');
    await createOpenRouterProvider().generate(OPTS);
    expect(calledUrl).not.toMatch(/key=/i);
    expect(calledUrl).toContain('/chat/completions');
  });

  it('sends the key only as an Authorization: Bearer header', async () => {
    let sentHeaders: HeadersInit | undefined;
    global.fetch = (async (_url: string, init?: RequestInit) => {
      sentHeaders = init?.headers;
      return jsonResponse({ model: 'x', choices: [{ message: { content: 'ok' }, finish_reason: 'stop' } ] });
    }) as typeof fetch;
    const { createOpenRouterProvider } = await import('@/lib/ai/openrouter');
    await createOpenRouterProvider().generate(OPTS);
    const headers = sentHeaders as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-key');
  });
});
