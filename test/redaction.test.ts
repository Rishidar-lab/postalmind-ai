import { describe, expect, it } from 'vitest';
import { detectPII } from '@/lib/evidence/pii';
import {
  applyRedactions,
  hasResidualLongDigits,
  publicForm,
  spansFromPII,
  unredact,
} from '@/lib/evidence/redaction';

describe('redaction', () => {
  it('replaces detected PII with unique tokens and keeps a reverse map', () => {
    const text = 'Call 9876543210 or mail a@b.com';
    const spans = spansFromPII(detectPII(text));
    const r = applyRedactions(text, spans);
    expect(r.redactedText).toContain('[phone·1]');
    expect(r.redactedText).toContain('[email·1]');
    expect(r.redactedText).not.toContain('9876543210');
    expect(r.reverseMap['[phone·1]']).toBe('9876543210');
  });

  it('round-trips via unredact', () => {
    const text = 'numbers 9876543210 and 9123456780 here';
    const r = applyRedactions(text, spansFromPII(detectPII(text)));
    expect(unredact(r.redactedText, r.reverseMap)).toBe(text);
  });

  it('merges overlapping spans and lets manual replacement win', () => {
    const text = 'secret zone here';
    const r = applyRedactions(text, [
      { start: 0, end: 6, replacement: '[a]', reason: 'auto', origin: 'auto' },
      { start: 3, end: 11, replacement: '[private]', reason: 'analyst', origin: 'manual' },
    ]);
    expect(r.appliedCount).toBe(1);
    expect(r.redactedText).toBe('[private·1] here');
  });

  it('publicForm collapses instance tokens to generic form', () => {
    expect(publicForm('[phone·1] and [phone·2] and [name·1]')).toBe('[phone] and [phone] and [name]');
  });

  it('hasResidualLongDigits ignores tokens but catches raw runs', () => {
    expect(hasResidualLongDigits('acct [account·1] ok')).toBe(false);
    expect(hasResidualLongDigits('acct 123456789 ok')).toBe(true);
  });

  it('does not mutate text outside spans', () => {
    const text = 'before 9876543210 after';
    const r = applyRedactions(text, spansFromPII(detectPII(text)));
    expect(r.redactedText.startsWith('before ')).toBe(true);
    expect(r.redactedText.endsWith(' after')).toBe(true);
  });
});
