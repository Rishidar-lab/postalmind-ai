'use client';

import { useState } from 'react';
import { diffText, summarizeDiff, type DiffSegment } from '@/lib/sources/diff';

/**
 * Deterministic old-vs-new text comparison. No AI is involved in computing
 * the difference — this is a pure word-level diff so nothing here can
 * invent a change that isn't actually in the text.
 */
export function RuleDiffClient() {
  const [oldText, setOldText] = useState('');
  const [newText, setNewText] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [source, setSource] = useState('');
  const [segments, setSegments] = useState<DiffSegment[] | null>(null);

  const summary = segments ? summarizeDiff(segments) : null;

  function compare() {
    setSegments(diffText(oldText, newText));
  }

  return (
    <div className="card space-y-4">
      <div>
        <p className="label-strong">Compare two versions</p>
        <p className="mt-1 text-[13px] text-muted">
          Paste the old wording and the new wording of a circular, order or rule you have in hand.
          PostalMind computes a deterministic word-level difference — it never asks a model to guess
          what changed.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="old" className="label-strong">
            Old wording
          </label>
          <textarea
            id="old"
            className="field mt-1 min-h-[140px] resize-y font-mono text-[13px]"
            value={oldText}
            onChange={(e) => setOldText(e.target.value)}
            placeholder="Paste the earlier text here…"
          />
        </div>
        <div>
          <label htmlFor="new" className="label-strong">
            New wording
          </label>
          <textarea
            id="new"
            className="field mt-1 min-h-[140px] resize-y font-mono text-[13px]"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Paste the newer text here…"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="eff" className="label-strong">
            Effective date (optional, your record)
          </label>
          <input
            id="eff"
            type="text"
            className="field mt-1"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            placeholder="e.g. 2027-01-01"
          />
        </div>
        <div>
          <label htmlFor="src" className="label-strong">
            Source (optional, your record)
          </label>
          <input
            id="src"
            type="text"
            className="field mt-1"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. Circular No. … dated …"
          />
        </div>
      </div>

      <button type="button" className="btn btn-primary" onClick={compare} disabled={!oldText.trim() && !newText.trim()}>
        Compare
      </button>

      {segments && summary && (
        <div className="space-y-3 border-t border-line pt-4">
          <p className="label-strong">What changed</p>
          {summary.identical ? (
            <p className="text-[14px] text-muted">No difference detected — the two texts are identical.</p>
          ) : (
            <p className="text-[13px] text-muted">
              {summary.changedRuns} changed passage{summary.changedRuns === 1 ? '' : 's'} · {summary.addedWords} word
              {summary.addedWords === 1 ? '' : 's'} added · {summary.removedWords} word{summary.removedWords === 1 ? '' : 's'} removed.
              This count is mechanical (word-level), not a judgment of importance — a one-word change can matter more than a
              ten-word one.
            </p>
          )}

          <div className="rounded border border-line p-3 text-[13.5px] leading-relaxed">
            {segments.map((seg, i) => {
              if (seg.type === 'same') return <span key={i}>{seg.text}</span>;
              if (seg.type === 'removed') {
                return (
                  <span key={i} style={{ color: 'var(--danger)', textDecoration: 'line-through' }}>
                    {seg.text}
                  </span>
                );
              }
              return (
                <span key={i} style={{ color: 'var(--ok)', textDecoration: 'underline' }}>
                  {seg.text}
                </span>
              );
            })}
          </div>

          {(effectiveDate || source) && (
            <p className="text-[12px] text-faint">
              {effectiveDate ? `Effective date noted: ${effectiveDate}. ` : ''}
              {source ? `Source noted: ${source}.` : ''} This is your own annotation, not verified by PostalMind — check the
              actual notification for the effective date and source before relying on it.
            </p>
          )}

          <p className="text-[12px] text-faint">
            Nothing here is saved or sent anywhere — this comparison runs entirely in your browser.
          </p>
        </div>
      )}
    </div>
  );
}
