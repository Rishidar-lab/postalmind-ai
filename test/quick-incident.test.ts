import { describe, expect, it } from 'vitest';
import { createQuickIncident, quickIncidentToItem } from '@/lib/evidence/quick-incident';

describe('quick-incident (<30s, local, neutral)', () => {
  it('records an incident from just an excerpt', () => {
    const qi = createQuickIncident({ excerpt: 'Complete 3 more RPLI proposals by tomorrow without fail.' });
    expect(qi.id).toMatch(/^qi_/);
    expect(qi.timestamp).toBeTruthy();
    expect(qi.speakerAlias).toBe('Unknown speaker');
    expect(qi.exactExcerpt).toContain('RPLI');
    expect(qi.category.length).toBeGreaterThan(0);
    expect(qi.whatItSupports.length).toBeGreaterThan(0);
    expect(qi.whatItDoesNotEstablish.length).toBeGreaterThan(0);
    expect(qi.whatItDoesNotEstablish.join(' ')).toMatch(/does not establish/i);
  });

  it('stores every required field', () => {
    const qi = createQuickIncident({
      excerpt: 'Only you are at the bottom of the ranking.',
      speakerAlias: 'Supervising Official',
      speakerRole: 'SUPERVISORY',
      source: 'whatsapp',
      timestamp: '2026-09-05T08:56:00',
      contextBefore: 'Previous day target message.',
      contextAfter: 'Employee acknowledged.',
      counterEvidence: 'Later message was supportive.',
      notes: 'Group channel.',
    });
    expect(qi.source).toBe('whatsapp');
    expect(qi.speakerRole).toBe('SUPERVISORY');
    expect(qi.contextBefore).toContain('Previous day');
    expect(qi.contextAfter).toContain('acknowledged');
    expect(qi.counterEvidence.length).toBeGreaterThan(0);
    expect(qi.notes).toBe('Group channel.');
    // Neutrality: peer comparison is not misconduct by itself.
    expect(qi.category).toContain('PEER_COMPARISON');
  });

  it('rejects empty or oversized excerpts', () => {
    expect(() => createQuickIncident({ excerpt: '   ' })).toThrow();
    expect(() => createQuickIncident({ excerpt: 'x'.repeat(2001) })).toThrow();
  });

  it('a passive-aggressive tone alone is not a legal finding', () => {
    const qi = createQuickIncident({ excerpt: 'Fine. Do whatever you want, see what happens.' });
    const text = [...qi.whatItSupports, ...qi.whatItDoesNotEstablish].join(' ');
    expect(text).not.toMatch(/illegal harassment/i);
    expect(qi.whatItDoesNotEstablish.join(' ')).toMatch(/does not establish/i);
  });

  it('maps to an EvidenceItem for the timeline', () => {
    const qi = createQuickIncident({ excerpt: 'ASP inspection may happen, keep records ready.' });
    const item = quickIncidentToItem(qi, { caseId: 'c1', sourceId: 's1' });
    expect(item.caseId).toBe('c1');
    expect(item.rawExcerpt).toBe(qi.exactExcerpt);
    expect(item.category).toEqual(qi.category);
    expect(item.analysis.doesNotEstablish.length).toBeGreaterThan(0);
  });
});
