import { describe, expect, it } from 'vitest';
import { CORRECTION_SEVERITIES, CORRECTIONS } from '@/content/corrections';

describe('corrections ledger', () => {
  it('declares exactly the required severity levels', () => {
    expect([...CORRECTION_SEVERITIES].sort()).toEqual(
      ['TYPO', 'CLARIFICATION', 'FACTUAL_CORRECTION', 'SOURCE_UPGRADE', 'RETRACTION'].sort(),
    );
  });

  it('every logged correction has every required field non-empty, and a valid severity', () => {
    for (const c of CORRECTIONS) {
      expect(c.id.trim().length).toBeGreaterThan(0);
      expect(c.date.trim().length).toBeGreaterThan(0);
      expect(c.location.trim().length).toBeGreaterThan(0);
      expect(c.originalClaim.trim().length).toBeGreaterThan(0);
      expect(c.correctedClaim.trim().length).toBeGreaterThan(0);
      expect(c.reason.trim().length).toBeGreaterThan(0);
      expect(c.source.trim().length).toBeGreaterThan(0);
      expect(CORRECTION_SEVERITIES).toContain(c.severity);
    }
  });

  it('ids are unique, so a correction can always be linked to individually and never silently merged with another', () => {
    const ids = CORRECTIONS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
