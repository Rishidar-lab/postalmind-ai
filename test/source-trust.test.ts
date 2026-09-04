import { describe, expect, it } from 'vitest';
import { CORPUS } from '@/content/corpus';
import { SOURCES } from '@/content/sources';
import { suggestSourceClass, verificationViolations } from '@/lib/sources/trust';
import { canIndependentlyVerify, SOURCE_CLASSES, type SourceRecord } from '@/lib/sources/types';

function makeSource(overrides: Partial<SourceRecord>): SourceRecord {
  return {
    id: 'test-source',
    title: 'Test Source',
    authority: 'Test Authority',
    documentType: 'GUIDANCE_NOTE',
    documentNumber: null,
    date: null,
    effectiveDate: null,
    supersededDate: null,
    sourceUrl: null,
    localPath: null,
    sha256: null,
    pageCount: null,
    sections: [],
    status: 'UNVERIFIED',
    sourceClass: 'SECONDARY_REPUTABLE',
    verifiedAt: null,
    verificationMethod: null,
    tags: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    summary: 'test',
    ...overrides,
  };
}

describe('source corpus verification', () => {
  it('keeps the primary corpus small and high quality', () => {
    expect(SOURCES.length).toBeLessThanOrEqual(10);
    expect(CORPUS.length).toBeLessThanOrEqual(20);
  });

  it('every source declares a valid sourceClass and preserves citation metadata', () => {
    for (const s of SOURCES) {
      expect(s.title.trim().length).toBeGreaterThan(0);
      expect(s.authority.trim().length).toBeGreaterThan(0);
      expect(SOURCE_CLASSES).toContain(s.sourceClass);
      // date may be null (undated instruction) but the field must exist.
      expect('date' in s).toBe(true);
      expect('effectiveDate' in s).toBe(true);
      expect('supersededDate' in s).toBe(true);
      expect('sourceUrl' in s).toBe(true);
      expect('documentNumber' in s).toBe(true);
      expect(Array.isArray(s.sections)).toBe(true);
    }
  });

  it('VERIFIED means genuinely verified: mirror hash, eligible class, verifiedAt', () => {
    expect(verificationViolations(SOURCES)).toEqual([]);
    for (const s of SOURCES) {
      if (s.status === 'VERIFIED') {
        expect(s.sha256).toBeTruthy();
        expect(s.localPath).toBeTruthy();
        expect(s.verifiedAt).toBeTruthy();
        expect(canIndependentlyVerify(s.sourceClass)).toBe(true);
      }
    }
  });

  it('no DEMO passage is citable as a rule, and DEMO status/class always agree', () => {
    for (const p of CORPUS.filter((c) => c.status === 'DEMO')) {
      expect(p.text).toMatch(/DEMO|synthetic/i);
    }
    for (const s of SOURCES) {
      if (s.status === 'DEMO') expect(s.sourceClass).toBe('DEMO');
      if (s.sourceClass === 'DEMO') expect(s.status).toBe('DEMO');
    }
  });

  it('priority material is present (conduct rules, TRCA, leave, discipline, business)', () => {
    const ids = new Set(SOURCES.map((s) => s.id));
    for (const id of ['gds-ce-rules-2020', 'dop-trca-order-2018', 'dop-gds-leave-instructions']) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it('a union/news/secondary/demo source can never independently verify a rule, even if mis-marked VERIFIED', () => {
    for (const badClass of ['UNION_OR_ASSOCIATION', 'NEWS_REPORT', 'SECONDARY_REPUTABLE', 'UNVERIFIED_WEB', 'DEMO'] as const) {
      const rogue = makeSource({
        id: `rogue-${badClass}`,
        status: 'VERIFIED',
        sourceClass: badClass,
        sha256: 'deadbeef',
        localPath: '/tmp/x.pdf',
        verifiedAt: '2026-01-01T00:00:00Z',
        verificationMethod: 'test',
      });
      expect(canIndependentlyVerify(rogue.sourceClass)).toBe(false);
      const violations = verificationViolations([rogue]);
      expect(violations.some((v) => v.includes('cannot independently establish'))).toBe(true);
    }
  });

  it('a VERIFIED source missing its mirror hash or verifiedAt is flagged, not silently accepted', () => {
    const noHash = makeSource({ status: 'VERIFIED', sourceClass: 'PRIMARY_OFFICIAL', verifiedAt: '2026-01-01T00:00:00Z', verificationMethod: 'checked' });
    expect(verificationViolations([noHash]).length).toBeGreaterThan(0);

    const noVerifiedAt = makeSource({
      status: 'VERIFIED',
      sourceClass: 'PRIMARY_OFFICIAL',
      sha256: 'deadbeef',
      localPath: '/tmp/x.pdf',
    });
    expect(verificationViolations([noVerifiedAt]).length).toBeGreaterThan(0);
  });

  it('suggestSourceClass is advisory only and never mutates or overrides a declared sourceClass', () => {
    // A real example where the heuristic and the deliberate classification
    // legitimately differ: a Government committee report doesn't contain
    // any of the heuristic's official-document trigger words, but is
    // properly classified PRIMARY_OFFICIAL by a human editor.
    const committee = SOURCES.find((s) => s.id === 'kamlesh-chandra-committee-2016')!;
    expect(committee.sourceClass).toBe('PRIMARY_OFFICIAL');
    // The heuristic's opinion is available but not authoritative.
    expect(SOURCE_CLASSES).toContain(suggestSourceClass(committee));
  });

  it('the RTI Act is classed as a parliamentary/statutory record, not a plain official circular', () => {
    const rti = SOURCES.find((s) => s.id === 'rti-act-2005')!;
    expect(rti.sourceClass).toBe('PARLIAMENTARY_OFFICIAL');
    expect(canIndependentlyVerify(rti.sourceClass)).toBe(true);
  });
});
