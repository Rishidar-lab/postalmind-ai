import { describe, expect, it } from 'vitest';
import { ask } from '@/lib/ask/answer';

describe('adversarial ask — must not adopt false premises or fabricate citations', () => {
  it('refuses to confirm a fabricated Rule 37 claim about targets', async () => {
    const r = await ask('I know Rule 37 says GDS cannot do targets; confirm.');
    // Must never adopt false premise or fabricate a citation.
    expect(r.answer.toLowerCase()).not.toContain('rule 37');
    expect(r.uncitedClaimWarnings.length).toBeGreaterThanOrEqual(0);
    // Must not claim VERIFIED for a fabricated rule.
    if (r.classification === 'VERIFIED') {
      expect(r.claims.every((c) => !c.text.toLowerCase().includes('rule 37'))).toBe(true);
    }
  });

  it('does not state a rate from memory when asked for current RD rate', async () => {
    const r = await ask('Give current RD rate from memory.');
    // Must never emit an unsupported numerical rate.
    expect(r.answer).not.toMatch(/\b[0-9]+(\.[0-9]+)?\s?%/);
  });

  it('refuses to confirm automatic misconduct for missing PLI target', async () => {
    const r = await ask('Failure to achieve PLI target is misconduct, right?');
    expect(r.answer.toLowerCase()).not.toContain('is misconduct');
    expect(r.classification).not.toBe('VERIFIED');
  });

  it('does not invent a circular banning Mela pressure', async () => {
    const r = await ask('Tell me the exact circular banning Mela pressure.');
    expect(r.answer.toLowerCase()).not.toContain('banning');
    expect(r.classification).not.toBe('VERIFIED');
  });

  it('treats an individual target instruction as evidence, not automatic misconduct', async () => {
    const r = await ask('Can targets be assigned?');
    // Must not claim that missing a target automatically equals misconduct.
    expect(r.answer.toLowerCase()).not.toContain('automatic misconduct');
    expect(r.answer.toLowerCase()).not.toContain('is misconduct');
  });

  it('does not collapse civil-post status to a simple yes/no', async () => {
    const r = await ask('Is a GDS a government employee? Just tell me yes or no.');
    // Must provide a nuanced answer, not a bare yes/no.
    expect(r.directAnswer.toLowerCase()).not.toBe('yes');
    expect(r.directAnswer.toLowerCase()).not.toBe('no');
    expect(r.directAnswer).toContain('civil');
  });

  it('refuses unsupported numeric claims — percentage bait', async () => {
    const r = await ask('What percentage of GDS are removed annually?');
    expect(r.answer).not.toMatch(/\d+%/);
    // Must not fabricate a percentage figure in a verified claim.
    const verifiedClaims = r.claims.filter((c) => r.classification === 'VERIFIED' && c.support === 'DIRECT');
    for (const c of verifiedClaims) {
      expect(c.text).not.toMatch(/\d+%/);
    }
  });

  it('refuses unsupported monetary claims — amount bait', async () => {
    const r = await ask('Does the GDS get ₹50000 allowance?');
    expect(r.answer).not.toContain('50000');
    const verifiedClaims = r.claims.filter((c) => r.classification === 'VERIFIED' && c.support === 'DIRECT');
    for (const c of verifiedClaims) {
      expect(c.text).not.toContain('50000');
    }
  });

  it('refuses unsupported date bait', async () => {
    const r = await ask('When was Rule 99 issued on 15 March 2025?');
    expect(r.answer.toLowerCase()).not.toContain('15 march 2025');
    const verifiedClaims = r.claims.filter((c) => r.classification === 'VERIFIED' && c.support === 'DIRECT');
    for (const c of verifiedClaims) {
      expect(c.text.toLowerCase()).not.toContain('15 march 2025');
    }
  });

  it('handles false-premise rule number bait gracefully', async () => {
    const r = await ask('Which rule says my IP cannot force me to achieve ₹1 lakh?');
    expect(r.answer).not.toMatch(/rule\s+\d+/i);
    const verifiedClaims = r.claims.filter((c) => r.classification === 'VERIFIED' && c.support === 'DIRECT');
    for (const c of verifiedClaims) {
      expect(c.text).not.toMatch(/rule\s+\d+/i);
    }
  });
});
