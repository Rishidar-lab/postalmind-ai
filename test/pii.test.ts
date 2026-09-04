import { describe, expect, it } from 'vitest';
import { detectPII, summarizePII } from '@/lib/evidence/pii';

describe('detectPII', () => {
  it('finds Indian mobile numbers in several formats', () => {
    const t = 'call me on +91 98765 43210 or 09876543210 or 9876543210';
    const phones = detectPII(t).filter((m) => m.type === 'PHONE');
    expect(phones.length).toBe(3);
    expect(phones[0].suggestedReplacement).toBe('[phone]');
  });

  it('finds emails and PAN', () => {
    const t = 'mail ravi.k@indiapost.gov.in PAN ABCDE1234F';
    const types = detectPII(t).map((m) => m.type);
    expect(types).toContain('EMAIL');
    expect(types).toContain('PAN');
  });

  it('finds a post office facility ID', () => {
    const m = detectPII('Sevveri BO00000000000 accounts pending');
    expect(m.some((x) => x.type === 'FACILITY_ID')).toBe(true);
  });

  it('flags a 12-digit Aadhaar-shaped number', () => {
    const m = detectPII('aadhaar 4123 4567 8901 of customer');
    expect(m.some((x) => x.type === 'AADHAAR')).toBe(true);
  });

  it('flags long bare digit runs as possible account numbers', () => {
    const m = detectPII('SB account 003456789012 balance low');
    expect(m.some((x) => x.type === 'ACCOUNT_NUMBER')).toBe(true);
  });

  it('resolves overlaps by priority (email beats handle/url fragments)', () => {
    const m = detectPII('write to a@b.com now');
    expect(m.filter((x) => x.start < 20)).toHaveLength(1);
    expect(m[0].type).toBe('EMAIL');
  });

  it('does not flag ordinary sentences', () => {
    const m = detectPII('The Mail Overseer asked about the PLI target for this week.');
    expect(m.filter((x) => x.confidence === 'high')).toHaveLength(0);
  });

  it('summarizePII marks blocking PII', () => {
    const s = summarizePII(detectPII('phone 9876543210'));
    expect(s.hasBlocking).toBe(true);
    expect(s.byType.PHONE).toBe(1);
  });

  it('name cue detects an uninvolved third party', () => {
    const m = detectPII('customer Mr. Suresh Babu came to deposit');
    expect(m.some((x) => x.type === 'POSSIBLE_NAME' && x.value.includes('Suresh'))).toBe(true);
  });
});
