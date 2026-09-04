import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetConfigCache } from '@/lib/config';
import { resetProviderCache } from '@/lib/ai';

/**
 * P6 regression: with the current pointer-only corpus (no VERIFIED passage
 * with a recorded primary-document mirror), NO answer may be classified
 * VERIFIED. An UNVERIFIED source can never silently become a VERIFIED answer.
 */
describe('source trust: UNVERIFIED can never become VERIFIED', () => {
  beforeEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    resetConfigCache();
    resetProviderCache();
  });
  afterEach(() => {
    resetConfigCache();
    resetProviderCache();
  });

  const IN_SCOPE = [
    'What is the TRCA revision of 2018?',
    'How many days does the PIO have to reply to an RTI application?',
    'What are the working hours norms for GDS?',
    'What leave are GDS entitled to?',
    'What is the disciplinary framework under the GDS Conduct and Engagement Rules 2020?',
    'Are business targets part of GDS work?',
    'What is the current RD interest rate?',
  ];

  for (const q of IN_SCOPE) {
    it(`never VERIFIED for: ${q.slice(0, 50)}…`, async () => {
      const { ask } = await import('@/lib/ask/answer');
      const r = await ask(q);
      expect(r.classification).not.toBe('VERIFIED');
      // Every cited passage must carry its honest status.
      for (const c of r.citations) {
        expect(['VERIFIED', 'UNVERIFIED', 'DEMO']).toContain(c.status);
      }
      // Pointers must be labelled as pointers.
      if (r.citations.some((c) => c.status !== 'VERIFIED')) {
        expect(r.notice).toMatch(/verify|check|pointer|not.*rule itself|summary/i);
      }
    });
  }

  it('a future VERIFIED answer requires a genuinely verified passage', async () => {
    const { SOURCES } = await import('@/content/sources');
    const { CORPUS } = await import('@/content/corpus');
    const verified = CORPUS.filter((p) => p.status === 'VERIFIED');
    for (const p of verified) {
      const s = SOURCES.find((x) => x.id === p.sourceId);
      expect(s?.sha256).toBeTruthy();
      expect(s?.localPath).toBeTruthy();
    }
  });
});
