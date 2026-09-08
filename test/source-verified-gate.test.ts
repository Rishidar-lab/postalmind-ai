import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetConfigCache } from '@/lib/config';
import { resetProviderCache } from '@/lib/ai';

/**
 * Source-trust gate.
 *
 * Some corpus sources are now genuinely VERIFIED (primary PDF mirrored with
 * a recorded SHA-256, maintainer-checked passages). An UNVERIFIED source
 * (e.g. the Kamlesh Chandra report, whose full text was never retrieved
 * from an official host) can still never produce a VERIFIED answer: any
 * retrieval touching an unverified passage stays UNVERIFIED.
 *
 * VERIFIED classification is honest if and only if every cited passage is
 * genuinely verified (passage VERIFIED + source VERIFIED + recorded mirror).
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

  // Questions whose retrieval touches the still-UNVERIFIED Kamlesh Chandra
  // passages must never classify VERIFIED.
  const NEVER_VERIFIED = [
    'What is the TRCA revision of 2018?',
    'What are the working hours norms for GDS?',
    'What leave are GDS entitled to?',
    'What is the disciplinary framework under the GDS Conduct and Engagement Rules 2020?',
    'Are business targets part of GDS work?',
  ];

  // Questions whose retrieval is fully covered by genuinely verified
  // passages (mirrored primary PDFs) honestly classify VERIFIED.
  const GENUINELY_VERIFIED = [
    'How many days does the PIO have to reply to an RTI application?',
    'What is the current RD interest rate?',
  ];

  for (const q of NEVER_VERIFIED) {
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

  for (const q of GENUINELY_VERIFIED) {
    it(`VERIFIED only on genuine mirrors for: ${q.slice(0, 50)}…`, async () => {
      const { ask } = await import('@/lib/ask/answer');
      const { SOURCES } = await import('@/content/sources');
      const r = await ask(q);
      expect(r.classification).toBe('VERIFIED');
      expect(r.citations.length).toBeGreaterThan(0);
      for (const c of r.citations) {
        expect(c.status).toBe('VERIFIED');
        const s = SOURCES.find((x) => x.id === c.sourceId);
        expect(s?.status).toBe('VERIFIED');
        expect(s?.sha256).toBeTruthy();
        expect(s?.localPath).toBeTruthy();
        expect(s?.verificationMethod).toBeTruthy();
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
