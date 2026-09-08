import { describe, expect, it } from 'vitest';
import { classifyMessage } from '@/lib/evidence/classify';

/**
 * P8 — evidence classifier adversarial suite. Each case pins the neutral /
 * conservative reading AND the mandatory supports / does-NOT-establish pair.
 */
describe('classifier adversarial suite', () => {
  it('A: plain deadline is instruction, not harassment', () => {
    const a = classifyMessage({ text: 'Please complete 5 accounts by Friday.' });
    expect(a.categories).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/TARGET_INSTRUCTION|PERFORMANCE_EXPECTATION|ADMINISTRATIVE_INSTRUCTION/),
      ]),
    );
    expect(a.categories).not.toContain('EXPLICIT_THREAT');
    expect(a.categories).not.toContain('ABUSIVE_LANGUAGE');
    expect(mandate(a)).toBe(true);
  });

  it('B: peer comparison without shaming is not public shaming', () => {
    const a = classifyMessage({ text: 'Others have completed their target. Please improve.' });
    expect(a.categories).toEqual(
      expect.arrayContaining([expect.stringMatching(/PEER_COMPARISON|PERFORMANCE_EXPECTATION|TARGET_INSTRUCTION/)]),
    );
    expect(a.categories).not.toContain('PUBLIC_SHAMING');
    expect(a.categories).not.toContain('EXPLICIT_THREAT');
    expect(mandate(a)).toBe(true);
  });

  it('C: degrading + exclusionary language is abusive', () => {
    const a = classifyMessage({ text: 'You are useless. Everyone can do this except you.' });
    expect(a.categories).toEqual(
      expect.arrayContaining([expect.stringMatching(/ABUSIVE_LANGUAGE|PEER_COMPARISON|PUBLIC_SHAMING/)]),
    );
    expect(mandate(a)).toBe(true);
  });

  it('D: inspection tied to a target is pressure + reference, not an illegal threat', () => {
    const a = classifyMessage({ text: "If you don't complete this, inspection will be arranged." });
    expect(a.categories).toContain('INSPECTION_REFERENCE');
    expect(a.categories).not.toContain('EXPLICIT_THREAT');
    expect(a.doesNotEstablish.join(' ')).toMatch(/threat|not.*establish|reasonable readers may differ/i);
    expect(mandate(a)).toBe(true);
  });

  it('E: bare reporting instruction is administrative', () => {
    const a = classifyMessage({ text: 'Report tomorrow morning.' });
    expect(a.categories).toContain('ADMINISTRATIVE_INSTRUCTION');
    expect(a.categories).not.toContain('EXPLICIT_THREAT');
    expect(a.categories).not.toContain('THREAT_LIKE_LANGUAGE');
    expect(mandate(a)).toBe(true);
  });

  it('F: 8:30 PM achievement request is after-hours, not misconduct', () => {
    const a = classifyMessage({
      text: "Please send today's achievement.",
      timestamp: '2026-09-10T20:30:00',
      workingHours: { start: '09:00', end: '17:00' },
    });
    expect(a.categories).toContain('AFTER_HOURS_COMMUNICATION');
    expect(a.doesNotEstablish.join(' ')).toMatch(/time fact|not misconduct|frequency/i);
    expect(mandate(a)).toBe(true);
  });
});

function mandate(a: { supports: string[]; doesNotEstablish: string[] }): boolean {
  return a.supports.length > 0 && a.doesNotEstablish.length > 0;
}
