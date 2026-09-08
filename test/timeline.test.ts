import { describe, expect, it } from 'vitest';
import { buildTimeline } from '@/lib/evidence/timeline';
import type { EvidenceItem } from '@/lib/evidence/types';

function item(partial: Partial<EvidenceItem> & { id: string; timestamp: string | null }): EvidenceItem {
  return {
    caseId: 'c1',
    sourceId: 's1',
    speakerLabel: 'Supervisor A',
    speakerRole: 'SUPERVISORY',
    rawExcerpt: 'x',
    normalizedExcerpt: partial.normalizedExcerpt ?? 'message text',
    category: partial.category ?? ['TARGET_INSTRUCTION'],
    confidence: 'MODERATE',
    evidenceStrength: partial.evidenceStrength ?? 'WEAK',
    contextBefore: null,
    contextAfter: null,
    corroboration: [],
    counterEvidence: [],
    analystNotes: null,
    publicationSuitability: 'NOT_ASSESSED',
    redactionStatus: 'DERIVED',
    createdAt: '2026-09-11T00:00:00Z',
    analysis: {
      categories: partial.category ?? ['TARGET_INSTRUCTION'],
      confidence: 'MODERATE',
      strength: 'WEAK',
      reasons: [],
      supports: [],
      doesNotEstablish: ['x'],
      signals: [],
    },
    ...partial,
  };
}

describe('buildTimeline', () => {
  const items: EvidenceItem[] = [
    item({ id: 'a', timestamp: '2026-09-07T09:15:00' }),
    item({ id: 'b', timestamp: '2026-09-08T09:00:00' }),
    item({ id: 'c', timestamp: '2026-09-09T18:40:00', category: ['PEER_COMPARISON'] }),
    item({ id: 'd', timestamp: '2026-09-10T18:20:00', category: ['AFTER_HOURS_COMMUNICATION'], evidenceStrength: 'MODERATE' }),
    item({ id: 'e', timestamp: '2026-09-11T10:00:00', category: ['THREAT_LIKE_LANGUAGE'] }),
    item({ id: 'f', timestamp: null }),
  ];

  it('orders events chronologically with undated last', () => {
    const t = buildTimeline(items, { centralEventDate: '2026-09-10' });
    expect(t.events.map((e) => e.evidenceItemId)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('assigns PRE / EVENT_DAY / POST phases around the central date', () => {
    const t = buildTimeline(items, { centralEventDate: '2026-09-10' });
    expect(t.phases.PRE_EVENT.map((e) => e.evidenceItemId)).toEqual(['a', 'b', 'c']);
    expect(t.phases.EVENT_DAY.map((e) => e.evidenceItemId)).toEqual(['d']);
    expect(t.phases.POST_EVENT.map((e) => e.evidenceItemId)).toEqual(['e']);
    expect(t.phases.UNDATED.map((e) => e.evidenceItemId)).toEqual(['f']);
  });

  it('merges manual events into the ordering', () => {
    const t = buildTimeline(items, {
      centralEventDate: '2026-09-10',
      manualEvents: [{ id: 'm1', at: '2026-09-07T08:00:00', title: 'Mela target announced verbally' }],
    });
    expect(t.events[0].id).toBe('m1');
    expect(t.events[0].kind).toBe('manual');
  });

  it('detects a cluster of activity', () => {
    const t = buildTimeline(items, { centralEventDate: '2026-09-10', clusterWindowHours: 96, minCluster: 3 });
    expect(t.clusters.length).toBeGreaterThanOrEqual(1);
    expect(t.clusters[0].count).toBeGreaterThanOrEqual(3);
  });

  it('handles the no-central-date case (all UNDATED phase-wise but still ordered)', () => {
    const t = buildTimeline(items);
    expect(t.centralEventDate).toBeNull();
    expect(t.phases.UNDATED.length).toBe(items.length);
    expect(t.range).toEqual({ start: '2026-09-07T09:15:00', end: '2026-09-11T10:00:00' });
  });
});
