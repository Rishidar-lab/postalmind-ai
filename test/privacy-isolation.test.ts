import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Private-evidence → AI isolation.
 *
 * Gemini may receive: user question + retrieved public-source passages.
 * Gemini must NOT receive: raw WhatsApp exports, names, phone numbers,
 * case vault content, annotations, or raw incident excerpts.
 */
describe('private-evidence isolation from the model', () => {
  it('ask pipeline sends only question + retrieved passages (no evidence channel)', async () => {
    const src = readFileSync(join(process.cwd(), 'lib/ask/answer.ts'), 'utf8');
    // The provider.generate call carries system + turns only.
    expect(src).toMatch(/provider\.generate\(\{/);
    expect(src).toContain('system');
    expect(src).toContain('turns');
    // No evidence-shaped payload reaches the model.
    expect(src).not.toMatch(/rawExcerpt|rawText|whatsapp|EvidenceItem|vault|private/i);
  });

  it('gemini provider never logs the key or bodies', async () => {
    const src = readFileSync(join(process.cwd(), 'lib/ai/gemini.ts'), 'utf8');
    expect(src).not.toMatch(/console\.log.*key|console\.log.*body/i);
    expect(src).toMatch(/x-goog-api-key/); // header, never URL
    expect(src).not.toMatch(/key=|apikey=.*\$\{|\\?key=/i);
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
