/**
 * Answer-engine tests: deterministic intent, JSON composer acceptance,
 * correction retry, advisory verifier (downgrade-only), provider probe.
 * OpenRouter is mocked throughout — CI never makes a live call.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetConfigCache } from '@/lib/config';
import { probeModelUsability, resetProviderCache } from '@/lib/ai';
import { classifyQuestion } from '@/lib/ask/intent';

const TRCA_QUESTION = 'what is my TRCA and when was the 2018 revision';

function mockChatCompletion(content: string, model = 'test-provider/test-model:free') {
  return (async () =>
    new Response(
      JSON.stringify({ model, choices: [{ message: { content }, finish_reason: 'stop' }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )) as typeof fetch;
}

describe('deterministic intent classification', () => {
  it('detects working hours, rate, TRCA, leave, deadline intents', () => {
    expect(classifyQuestion('What are the daily working hours for a GDS?').intent).toBe('WORKING_HOURS');
    expect(classifyQuestion('What is the current RD interest rate?').intent).toBe('RATE');
    expect(classifyQuestion('What are the 2018 TRCA slabs?').intent).toBe('TRCA');
    expect(classifyQuestion('Can GDS encash leave on discharge?').intent).toBe('LEAVE');
    expect(classifyQuestion('What is the RTI reply time?').intent).toBe('DEADLINE');
  });

  it('detects Tamil and individual-figure questions', () => {
    const ta = classifyQuestion('ஒரு GDS தினமும் எத்தனை மணி நேரம் வேலை செய்ய வேண்டும்?');
    expect(ta.lang).toBe('ta');
    expect(ta.intent).toBe('WORKING_HOURS');
    expect(classifyQuestion('What should my TRCA be?').asksIndividualFigure).toBe(true);
    expect(classifyQuestion('What are the TRCA slabs?').asksIndividualFigure).toBe(false);
  });

  it('detects evidence/target-pressure vs plain factual questions', () => {
    expect(classifyQuestion('Prove every message is harassment.').intent).toBe('EVIDENCE_INTERPRETATION');
    expect(classifyQuestion('Are business targets part of GDS work?').intent).toBe('TARGET_PRESSURE');
    expect(classifyQuestion('Are GDS regular Central Government employees?').intent).toBe('FACT_LOOKUP');
    expect(classifyQuestion('blorpt fnord wibble').intent).toBe('UNKNOWN');
  });
});

describe('two-stage model pipeline (mocked OpenRouter)', () => {
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

  it('accepts a supported JSON composer draft and renders claims + qualifications', async () => {
    const draft = JSON.stringify({
      directAnswer: 'TRCA was revised in 2018 [S1].',
      claims: [{ text: 'TRCA was revised in 2018 [S1].', citationRefs: ['S1'] }],
      qualifications: ['Check the 2018 order for the current figure.'],
    });
    global.fetch = mockChatCompletion(draft);
    const { ask } = await import('@/lib/ask/answer');
    const r = await ask(TRCA_QUESTION);
    expect(r.mode).toBe('model');
    expect(r.answer).toContain('TRCA was revised in 2018 [S1]');
    expect(r.answer).toContain('Check the 2018 order for the current figure.');
    expect(r.claims).toHaveLength(1);
    expect(r.claims[0]?.support).toBe('DIRECT');
    expect(r.uncitedClaimWarnings).toHaveLength(0);
  });

  it('correction retry then removal: unsupported claim is cut, recorded, and caps classification', async () => {
    let calls = 0;
    global.fetch = (async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          model: 'x',
          choices: [{
            message: { content: 'TRCA was revised in 2018 [S1]. GDS must also complete forty hours of unpaid overtime every week.' },
            finish_reason: 'stop',
          }],
        }),
        { status: 200 },
      );
    }) as typeof fetch;
    const { ask } = await import('@/lib/ask/answer');
    const r = await ask(TRCA_QUESTION);
    // composer + 1 correction retry + advisory verifier (abstains on prose).
    expect(calls).toBe(3);
    expect(r.mode).toBe('model');
    expect(r.answer).toContain('TRCA was revised in 2018 [S1]');
    expect(r.answer).not.toMatch(/unpaid overtime/);
    expect(r.uncitedClaimWarnings.join(' ')).toMatch(/unpaid overtime/);
    expect(r.classification).toBe('UNVERIFIED');
  });

  it('advisory verifier dissent demotes DIRECT to INFERENCE (never upgrades, never removes)', async () => {
    const question = 'What are the daily working hours for a GDS?';
    const draft = JSON.stringify({
      directAnswer: 'Rule 3-A caps GDS duty at 5 hours a day [S1]. Working-hour slabs are 4 hours and 5 hours [S2].',
      claims: [
        { text: 'Rule 3-A caps GDS duty at 5 hours a day [S1].', citationRefs: ['S1'] },
        { text: 'Working-hour slabs are 4 hours and 5 hours [S2].', citationRefs: ['S2'] },
      ],
      qualifications: [],
    });
    const verdict = JSON.stringify({
      verdicts: [
        { supported: false, reason: 'cap wording questioned', unsupportedFragments: [] },
        { supported: true, reason: 'entailed', unsupportedFragments: [] },
      ],
    });
    let calls = 0;
    global.fetch = (async () => {
      calls += 1;
      const content = calls === 1 ? draft : verdict;
      return new Response(
        JSON.stringify({ model: 'x', choices: [{ message: { content }, finish_reason: 'stop' }] }),
        { status: 200 },
      );
    }) as typeof fetch;
    const { ask } = await import('@/lib/ask/answer');
    const r = await ask(question);
    expect(calls).toBe(2); // composer + verifier, no correction needed
    expect(r.mode).toBe('model');
    expect(r.claims[0]?.support).toBe('INFERENCE');
    expect(r.claims[1]?.support).toBe('DIRECT');
    // Demoted claim stays visible (downgrade, not removal); overall INFERENCE.
    expect(r.answer).toContain('Rule 3-A caps GDS duty at 5 hours a day [S1]');
    expect(r.classification).toBe('INFERENCE');
  });

  it('a verifier that returns garbage abstains silently (deterministic gate stands)', async () => {
    let calls = 0;
    global.fetch = (async () => {
      calls += 1;
      const content =
        calls === 1
          ? JSON.stringify({
              directAnswer: 'TRCA was revised in 2018 [S1].',
              claims: [{ text: 'TRCA was revised in 2018 [S1].', citationRefs: ['S1'] }],
              qualifications: [],
            })
          : 'not json at all';
      return new Response(
        JSON.stringify({ model: 'x', choices: [{ message: { content }, finish_reason: 'stop' }] }),
        { status: 200 },
      );
    }) as typeof fetch;
    const { ask } = await import('@/lib/ask/answer');
    const r = await ask(TRCA_QUESTION);
    expect(calls).toBe(2);
    expect(r.claims[0]?.support).toBe('DIRECT');
    expect(r.answer).toContain('TRCA was revised in 2018 [S1]');
  });
});

describe('provider usability probe', () => {
  it('reports usable when the model returns JSON with a citation', async () => {
    const r = await probeModelUsability({
      name: 'openrouter',
      model: 'stub/model',
      configured: true,
      generate: async () => ({ text: '{"probe": "ok"} [S1]', provider: 'openrouter', model: 'stub/model', finishReason: 'stop' }),
      health: async () => ({ ok: true, detail: 'ok' }),
    });
    expect(r.usable).toBe(true);
    expect(r.model).toBe('stub/model');
  });

  it('reports unusable on garbage output, errors, or no configuration', async () => {
    const garbage = await probeModelUsability({
      name: 'openrouter',
      model: 'stub/model',
      configured: true,
      generate: async () => ({ text: 'User Safety: safe', provider: 'openrouter', model: 'stub/model', finishReason: 'stop' }),
      health: async () => ({ ok: true, detail: 'ok' }),
    });
    expect(garbage.usable).toBe(false);

    const failing = await probeModelUsability({
      name: 'openrouter',
      model: 'stub/model',
      configured: true,
      generate: async () => { throw new Error('nope'); },
      health: async () => ({ ok: false, detail: 'x' }),
    });
    expect(failing.usable).toBe(false);

    const demo = await probeModelUsability({
      name: 'demo',
      model: 'demo-extractive',
      configured: true,
      generate: async () => ({ text: 'x', provider: 'demo', model: 'demo-extractive', finishReason: 'stop' }),
      health: async () => ({ ok: true, detail: 'ok' }),
    });
    expect(demo.usable).toBe(false);
    expect(demo.detail).toMatch(/source-only/);

    const none = await probeModelUsability(null);
    expect(none.usable).toBe(false);
  });
});
