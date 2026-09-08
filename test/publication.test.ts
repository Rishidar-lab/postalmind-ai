import { describe, expect, it } from 'vitest';
import { publicationSafetyCheck } from '@/lib/evidence/publication';

describe('publicationSafetyCheck', () => {
  it('BLOCKS when a phone number is present', () => {
    const r = publicationSafetyCheck({ text: 'Supervisor messaged from 9876543210 after hours', sourceCited: true, counterEvidenceConsidered: true });
    expect(r.verdict).toBe('BLOCK');
    expect(r.canExport).toBe(false);
    expect(r.blockers.join(' ')).toMatch(/phone/i);
  });

  it('BLOCKS an unsupported legal conclusion', () => {
    const r = publicationSafetyCheck({
      text: 'The Mail Overseer committed criminal intimidation under section 503.',
      sourceCited: true,
      counterEvidenceConsidered: true,
      assertsLegalConclusion: true,
      legalConclusionIsAuthoritative: false,
    });
    expect(r.verdict).toBe('BLOCK');
    expect(r.blockers.join(' ')).toMatch(/legal or criminal conclusion/i);
  });

  it('allows an authoritative legal reference', () => {
    const r = publicationSafetyCheck({
      text: 'The tribunal held in its 2025 order that the transfer was punitive.',
      sourceCited: true,
      counterEvidenceConsidered: true,
      contextRetained: true,
      assertsLegalConclusion: true,
      legalConclusionIsAuthoritative: true,
    });
    expect(r.verdict).not.toBe('BLOCK');
  });

  it('BLOCKS a named defamation-sensitive claim that is weakly backed', () => {
    const r = publicationSafetyCheck({
      text: 'X threatened to stop the salary of the ABPM.',
      categories: ['EXPLICIT_THREAT'],
      namesIndividuals: true,
      namesAreNecessary: true,
      sourceCited: false,
    });
    expect(r.verdict).toBe('BLOCK');
  });

  it('PASSES clean, sourced, contextual, de-identified content', () => {
    const r = publicationSafetyCheck({
      text:
        'Over four days before the Mela, the supervising official sent seven messages pressing the same individual PLI target, including two outside working hours. Evidence items EV-2 to EV-8; see case file.',
      categories: ['REPEATED_TARGET_PRESSURE', 'AFTER_HOURS_COMMUNICATION'],
      namesIndividuals: false,
      counterEvidenceConsidered: true,
      contextRetained: true,
      sourceCited: true,
    });
    expect(r.verdict).toBe('PASS');
    expect(r.canExport).toBe(true);
  });

  it('WARNs (not blocks) on a very short decontextualised quote', () => {
    const r = publicationSafetyCheck({
      text: 'do it now',
      sourceCited: true,
      counterEvidenceConsidered: true,
    });
    expect(r.verdict).toBe('WARN');
    expect(r.canExport).toBe(true);
  });

  it('returns all 12 checklist items', () => {
    const r = publicationSafetyCheck({ text: 'hello world this is a longer sentence for context', sourceCited: true, counterEvidenceConsidered: true, contextRetained: true });
    expect(r.items.length).toBe(12);
  });
});
