import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assessRetrieval, retrieve } from '@/lib/sources/registry';
import { resetConfigCache } from '@/lib/config';
import { resetProviderCache } from '@/lib/ai';

describe('retrieve', () => {
  it('finds the RTI passage for an RTI question', () => {
    const r = retrieve('how many days does the PIO have to reply to my RTI application');
    expect(r[0]?.sourceId).toBe('rti-act-2005');
    expect(r[0]?.matchedTerms).toContain('rti');
  });

  it('finds the TRCA passage for a salary question', () => {
    const r = retrieve('what is my TRCA and when was the 2018 revision');
    expect(r.map((p) => p.sourceId)).toContain('dop-trca-order-2018');
  });

  it('returns nothing for an out-of-scope question', () => {
    const r = retrieve('what is the capital of France');
    expect(r).toHaveLength(0);
  });

  it('assessRetrieval reports none for empty results', () => {
    expect(assessRetrieval([]).level).toBe('none');
  });
});

describe('ask (demo mode)', () => {
  beforeEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    resetConfigCache();
    resetProviderCache();
  });
  afterEach(() => {
    resetConfigCache();
    resetProviderCache();
  });

  it('returns UNKNOWN and does not invent an answer when nothing is retrieved', async () => {
    const { ask } = await import('@/lib/ask/answer');
    const r = await ask('what is the capital of France');
    expect(r.classification).toBe('UNKNOWN');
    expect(r.citations).toHaveLength(0);
    expect(r.mode).toBe('none');
  });

  it('returns an extractive, cited answer for an in-scope question', async () => {
    const { ask } = await import('@/lib/ask/answer');
    const r = await ask('RTI reply timeline for a delayed TRCA');
    expect(r.mode).toBe('extractive');
    expect(r.citations.length).toBeGreaterThan(0);
    expect(r.answer).toMatch(/\[S1\]/);
    // demo/unverified sources -> never VERIFIED
    expect(['UNVERIFIED', 'UNKNOWN']).toContain(r.classification);
  });

  it('never emits a small-savings rate it was not given', async () => {
    const { ask } = await import('@/lib/ask/answer');
    const r = await ask('current RD interest rate');
    expect(r.answer).not.toMatch(/\b[0-9]+(\.[0-9]+)?\s?%/);
  });
});
