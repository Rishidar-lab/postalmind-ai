import { describe, expect, it } from 'vitest';
import { diffText, summarizeDiff } from '@/lib/sources/diff';

function reconstruct(segments: ReturnType<typeof diffText>, side: 'old' | 'new'): string {
  return segments
    .filter((s) => s.type === 'same' || (side === 'old' ? s.type === 'removed' : s.type === 'added'))
    .map((s) => s.text)
    .join('');
}

describe('deterministic rule-change diff', () => {
  it('reports no difference for identical text', () => {
    const segs = diffText('The fee is Rs. 10.', 'The fee is Rs. 10.');
    expect(summarizeDiff(segs).identical).toBe(true);
    expect(segs.every((s) => s.type === 'same')).toBe(true);
  });

  it('detects a single-word change precisely, not a rewrite of the whole passage', () => {
    const segs = diffText('The fee is Rs. 10 per application.', 'The fee is Rs. 20 per application.');
    const summary = summarizeDiff(segs);
    expect(summary.identical).toBe(false);
    expect(summary.removedWords).toBe(1);
    expect(summary.addedWords).toBe(1);
    // Everything else must still be marked "same", not swallowed into the change.
    const sameText = segs.filter((s) => s.type === 'same').map((s) => s.text).join('');
    expect(sameText).toContain('The fee is Rs.');
    expect(sameText).toContain('per application.');
  });

  it('reconstructs the exact old and new text from the segments (never invents wording)', () => {
    const oldText = 'GDS working hours are assessed in slabs of four hours.';
    const newText = 'GDS working hours are assessed in slabs of five hours, revised for workload.';
    const segs = diffText(oldText, newText);
    expect(reconstruct(segs, 'old')).toBe(oldText);
    expect(reconstruct(segs, 'new')).toBe(newText);
  });

  it('handles a pure addition (nothing removed) and a pure removal (nothing added)', () => {
    // Note: appending text after the existing final token (no punctuation
    // moved) keeps every original token — including its trailing
    // punctuation — intact, so this is a genuinely pure addition.
    const addSegs = diffText('Leave is fifteen days', 'Leave is fifteen days per year, subject to accumulation.');
    const addSummary = summarizeDiff(addSegs);
    expect(addSummary.removedWords).toBe(0);
    expect(addSummary.addedWords).toBeGreaterThan(0);

    const removeSegs = diffText('Leave is fifteen days per year, subject to accumulation.', 'Leave is fifteen days');
    const removeSummary = summarizeDiff(removeSegs);
    expect(removeSummary.addedWords).toBe(0);
    expect(removeSummary.removedWords).toBeGreaterThan(0);
  });

  it('handles empty inputs without throwing', () => {
    expect(() => diffText('', '')).not.toThrow();
    expect(summarizeDiff(diffText('', '')).identical).toBe(true);
    expect(summarizeDiff(diffText('', 'New text entirely.')).addedWords).toBeGreaterThan(0);
    expect(summarizeDiff(diffText('Old text entirely.', '')).removedWords).toBeGreaterThan(0);
  });
});
