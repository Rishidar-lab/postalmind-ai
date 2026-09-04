/**
 * Google Gemini provider (generativelanguage API).
 *
 * Hardening vs. the original implementation:
 *  - model is configurable (GEMINI_MODEL), default kept current
 *  - API key sent as the `x-goog-api-key` header, never in the URL
 *  - per-request timeout via AbortController
 *  - bounded retry only for idempotent transient failures (429/5xx/network)
 *  - typed errors (ProviderError) mapped to sane client-facing statuses
 *  - never logs the key or full request/response bodies
 */

import { getConfig } from '@/lib/config';
import {
  type GenerateOptions,
  type GenerateResult,
  type Provider,
  ProviderError,
} from './types';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

function toContents(opts: GenerateOptions): GeminiContent[] {
  return opts.turns.map((t) => ({
    role: t.role === 'user' ? 'user' : 'model',
    parts: [{ text: t.content }],
  }));
}

function keyHeader(): Record<string, string> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new ProviderError('not_configured', 'AI provider is not configured.', 503);
  return { 'x-goog-api-key': key };
}

async function callGemini(
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
      headers: { 'Content-Type': 'application/json', ...keyHeader() },
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
  if (status === 400) return new ProviderError('bad_request', 'The AI provider rejected the request.', 502);
  if (status === 401 || status === 403)
    return new ProviderError('auth', 'The AI provider rejected the API key.', 502);
  if (status === 404)
    return new ProviderError(
      'bad_request',
      'The configured Gemini model was not found. Check GEMINI_MODEL.',
      502,
    );
  if (status === 429) return new ProviderError('rate_limited', 'The AI provider is rate-limiting requests.', 429, true);
  if (status >= 500) return new ProviderError('upstream', 'The AI provider had an internal error.', 502, true);
  return new ProviderError('upstream', `AI provider returned HTTP ${status}.`, 502, status >= 500);
}

function extractText(data: unknown): { text: string; finishReason: string | null } {
  const d = data as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
  };
  if (d.promptFeedback?.blockReason) {
    throw new ProviderError('blocked', `The request was blocked by the provider (${d.promptFeedback.blockReason}).`, 502);
  }
  const cand = d.candidates?.[0];
  const text = (cand?.content?.parts ?? []).map((p) => p.text ?? '').join('');
  if (!text.trim()) {
    throw new ProviderError('empty', 'The AI provider returned an empty response.', 502, true);
  }
  return { text, finishReason: cand?.finishReason ?? null };
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

export function createGeminiProvider(): Provider {
  const { ai } = getConfig();

  const generate = async (opts: GenerateOptions): Promise<GenerateResult> => {
    if (!ai.configured) throw new ProviderError('not_configured', 'AI provider is not configured.', 503);
    const body = {
      contents: toContents(opts),
      systemInstruction: { parts: [{ text: opts.system }] },
      generationConfig: {
        temperature: opts.temperature ?? 0.2,
        maxOutputTokens: opts.maxOutputTokens ?? 1536,
      },
      safetySettings: [],
    };

    return withRetry(async () => {
      const res = await callGemini(
        `models/${encodeURIComponent(ai.model)}:generateContent`,
        body,
        opts.signal,
      );
      if (!res.ok) {
        const t = (await res.text().catch(() => '')).slice(0, 500);
        throw mapHttpError(res.status, t);
      }
      const data = await res.json().catch(() => {
        throw new ProviderError('upstream', 'The AI provider returned invalid JSON.', 502, true);
      });
      const { text, finishReason } = extractText(data);
      const usage = (data as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } })
        .usageMetadata;
      return {
        text,
        provider: 'gemini',
        model: ai.model,
        finishReason,
        usage: usage
          ? { inputTokens: usage.promptTokenCount, outputTokens: usage.candidatesTokenCount }
          : undefined,
      };
    }, ai.maxRetries);
  };

  async function* stream(opts: GenerateOptions): AsyncGenerator<string, void, unknown> {
    if (!ai.configured) throw new ProviderError('not_configured', 'AI provider is not configured.', 503);
    const body = {
      contents: toContents(opts),
      systemInstruction: { parts: [{ text: opts.system }] },
      generationConfig: {
        temperature: opts.temperature ?? 0.2,
        maxOutputTokens: opts.maxOutputTokens ?? 1536,
      },
    };
    const res = await callGemini(
      `models/${encodeURIComponent(ai.model)}:streamGenerateContent?alt=sse`,
      body,
      opts.signal,
    );
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
        if (!trimmed.startsWith('data:')) continue;
        const json = trimmed.slice(5).trim();
        if (!json || json === '[DONE]') continue;
        try {
          const chunk = JSON.parse(json);
          const delta: string =
            chunk?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
          if (delta) {
            emitted = true;
            yield delta;
          }
        } catch {
          // ignore partial JSON lines
        }
      }
    }
    if (!emitted) throw new ProviderError('empty', 'The AI provider streamed no content.', 502, true);
  }

  const health = async (): Promise<{ ok: boolean; detail: string }> => {
    if (!ai.configured) return { ok: false, detail: 'GEMINI_API_KEY not set' };
    try {
      const { baseUrl } = ai;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${baseUrl}/models/${encodeURIComponent(ai.model)}`, {
        headers: keyHeader(),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
      if (res.ok) return { ok: true, detail: `model ${ai.model} reachable` };
      if (res.status === 404) return { ok: false, detail: `model ${ai.model} not found` };
      if (res.status === 401 || res.status === 403) return { ok: false, detail: 'API key rejected' };
      return { ok: false, detail: `provider HTTP ${res.status}` };
    } catch {
      return { ok: false, detail: 'provider unreachable' };
    }
  };

  return { name: 'gemini', model: ai.model, configured: ai.configured, generate, stream, health };
}
