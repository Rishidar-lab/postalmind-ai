import { describe, expect, it } from 'vitest';
import { generateRTIDraft } from '@/lib/tools/rti';

describe('generateRTIDraft', () => {
  it('produces a formatted application with the statutory clauses', () => {
    const d = generateRTIDraft({
      applicantName: 'A B',
      address: 'Village X, Tamil Nadu',
      pioDesignation: 'The Public Information Officer',
      publicAuthority: 'O/o the Supdt. of Post Offices, Y Division',
      subject: 'Delay in TRCA arrears',
      queries: ['A copy of the note approving my arrears bill.', 'The date my bill was passed for payment.'],
      periodFrom: '2024-01-01',
      periodTo: '2024-12-31',
      place: 'Z',
    });
    expect(d.text).toMatch(/Right to Information Act, 2005/);
    expect(d.text).toMatch(/Section 6\(1\)/);
    expect(d.text).toMatch(/within 30 days/);
    expect(d.text).toMatch(/severability/);
    expect(d.warnings).toHaveLength(0);
  });

  it('warns when a question asks "why" instead of for a record', () => {
    const d = generateRTIDraft({
      applicantName: '',
      address: '',
      pioDesignation: '',
      publicAuthority: '',
      subject: '',
      queries: ['Why was my leave rejected?'],
    });
    expect(d.warnings.join(' ')).toMatch(/reasons\/opinions/i);
  });

  it('inserts placeholders for missing fields', () => {
    const d = generateRTIDraft({
      applicantName: '',
      address: '',
      pioDesignation: '',
      publicAuthority: '',
      subject: '',
      queries: [],
    });
    expect(d.text).toMatch(/\[Full name\]/);
    expect(d.warnings.join(' ')).toMatch(/No questions provided/);
  });

  it('handles the BPL fee waiver', () => {
    const d = generateRTIDraft({
      applicantName: 'A',
      address: 'B',
      pioDesignation: 'PIO',
      publicAuthority: 'Office',
      subject: 'S',
      queries: ['A copy of the register entry.'],
      isBPL: true,
    });
    expect(d.text).toMatch(/Section 7\(5\)/);
    expect(d.text).not.toMatch(/Rs\. 10 is enclosed/);
  });
});
