import { describe, expect, it } from 'vitest';
import { applyAliases, parseWhatsAppExport } from '@/lib/evidence/whatsapp';

describe('parseWhatsAppExport', () => {
  it('parses Android format with 24h clock', () => {
    const raw = [
      '07/09/2026, 09:15 - Mail Overseer: PLI target pending. Complete today.',
      '07/09/2026, 09:16 - Ravi ABPM: Sir I will try',
    ].join('\n');
    const r = parseWhatsAppExport(raw);
    expect(r.detectedFormat).toBe('android');
    expect(r.messages).toHaveLength(2);
    expect(r.messages[0].sender).toBe('Mail Overseer');
    expect(r.messages[0].timestamp).toBe('2026-09-07T09:15:00');
    expect(r.participants).toEqual(['Mail Overseer', 'Ravi ABPM']);
    expect(r.dateRange).toEqual({ start: '2026-09-07T09:15:00', end: '2026-09-07T09:16:00' });
  });

  it('parses iOS bracket format with 12h clock and seconds', () => {
    const raw =
      '[07/09/26, 9:15:30 PM] Supervisor A: Why only 2 accounts today?\n' +
      '[07/09/26, 9:16:02 PM] Employee B: I was on delivery beat till 6';
    const r = parseWhatsAppExport(raw);
    expect(r.detectedFormat).toBe('ios');
    expect(r.messages[0].timestamp).toBe('2026-09-07T21:15:30');
    expect(r.messages[0].sender).toBe('Supervisor A');
  });

  it('handles 12h am/pm with narrow no-break space (U+202F)', () => {
    const raw = '07/09/2026, 8:05 am - Supervisor A: Start canvassing early';
    const r = parseWhatsAppExport(raw);
    expect(r.messages[0].timestamp).toBe('2026-09-07T08:05:00');
  });

  it('joins multiline messages', () => {
    const raw = [
      '07/09/2026, 09:15 - Supervisor A: Targets for this week:',
      '1. PLI - 5',
      '2. RD - 10',
      'Do not fail.',
      '07/09/2026, 09:20 - Employee B: ok',
    ].join('\n');
    const r = parseWhatsAppExport(raw);
    expect(r.messages).toHaveLength(2);
    expect(r.messages[0].text).toBe('Targets for this week:\n1. PLI - 5\n2. RD - 10\nDo not fail.');
  });

  it('flags media, deleted and system messages', () => {
    const raw = [
      '01/01/2026, 10:00 - Messages and calls are end-to-end encrypted.',
      '07/09/2026, 09:15 - Supervisor A: <Media omitted>',
      '07/09/2026, 09:16 - Supervisor A: This message was deleted',
      '07/09/2026, 09:17 - Supervisor A: real message',
    ].join('\n');
    const r = parseWhatsAppExport(raw);
    expect(r.counts.system).toBe(1);
    expect(r.counts.media).toBe(1);
    expect(r.counts.deleted).toBe(1);
    expect(r.counts.content).toBe(1);
    expect(r.messages.find((m) => m.isSystem)?.sender).toBeNull();
  });

  it('parses Tamil and Tanglish content without mangling', () => {
    const raw = [
      '10/09/2026, 18:20 - மேற்பார்வையாளர்: இன்று மேளா இலக்கு எத்தனை முறை சொல்வது?',
      '10/09/2026, 18:21 - Ravi: Sir ivvalavu pressure panna mudiyala',
    ].join('\n');
    const r = parseWhatsAppExport(raw);
    expect(r.messages[0].text).toContain('எத்தனை முறை');
    expect(r.messages[1].text).toContain('pressure panna mudiyala');
    expect(r.participants).toContain('மேற்பார்வையாளர்');
  });

  it('infers MDY order when a day field exceeds 12 in the second position', () => {
    const raw = [
      '09/13/2026, 09:15 - A: first',
      '09/20/2026, 09:15 - A: second',
    ].join('\n');
    const r = parseWhatsAppExport(raw);
    expect(r.dateOrder).toBe('MDY');
    expect(r.messages[0].timestamp).toBe('2026-09-13T09:15:00');
  });

  it('does not throw on garbage input and reports warnings', () => {
    const r = parseWhatsAppExport('this is not a whatsapp export at all\nrandom line');
    expect(r.messages).toHaveLength(0);
    expect(r.warnings.some((w) => /No WhatsApp messages/.test(w))).toBe(true);
  });

  it('strips a UTF-8 BOM before the first message', () => {
    const raw = '﻿07/09/2026, 09:15 - A: hello';
    const r = parseWhatsAppExport(raw);
    expect(r.messages[0].sender).toBe('A');
  });

  it('applyAliases replaces sender names and never keeps the original', () => {
    const raw = '07/09/2026, 09:15 - +91 98765 43210: hi\n07/09/2026, 09:16 - Ravi Kumar: hi';
    const r = parseWhatsAppExport(raw);
    const aliased = applyAliases(r, { '+91 98765 43210': 'Supervisor A', 'Ravi Kumar': 'Employee B' });
    expect(aliased.participants).toEqual(['Employee B', 'Supervisor A']);
    expect(JSON.stringify(aliased.messages)).not.toContain('98765');
    expect(JSON.stringify(aliased.messages)).not.toContain('Ravi Kumar');
  });
});
