/**
 * OpenRouter provider (OpenAI-compatible chat-completions API).
 *
 * This is a writing/reasoning layer only — it never decides what is true.
 * `lib/ask/answer.ts` retrieves and selects passages first; this module only
 * turns already-selected passages into prose, constrained by the system
 * prompt built there. It receives no case records, no personal data.
 *
 * Hardening:
 *  - model is fully configurable (OPENROUTER_MODEL), default "openrouter/free"
 *    so the router — not this code — picks among currently-available free
 *    models; an explicit "provider/model:free" variant works without a code
 *    change
 *  - API key sent as an `Authorization: Bearer` header, never in the URL
 *  - per-request timeout via AbortController
 *  - bounded retry only for idempotent transient failures (429/5xx/network)
 *  - typed errors (ProviderError) mapped to sane client-facing statuses,
 *    including OpenRouter's 402 (account/credit condition) and errors that
 *    arrive in a 200 OK body instead of an HTTP error status
 *  - never logs the key or full request/response bodies
 */

import { getConfig } from '@/lib/config';
import {
  type GenerateOptions,
  type GenerateResult,
  type Provider,
  ProviderError,
} from './types';

interface ORMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ORBodyError {
  message?: string;
  code?: number | string;
}

function toMessages(opts: GenerateOptions): ORMessage[] {
  return [
    { role: 'system', content: opts.system },
    ...opts.turns.map((t) => ({ role: t.role, content: t.content })),
  ];
}

function keyHeader(): Record<string, string> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new ProviderError('not_configured', 'AI provider is not configured.', 503);
  return { Authorization: `Bearer ${key}` };
}

async function callOpenRouter(
  path: string,
  body: unknown,
  signal: AbortSignal | undefined,
): Promise<Response> {
  const { ai } = getConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), ai.requestTimeoutMs);
  // Chain the caller's signal.
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  try {
    return await fetch(`${ai.baseUrl}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...keyHeader(),
        // Optional attribution headers OpenRouter documents for free-tier
        // routing/analytics. Never carry the key.
        ...(ai.siteUrl ? { 'HTTP-Referer': ai.siteUrl } : {}),
        'X-Title': ai.appName,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new ProviderError('timeout', 'The AI provider did not respond in time.', 504, true);
    }
    throw new ProviderError('network', 'Could not reach the AI provider.', 502, true);
  } finally {
    clearTimeout(timer);
  }
}

function mapHttpError(status: number, bodyText: string): ProviderError {
  // bodyText is already truncated by the caller and never logged with the key.
  void bodyText;
  if (status === 400) return new ProviderError('bad_request', 'The AI provider rejected the request.', 502);
  if (status === 401 || status === 403)
    return new ProviderError('auth', 'The AI provider rejected the API key.', 502);
  if (status === 402)
    return new ProviderError(
      'payment_required',
      'The AI provider reported an account/credit condition.',
      502,
    );
  if (status === 404)
    return new ProviderError(
      'bad_request',
      'The configured OpenRouter model was not found. Check OPENROUTER_MODEL.',
      502,
    );
  if (status === 429) return new ProviderError('rate_limited', 'The AI provider is rate-limiting requests.', 429, true);
  if (status >= 500) return new ProviderError('upstream', 'The AI provider had an internal error.', 502, true);
  return new ProviderError('upstream', `AI provider returned HTTP ${status}.`, 502, status >= 500);
}

/** OpenRouter (and the free models behind it) sometimes return HTTP 200 with
 * an `error` field in the body instead of a non-2xx status. Map it the same
 * way as a real HTTP error when it carries a numeric status-like code. */
function mapBodyError(err: ORBodyError | undefined): ProviderError {
  const code = typeof err?.code === 'number' ? err.code : Number(err?.code);
  if (Number.isFinite(code) && code >= 400) return mapHttpError(code, err?.message ?? '');
  return new ProviderError('upstream', 'The AI provider reported an error.', 502, true);
}

function extractText(data: unknown): { text: string; finishReason: string | null; model: string | null } {
  const d = data as {
    choices?: Array<{ message?: { content?: string | null }; finish_reason?: string }>;
    model?: string;
  };
  const choice = d.choices?.[0];
  const text = choice?.message?.content ?? '';
  if (!text.trim()) {
    throw new ProviderError('empty', 'The AI provider returned an empty response.', 502, true);
  }
  return { text, finishReason: choice?.finish_reason ?? null, model: d.model ?? null };
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = err instanceof ProviderError && err.retryable;
      if (!retryable || attempt === maxRetries) break;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1) + Math.random() * 200));
    }
  }
  throw lastErr;
}

/**
 * @param modelOverride When set, this provider instance uses this model
 * instead of the configured primary — used to construct the fallback
 * provider for the model-quality gate (lib/ask/answer.ts) without
 * duplicating this whole module.
 */
export function createOpenRouterProvider(modelOverride?: string): Provider {
  const { ai: baseAi } = getConfig();
  const ai = modelOverride ? { ...baseAi, model: modelOverride } : baseAi;

  const generate = async (opts: GenerateOptions): Promise<GenerateResult> => {
    if (!ai.configured) throw new ProviderError('not_configured', 'AI provider is not configured.', 503);
    const body = {
      model: ai.model,
      messages: toMessages(opts),
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxOutputTokens ?? 1536,
      stream: false,
    };

    return withRetry(async () => {
      const res = await callOpenRouter('chat/completions', body, opts.signal);
      if (!res.ok) {
        const t = (await res.text().catch(() => '')).slice(0, 500);
        throw mapHttpError(res.status, t);
      }
      const data = await res.json().catch(() => {
        throw new ProviderError('upstream', 'The AI provider returned invalid JSON.', 502, true);
      });
      const bodyErr = (data as { error?: ORBodyError }).error;
      if (bodyErr) throw mapBodyError(bodyErr);

      const { text, finishReason, model } = extractText(data);
      const usage = (data as { usage?: { prompt_tokens?: number; completion_tokens?: number } }).usage;
      return {
        text,
        provider: 'openrouter',
        // The actual model OpenRouter selected, not just the configured request — this
        // is what the UI shows as "Composed with: <model> via OpenRouter".
        model: model || ai.model,
        finishReason,
        usage: usage
          ? { inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens }
          : undefined,
      };
    }, ai.maxRetries);
  };

  async function* stream(opts: GenerateOptions): AsyncGenerator<string, void, unknown> {
    if (!ai.configured) throw new ProviderError('not_configured', 'AI provider is not configured.', 503);
    const body = {
      model: ai.model,
      messages: toMessages(opts),
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxOutputTokens ?? 1536,
      stream: true,
    };
    const res = await callOpenRouter('chat/completions', body, opts.signal);
    if (!res.ok || !res.body) {
      const t = (await res.text().catch(() => '')).slice(0, 500);
      throw mapHttpError(res.status || 502, t);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let emitted = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        // Skips blank lines and OpenRouter's ": OPENROUTER PROCESSING" keep-alive comments.
        if (!trimmed.startsWith('data:')) continue;
        const json = trimmed.slice(5).trim();
        if (!json || json === '[DONE]') continue;
        let chunk: unknown;
        try {
          chunk = JSON.parse(json);
        } catch {
          continue; // ignore partial/malformed JSON lines rather than crashing the page
        }
        const c = chunk as { error?: ORBodyError; choices?: Array<{ delta?: { content?: string } }> };
        if (c.error) throw mapBodyError(c.error);
        const delta = c.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          emitted = true;
          yield delta;
        }
      }
    }
    if (!emitted) throw new ProviderError('empty', 'The AI provider streamed no content.', 502, true);
  }

  const health = async (): Promise<{ ok: boolean; detail: string }> => {
    if (!ai.configured) return { ok: false, detail: 'OPENROUTER_API_KEY not set' };
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      // /auth/key validates the key without spending model credits.
      const res = await fetch(`${ai.baseUrl}/auth/key`, {
        headers: keyHeader(),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
      if (res.ok) return { ok: true, detail: `key valid; model ${ai.model}` };
      if (res.status === 401 || res.status === 403) return { ok: false, detail: 'API key rejected' };
      return { ok: false, detail: `provider HTTP ${res.status}` };
    } catch {
      return { ok: false, detail: 'provider unreachable' };
    }
  };

  return { name: 'openrouter', model: ai.model, configured: ai.configured, generate, stream, health };
}
