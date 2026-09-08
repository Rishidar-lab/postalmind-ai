import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetConfigCache } from '@/lib/config';
import { resetProviderCache } from '@/lib/ai';

/**
 * End-to-end `ask()` pipeline with OpenRouter as the configured provider.
 * global.fetch is mocked throughout — CI never makes a live OpenRouter call.
 *
 * These pin the contract from the mission: retrieval happens first and is
 * unaffected by which model provider is configured; OpenRouter only composes
 * from passages it is handed; a provider failure degrades to source-only
 * mode with a plain-language message (never a raw error kind); and a model
 * response is still checked for fabricated or uncited claims after the fact.
 */

const TRCA_QUESTION = 'what is my TRCA and when was the 2018 revision';

function mockChatCompletion(content: string, model = 'test-provider/test-model:free') {
  return (async () =>
    new Response(
      JSON.stringify({ model, choices: [{ message: { content }, finish_reason: 'stop' }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )) as typeof fetch;
}

describe('ask() with OpenRouter configured', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    resetConfigCache();
    resetProviderCache();
  });

  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.OPENROUTER_API_KEY;
    resetConfigCache();
    resetProviderCache();
  });

  it('retrieves sources and composes a cited answer, recording the actual OpenRouter-selected model', async () => {
    global.fetch = mockChatCompletion('TRCA was revised in 2018 [S1].', 'meta-llama/llama-3.1-8b-instruct:free');
    const { ask } = await import('@/lib/ask/answer');
    const r = await ask(TRCA_QUESTION);
    expect(r.mode).toBe('model');
    expect(r.model).toBe('meta-llama/llama-3.1-8b-instruct:free');
    expect(r.citations.length).toBeGreaterThan(0);
    expect(r.answer).toContain('[S1]');
  });

  it('sends OpenRouter only the question + retrieved source passages — no evidence/vault payload', async () => {
    let sentBody: { messages?: Array<{ role: string; content: string }> } = {};
    global.fetch = (async (_url: string, init?: RequestInit) => {
      sentBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({ model: 'x', choices: [{ message: { content: 'TRCA info [S1].' }, finish_reason: 'stop' }] }),
        { status: 200 },
      );
    }) as typeof fetch;
    const { ask } = await import('@/lib/ask/answer');
    await ask(TRCA_QUESTION);

    expect(sentBody.messages).toBeDefined();
    expect(sentBody.messages!.some((m) => m.role === 'system')).toBe(true);
    expect(sentBody.messages!.some((m) => m.role === 'user' && m.content === TRCA_QUESTION)).toBe(true);
    const blob = JSON.stringify(sentBody);
    expect(blob).not.toMatch(/whatsapp|EvidenceItem|vault|redactionMap|caseVault|Aadhaar/i);
  });

  it('a caller cannot smuggle private evidence text past the ask() boundary into the OpenRouter request', async () => {
    let sentBody = '';
    global.fetch = (async (_url: string, init?: RequestInit) => {
      sentBody = String(init?.body);
      return new Response(
        JSON.stringify({ model: 'x', choices: [{ message: { content: 'TRCA info [S1].' }, finish_reason: 'stop' }] }),
        { status: 200 },
      );
    }) as typeof fetch;
    const { ask } = await import('@/lib/ask/answer');
    // history is the only caller-controlled channel into the provider turns;
    // ask() must never construct an evidence-shaped field regardless of what
    // a caller puts there.
    await ask(TRCA_QUESTION, {
      history: [{ role: 'user', content: 'WhatsApp export: 9876543210 Ramesh Kumar — Aadhaar 1234 5678 9012.' }],
    });
    expect(sentBody).not.toMatch(/EvidenceItem|redactionMap|caseVault/i);
  });

  it('falls back to source-only mode with a plain-language message when OpenRouter errors — never the raw kind', async () => {
    global.fetch = (async () => new Response('bad request', { status: 400 })) as typeof fetch;
    const { ask } = await import('@/lib/ask/answer');
    const r = await ask(TRCA_QUESTION);
    expect(r.mode).toBe('extractive');
    expect(r.answer).toMatch(/AI composition is temporarily unavailable/i);
    expect(r.answer).not.toMatch(/bad_request/i);
    // The retrieved passages are still rendered directly — source-only fallback stays usable.
    expect(r.citations.length).toBeGreaterThan(0);
  });

  it('falls back to source-only mode on a 5xx / provider-unavailable condition too', async () => {
    global.fetch = (async () => new Response('down', { status: 503 })) as typeof fetch;
    const { ask } = await import('@/lib/ask/answer');
    const r = await ask(TRCA_QUESTION);
    expect(r.mode).toBe('extractive');
    expect(r.citations.length).toBeGreaterThan(0);
  });

  it('an out-of-corpus question never reaches the model at all — zero retrieval short-circuits before any provider call', async () => {
    let called = false;
    global.fetch = (async () => {
      called = true;
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
    const { ask } = await import('@/lib/ask/answer');
    const r = await ask('what is the capital of France');
    expect(r.classification).toBe('UNKNOWN');
    expect(r.citations).toHaveLength(0);
    expect(called).toBe(false);
  });

  it('an adversarial in-corpus false premise is never affirmed by a configured model', async () => {
    // The corpus has no such rule; the model is instructed to refuse rather than
    // invent one, and the pipeline must not fabricate a rule/circular number
    // even though the refusal text may legitimately restate the disputed premise.
    global.fetch = mockChatCompletion(
      'The provided sources do not establish that requirement for every GDS. I cannot confirm it.',
    );
    const { ask } = await import('@/lib/ask/answer');
    const r = await ask('Which rule says every GDS must achieve ₹5 lakh PLI?');
    expect(['UNKNOWN', 'UNVERIFIED']).toContain(r.classification);
    expect(r.answer).not.toMatch(/^yes,?\s+(every|all)/i);
    const blob = `${r.answer} ${r.citations.map((c) => c.title).join(' ')}`;
    expect(blob).not.toMatch(/rule\s+no\.?\s*\d+/i);
    expect(blob).not.toMatch(/circular\s+no\.?\s*\d+/i);
  });

  it('a fabricated citation ([Sn] the retrieval never returned) is caught and downgrades the classification', async () => {
    global.fetch = mockChatCompletion('TRCA was revised in 2018 [S1], confirmed again by circular [S9].');
    const { ask } = await import('@/lib/ask/answer');
    const r = await ask(TRCA_QUESTION);
    const validRefs = new Set(r.citations.map((c) => c.ref));
    expect(validRefs.has('S9')).toBe(false);
    expect(r.uncitedClaimWarnings.some((w) => w.includes('[S9]'))).toBe(true);
    expect(r.classification).not.toBe('VERIFIED');
    expect(r.classification).not.toBe('INFERENCE');
  });

  it('a model answer with an uncited factual sentence is flagged, not silently trusted', async () => {
    global.fetch = mockChatCompletion(
      'TRCA was revised in 2018 [S1]. GDS must also complete forty hours of unpaid overtime every week.',
    );
    const { ask } = await import('@/lib/ask/answer');
    const r = await ask(TRCA_QUESTION);
    expect(r.uncitedClaimWarnings.length).toBeGreaterThan(0);
    expect(r.uncitedClaimWarnings.join(' ')).toMatch(/unpaid overtime/);
    expect(r.classification).not.toBe('VERIFIED');
  });

  it('a refusal-shaped model response is classified UNKNOWN rather than kept as a weak answer', async () => {
    global.fetch = mockChatCompletion('I cannot find enough information in the provided sources to answer this.');
    const { ask } = await import('@/lib/ask/answer');
    const r = await ask(TRCA_QUESTION);
    expect(r.classification).toBe('UNKNOWN');
  });

  it('every result exposes a rationale (WHY THIS ANSWER) and non-empty limits (WHAT THIS DOES NOT ESTABLISH)', async () => {
    global.fetch = mockChatCompletion('TRCA was revised in 2018 [S1].');
    const { ask } = await import('@/lib/ask/answer');
    const r = await ask(TRCA_QUESTION);
    expect(r.rationale.length).toBeGreaterThan(0);
    expect(r.rationale).toMatch(/retrieved/i);
    expect(r.limits.length).toBeGreaterThan(0);
  });

  describe('model-quality gate — openrouter/free can select a model unsuited to grounded QA', () => {
    afterEach(() => {
      delete process.env.OPENROUTER_MODEL_FALLBACK;
      resetConfigCache();
      resetProviderCache();
    });

    it('a degenerate non-answer (e.g. a bare safety-classifier label) is rejected and degrades to source-only when no fallback is configured', async () => {
      global.fetch = mockChatCompletion('User Safety: safe', 'nvidia/nemotron-3.5-content-safety:free');
      const { ask } = await import('@/lib/ask/answer');
      const r = await ask(TRCA_QUESTION);
      expect(r.mode).toBe('extractive');
      expect(r.answer).toMatch(/AI composition is temporarily unavailable/i);
      expect(r.answer).not.toMatch(/User Safety/i);
      expect(r.citations.length).toBeGreaterThan(0);
    });

    it('retries once with OPENROUTER_MODEL_FALLBACK and uses that response when it is usable', async () => {
      process.env.OPENROUTER_MODEL_FALLBACK = 'good-provider/good-model:free';
      resetConfigCache();
      resetProviderCache();
      let call = 0;
      global.fetch = (async () => {
        call += 1;
        if (call === 1) {
          return new Response(
            JSON.stringify({ model: 'nvidia/nemotron-3.5-content-safety:free', choices: [{ message: { content: 'User Safety: safe' }, finish_reason: 'stop' }] }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({ model: 'good-provider/good-model:free', choices: [{ message: { content: 'TRCA was revised in 2018 [S1].' }, finish_reason: 'stop' }] }),
          { status: 200 },
        );
      }) as typeof fetch;
      const { ask } = await import('@/lib/ask/answer');
      const r = await ask(TRCA_QUESTION);
      expect(call).toBe(2);
      expect(r.mode).toBe('model');
      expect(r.model).toBe('good-provider/good-model:free');
      expect(r.answer).toContain('[S1]');
    });

    it('degrades to source-only if the fallback model ALSO returns a degenerate response', async () => {
      process.env.OPENROUTER_MODEL_FALLBACK = 'also-bad/model:free';
      resetConfigCache();
      resetProviderCache();
      global.fetch = mockChatCompletion('User Safety: safe', 'always-bad:free');
      const { ask } = await import('@/lib/ask/answer');
      const r = await ask(TRCA_QUESTION);
      expect(r.mode).toBe('extractive');
      expect(r.answer).toMatch(/AI composition is temporarily unavailable/i);
      expect(r.citations.length).toBeGreaterThan(0);
    });

    it('a real, substantive answer is never rejected by the quality gate even without a bracket citation on every sentence', async () => {
      // Long enough and not a refusal — must pass through untouched, proving the
      // gate doesn't over-fire on ordinary model prose.
      global.fetch = mockChatCompletion(
        'TRCA was revised in 2018 [S1]. This restructured the allowance into two levels linked to dearness allowance, with arrears paid for the intervening period between the recommendation and implementation dates.',
      );
      const { ask } = await import('@/lib/ask/answer');
      const r = await ask(TRCA_QUESTION);
      expect(r.mode).toBe('model');
      expect(r.answer).toContain('[S1]');
    });
  });
});
