import { describe, expect, it } from 'vitest';
import { detectPatterns } from '@/lib/evidence/patterns';
import type { EvidenceCategory, EvidenceItem } from '@/lib/evidence/types';

let seq = 0;
function item(day: string, categories: EvidenceCategory[]): EvidenceItem {
  seq += 1;
  return {
    id: `it_${seq}`,
    caseId: 'case_test',
    sourceId: 'src_test',
    timestamp: `${day}T10:00:00.000Z`,
    speakerLabel: 'Supervisor',
    speakerRole: 'SUPERVISORY',
    rawExcerpt: 'test excerpt',
    normalizedExcerpt: 'test excerpt',
    category: categories,
    confidence: 'MODERATE',
    evidenceStrength: 'MODERATE',
    contextBefore: null,
    contextAfter: null,
    corroboration: [],
    counterEvidence: [],
    analystNotes: null,
    publicationSuitability: 'NOT_ASSESSED',
    redactionStatus: 'DERIVED',
    createdAt: `${day}T10:00:00.000Z`,
    analysis: { categories, confidence: 'MODERATE', strength: 'MODERATE', reasons: [], supports: [], doesNotEstablish: [], signals: [] },
  };
}

describe('Target Pressure Analyzer 2.0 — deterministic pattern detection', () => {
  it("detects the mission's worked example: target -> repeated pressure -> peer comparison/public naming", () => {
    const items = [
      item('2026-09-01', ['TARGET_INSTRUCTION']),
      item('2026-09-02', ['REPEATED_TARGET_PRESSURE']),
      item('2026-09-03', ['PEER_COMPARISON']),
      item('2026-09-04', ['PUBLIC_NAMING']),
    ];
    const patterns = detectPatterns(items);
    const escalation = patterns.find((p) => p.id === 'escalating-target-pressure');
    expect(escalation).toBeDefined();
    expect(escalation!.description).toMatch(/^OBSERVED PATTERN:/);
    expect(escalation!.description).toMatch(/Repeated individual performance pressure/i);
    expect(escalation!.dayCount).toBeGreaterThanOrEqual(3);
  });

  it('never outputs a conclusory finding like "harassment proven" or "confirmed"', () => {
    const items = [
      item('2026-09-01', ['TARGET_INSTRUCTION']),
      item('2026-09-02', ['REPEATED_TARGET_PRESSURE']),
      item('2026-09-03', ['PUBLIC_SHAMING']),
      item('2026-09-04', ['AFTER_HOURS_COMMUNICATION']),
      item('2026-09-05', ['AFTER_HOURS_COMMUNICATION']),
      item('2026-09-06', ['AFTER_HOURS_COMMUNICATION']),
      item('2026-09-07', ['THREAT_LIKE_LANGUAGE']),
      item('2026-09-08', ['EXPLICIT_THREAT']),
    ];
    const patterns = detectPatterns(items);
    expect(patterns.length).toBeGreaterThan(0);
    for (const p of patterns) {
      expect(p.description).not.toMatch(/harassment proven|confirmed as harassment|proven/i);
      expect(p.description).toMatch(/^OBSERVED PATTERN:/);
    }
  });

  it('does not fire on purely neutral/administrative communication', () => {
    const items = [
      item('2026-09-01', ['ADMINISTRATIVE_INSTRUCTION']),
      item('2026-09-02', ['NEUTRAL']),
      item('2026-09-03', ['WORKLOAD_REFERENCE']),
    ];
    expect(detectPatterns(items)).toEqual([]);
  });

  it('a single instance of a category, with no escalation, does not trigger the escalation pattern', () => {
    const items = [item('2026-09-01', ['TARGET_INSTRUCTION'])];
    expect(detectPatterns(items).find((p) => p.id === 'escalating-target-pressure')).toBeUndefined();
  });

  it('requires chronological ordering — peer comparison before any target instruction is not an escalation', () => {
    const items = [
      item('2026-09-01', ['PEER_COMPARISON']),
      item('2026-09-02', ['REPEATED_TARGET_PRESSURE']),
      item('2026-09-03', ['TARGET_INSTRUCTION']),
    ];
    expect(detectPatterns(items).find((p) => p.id === 'escalating-target-pressure')).toBeUndefined();
  });

  it('detects sustained after-hours contact across 3+ distinct days', () => {
    const items = [
      item('2026-09-01', ['AFTER_HOURS_COMMUNICATION']),
      item('2026-09-02', ['AFTER_HOURS_COMMUNICATION']),
      item('2026-09-03', ['AFTER_HOURS_COMMUNICATION']),
    ];
    const p = detectPatterns(items).find((x) => x.id === 'sustained-after-hours');
    expect(p).toBeDefined();
    expect(p!.dayCount).toBe(3);
  });

  it('does not flag after-hours contact occurring on only 2 days', () => {
    const items = [
      item('2026-09-01', ['AFTER_HOURS_COMMUNICATION']),
      item('2026-09-02', ['AFTER_HOURS_COMMUNICATION']),
    ];
    expect(detectPatterns(items).find((x) => x.id === 'sustained-after-hours')).toBeUndefined();
  });

  it('detects leave-related pressure linked to target pressure within the time window', () => {
    const items = [item('2026-09-01', ['TARGET_INSTRUCTION']), item('2026-09-03', ['LEAVE_RELATED_PRESSURE'])];
    const p = detectPatterns(items).find((x) => x.id === 'leave-linked-pressure');
    expect(p).toBeDefined();
  });

  it('does not link leave pressure to target pressure far outside the window', () => {
    const items = [item('2026-09-01', ['TARGET_INSTRUCTION']), item('2026-09-30', ['LEAVE_RELATED_PRESSURE'])];
    expect(detectPatterns(items).find((x) => x.id === 'leave-linked-pressure')).toBeUndefined();
  });

  it('undated items are ignored — a pattern is about sequence and timing, which an undated item cannot support', () => {
    const undated = item('2026-09-01', ['TARGET_INSTRUCTION']);
    undated.timestamp = null;
    expect(detectPatterns([undated])).toEqual([]);
  });

  it('every pattern always exposes categoriesInvolved and itemIds tracing back to real evidence items', () => {
    const items = [
      item('2026-09-01', ['TARGET_INSTRUCTION']),
      item('2026-09-02', ['REPEATED_TARGET_PRESSURE']),
      item('2026-09-03', ['PEER_COMPARISON']),
    ];
    const patterns = detectPatterns(items);
    const ids = new Set(items.map((i) => i.id));
    for (const p of patterns) {
      expect(p.categoriesInvolved.length).toBeGreaterThan(0);
      for (const id of p.itemIds) expect(ids.has(id)).toBe(true);
    }
  });
});
