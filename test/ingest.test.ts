import { describe, expect, it } from 'vitest';
import { ingestWhatsApp } from '@/lib/evidence/ingest';
import { applyAliases, parseWhatsAppExport } from '@/lib/evidence/whatsapp';
import { DEMO_ALIASES, DEMO_WHATSAPP_EXPORT } from '@/lib/demo/whatsapp-sample';

describe('ingestWhatsApp (demo Mela export)', () => {
  const parsed = applyAliases(parseWhatsAppExport(DEMO_WHATSAPP_EXPORT), DEMO_ALIASES);
  const { items, summary } = ingestWhatsApp(parsed, {
    caseId: 'C',
    sourceId: 'S',
    workingHours: { start: '09:00', end: '17:00' },
    eventDate: '2026-09-10',
    caseWindow: { start: '2026-09-01T00:00:00', end: '2026-09-30T23:59:59' },
  });

  it('creates one item per non-system message', () => {
    expect(summary.skippedSystem).toBeGreaterThanOrEqual(1);
    expect(items.length).toBe(parsed.messages.filter((m) => !m.isSystem).length);
  });

  it('classifies the ranking-sheet message as peer comparison / public', () => {
    const it = items.find((x) => x.rawExcerpt.includes('bottom'));
    expect(it?.category).toContain('PEER_COMPARISON');
  });

  it('flags the Sunday 20:05 message as after-hours', () => {
    const it = items.find((x) => x.rawExcerpt.includes('Sunday also'));
    expect(it?.category).toContain('AFTER_HOURS_COMMUNICATION');
  });

  it('detects repeated target pressure across the week', () => {
    const repeated = items.filter((x) => x.category.includes('REPEATED_TARGET_PRESSURE'));
    expect(repeated.length).toBeGreaterThanOrEqual(1);
  });

  it('captures the supportive message as counter-evidence', () => {
    const it = items.find((x) => x.rawExcerpt.includes('take rest'));
    expect(it?.category).toContain('COUNTER_EVIDENCE');
    expect(it?.counterEvidence.length).toBeGreaterThan(0);
  });

  it('every item carries a "does not establish" caveat', () => {
    for (const it of items) {
      expect(it.analysis.doesNotEstablish.length).toBeGreaterThan(0);
    }
  });

  it('does not rate any single item STRONG without corroboration+documents', () => {
    // The synthetic case has no independent documents attached.
    expect(items.every((it) => it.evidenceStrength !== 'STRONG')).toBe(true);
  });

  it('links corroboration between items sharing a category', () => {
    const withCorr = items.filter((it) => it.corroboration.length > 0);
    expect(withCorr.length).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    const again = ingestWhatsApp(parsed, {
      caseId: 'C',
      sourceId: 'S',
      workingHours: { start: '09:00', end: '17:00' },
    });
    expect(again.items.map((i) => i.category)).toEqual(items.map((i) => i.category));
  });
});
