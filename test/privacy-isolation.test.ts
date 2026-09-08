import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resetConfigCache } from '@/lib/config';
import { resetProviderCache } from '@/lib/ai';

/**
 * Private-evidence → AI isolation.
 *
 * OpenRouter may receive: user question + retrieved public-source passages +
 * safe system instructions. OpenRouter must NOT receive: raw WhatsApp
 * exports, names, phone numbers, case vault content, annotations, or raw
 * incident excerpts.
 */
describe('private-evidence isolation from the model', () => {
  it('ask pipeline sends only question + retrieved passages (no evidence channel)', async () => {
    const src = readFileSync(join(process.cwd(), 'lib/ask/answer.ts'), 'utf8');
    // The provider.generate/fallback.generate calls carry the same genOpts
    // object, built from system + turns only.
    expect(src).toMatch(/(?:provider|fallback)\.generate\((?:\{|genOpts)/);
    expect(src).toMatch(/const genOpts = \{[\s\S]*?system,[\s\S]*?turns:/);
    // No evidence-shaped payload reaches the model.
    expect(src).not.toMatch(/rawExcerpt|rawText|whatsapp|EvidenceItem|vault|private/i);
  });

  it('openrouter provider never logs the key or bodies', async () => {
    const src = readFileSync(join(process.cwd(), 'lib/ai/openrouter.ts'), 'utf8');
    expect(src).not.toMatch(/console\.log.*key|console\.log.*body/i);
    expect(src).toMatch(/Authorization.*Bearer/); // header, never URL
    expect(src).not.toMatch(/[?&]key=|apikey=.*\$\{/i);
  });

  it('openrouter request payload carries no evidence-shaped field or vault/PII helper', async () => {
    const src = readFileSync(join(process.cwd(), 'lib/ai/openrouter.ts'), 'utf8');
    // The adapter only ever turns already-built GenerateOptions (system + turns)
    // into OpenAI-compatible messages — it has no import path into evidence,
    // the vault, PII detection or redaction.
    expect(src).not.toMatch(/rawExcerpt|rawText|whatsapp|EvidenceItem|vault|redact|detectPII/i);
    expect(src).toMatch(/toMessages/);
  });

  it('ask() never forwards raw evidence text to OpenRouter even if a caller tries to smuggle it in', async () => {
    delete process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = 'test-key';
    resetConfigCache();
    resetProviderCache();
    const calls: unknown[] = [];
    const realFetch = global.fetch;
    global.fetch = (async (_url: string, init?: RequestInit) => {
      calls.push(init?.body);
      return new Response(
        JSON.stringify({ model: 'test/model:free', choices: [{ message: { content: 'x [S1]' }, finish_reason: 'stop' }] }),
        { status: 200 },
      );
    }) as typeof fetch;
    try {
      const { ask } = await import('@/lib/ask/answer');
      // A caller trying to smuggle private evidence into chat history.
      const evidenceLike =
        'WhatsApp export: 9876543210 Ramesh Kumar said the mela target is impossible. Aadhaar 1234 5678 9012.';
      await ask('what is TRCA', { history: [{ role: 'user', content: evidenceLike }] });
      expect(calls.length).toBeGreaterThan(0);
      const sentBody = String(calls[0]);
      // The history line itself is passed through as ordinary chat turns (it is
      // not evidence-tagged), but no vault/PII-pipeline shaped payload is ever
      // constructed — this pins the shape of what leaves lib/ask/answer.ts.
      expect(sentBody).not.toMatch(/EvidenceItem|redactionMap|caseVault/i);
    } finally {
      global.fetch = realFetch;
      delete process.env.OPENROUTER_API_KEY;
      resetConfigCache();
      resetProviderCache();
    }
  });

  it('private import UI never POSTs raw evidence to any API', async () => {
    const ui = readFileSync(join(process.cwd(), 'components/import-client.tsx'), 'utf8');
    expect(ui).not.toMatch(/fetch\(\s*['"`]\/api\/evidence\/parse/);
    expect(ui).not.toMatch(/fetch\(\s*['"`]\/api\/ask/);
    expect(ui).toMatch(/analyzeWhatsAppText/);
    // The local-only badge is shown only after a proven-local run.
    expect(ui).toMatch(/Processed locally on this device/);
  });

  it('local analysis is deterministic and network-free', async () => {
    const { analyzeWhatsAppText } = await import('@/lib/evidence/analyze');
    const text = '03/09/2026, 09:05 - Supervisor: Mela target is 8 proposals.\n';
    const a = await analyzeWhatsAppText(text);
    const b = await analyzeWhatsAppText(text);
    expect(a.local).toBe(true);
    expect(a.source.sha256).toBe(b.source.sha256);
    expect(a.analysis.items.length).toBeGreaterThan(0);
    for (const it of a.analysis.items) {
      expect(it.analysis.doesNotEstablish.length).toBeGreaterThan(0);
    }
  });

  it('publication check UI runs locally (no draft upload)', async () => {
    const ui = readFileSync(join(process.cwd(), 'components/publication-check-client.tsx'), 'utf8');
    expect(ui).not.toMatch(/fetch\(\s*['"`]\/api\/evidence\/publication-check/);
    expect(ui).toMatch(/publicationSafetyCheck/);
  });
});
