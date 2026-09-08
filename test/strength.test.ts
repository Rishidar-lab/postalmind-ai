import { describe, expect, it } from 'vitest';
import { assessStrength, caseStrengthSummary } from '@/lib/evidence/strength';

describe('assessStrength', () => {
  it('rates a lone low-confidence suggestive item as WEAK or INSUFFICIENT', () => {
    const r = assessStrength({ categories: ['THREAT_LIKE_LANGUAGE'], confidence: 'LOW', signals: ['i will see'] });
    expect(['WEAK', 'INSUFFICIENT']).toContain(r.strength);
  });

  it('rates a corroborated, documented, repeated explicit item as STRONG', () => {
    const r = assessStrength(
      { categories: ['EXPLICIT_THREAT', 'FINANCIAL_PRESSURE'], confidence: 'HIGH', signals: ['charge sheet', 'recovery from salary'] },
      {
        corroboratingItems: 3,
        independentDocuments: 1,
        timeConsistent: true,
        speakerRole: 'SUPERVISORY',
        repetitionCount: 3,
      },
    );
    expect(r.strength).toBe('STRONG');
    expect(r.explanation).toMatch(/not whether any rule was broken/i);
  });

  it('never exposes a numeric score', () => {
    const r = assessStrength({ categories: ['PEER_COMPARISON'], confidence: 'MODERATE', signals: [] });
    expect(JSON.stringify(r)).not.toMatch(/"score"|"points"|\bscore\b/i);
  });

  it('counter-evidence lowers the rating', () => {
    const base = assessStrength(
      { categories: ['REPEATED_TARGET_PRESSURE'], confidence: 'HIGH', signals: [] },
      { corroboratingItems: 1, repetitionCount: 2, speakerRole: 'SUPERVISORY', timeConsistent: true },
    );
    const withCounter = assessStrength(
      { categories: ['REPEATED_TARGET_PRESSURE', 'COUNTER_EVIDENCE'], confidence: 'HIGH', signals: [] },
      { corroboratingItems: 1, repetitionCount: 2, speakerRole: 'SUPERVISORY', timeConsistent: true },
    );
    const order = { INSUFFICIENT: 0, WEAK: 1, MODERATE: 2, STRONG: 3 } as const;
    expect(order[withCounter.strength]).toBeLessThanOrEqual(order[base.strength]);
  });

  it('substantive-less content is not STRONG', () => {
    const r = assessStrength({ categories: ['NEUTRAL'], confidence: 'LOW', signals: [] });
    expect(r.strength === 'STRONG').toBe(false);
  });

  it('caseStrengthSummary picks the strongest bucket', () => {
    const s = caseStrengthSummary([
      { evidenceStrength: 'WEAK' },
      { evidenceStrength: 'MODERATE' },
      { evidenceStrength: 'INSUFFICIENT' },
    ]);
    expect(s.strongest).toBe('MODERATE');
    expect(s.distribution.WEAK).toBe(1);
  });
});
