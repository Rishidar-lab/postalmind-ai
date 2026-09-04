import { describe, expect, it } from 'vitest';
import { CORPUS } from '@/content/corpus';
import { SOURCES } from '@/content/sources';
import { trustOf, verificationViolations, TRUST_CLASSES } from '@/lib/sources/trust';

describe('source corpus verification', () => {
  it('keeps the primary corpus small and high quality', () => {
    expect(SOURCES.length).toBeLessThanOrEqual(10);
    expect(CORPUS.length).toBeLessThanOrEqual(20);
  });

  it('every source preserves citation metadata', () => {
    for (const s of SOURCES) {
      expect(s.title.trim().length).toBeGreaterThan(0);
      expect(s.authority.trim().length).toBeGreaterThan(0);
      expect(TRUST_CLASSES).toContain(trustOf(s));
      // date may be null (undated instruction) but the field must exist.
      expect('date' in s).toBe(true);
      expect('effectiveDate' in s).toBe(true);
      expect('sourceUrl' in s).toBe(true);
    }
  });

  it('VERIFIED means genuinely verified (mirror hash recorded)', () => {
    expect(verificationViolations(SOURCES)).toEqual([]);
    // No blog/repost is promoted to primary-official verification.
    for (const s of SOURCES) {
      if (s.status === 'VERIFIED') {
        expect(s.sha256).toBeTruthy();
        expect(s.localPath).toBeTruthy();
      }
    }
  });

  it('no DEMO passage is citable as a rule', () => {
    for (const p of CORPUS.filter((c) => c.status === 'DEMO')) {
      expect(p.text).toMatch(/DEMO|synthetic/i);
    }
  });

  it('priority material is present (conduct rules, TRCA, leave, discipline, business)', () => {
    const ids = new Set(SOURCES.map((s) => s.id));
    for (const id of ['gds-ce-rules-2020', 'dop-trca-order-2018', 'dop-gds-leave-instructions']) {
      expect(ids.has(id)).toBe(true);
    }
  });
});
