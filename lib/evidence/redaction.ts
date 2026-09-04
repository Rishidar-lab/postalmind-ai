/**
 * Redaction.
 *
 * A redaction is a span [start,end) of some source text plus a replacement
 * token. We keep an internal, reversible map (token -> original value) so an
 * analyst can un-redact *inside the workspace*. The reverse map is never part
 * of a PUBLIC export.
 *
 * The original evidence bytes are never touched — redaction always produces a
 * new derived string.
 */

import type { PIIMatch } from './pii';

export interface RedactionSpan {
  start: number;
  end: number;
  /** Replacement token shown in place of the original, e.g. "[phone]". */
  replacement: string;
  /** Why this span is redacted (for the audit log / review UI). */
  reason: string;
  /** 'auto' = from the detector, 'manual' = analyst-drawn. */
  origin: 'auto' | 'manual';
}

export interface RedactionResult {
  redactedText: string;
  /** Reversible map: token instance -> original substring. Internal only. */
  reverseMap: Record<string, string>;
  appliedCount: number;
  /** Spans actually applied, in order, with their positions in redactedText. */
  applied: Array<RedactionSpan & { outStart: number; outEnd: number; token: string }>;
}

export function spansFromPII(matches: PIIMatch[]): RedactionSpan[] {
  return matches.map((m) => ({
    start: m.start,
    end: m.end,
    replacement: m.suggestedReplacement,
    reason: m.label,
    origin: 'auto' as const,
  }));
}

/** Merge overlapping/adjacent spans; manual spans win their replacement text. */
function normalizeSpans(spans: RedactionSpan[]): RedactionSpan[] {
  const sorted = [...spans]
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const out: RedactionSpan[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.start <= last.end) {
      last.end = Math.max(last.end, s.end);
      if (s.origin === 'manual') {
        last.replacement = s.replacement;
        last.origin = 'manual';
        last.reason = s.reason || last.reason;
      }
    } else {
      out.push({ ...s });
    }
  }
  return out;
}

/**
 * Apply redactions to `text`. Tokens are made unique per instance
 * ("[phone]" -> "[phone·1]") so the reverse map is unambiguous.
 */
export function applyRedactions(text: string, spans: RedactionSpan[]): RedactionResult {
  const norm = normalizeSpans(spans);
  const reverseMap: Record<string, string> = {};
  const applied: RedactionResult['applied'] = [];
  const counters: Record<string, number> = {};

  let out = '';
  let cursor = 0;
  for (const s of norm) {
    if (s.start < cursor) continue; // safety
    out += text.slice(cursor, s.start);
    const base = s.replacement.replace(/[[\]]/g, '');
    counters[base] = (counters[base] ?? 0) + 1;
    const token = `[${base}·${counters[base]}]`;
    const outStart = out.length;
    out += token;
    const original = text.slice(s.start, s.end);
    reverseMap[token] = original;
    applied.push({ ...s, token, outStart, outEnd: out.length });
    cursor = s.end;
  }
  out += text.slice(cursor);

  return { redactedText: out, reverseMap, appliedCount: applied.length, applied };
}

/** Reverse a redaction inside the workspace (never for public output). */
export function unredact(redactedText: string, reverseMap: Record<string, string>): string {
  let out = redactedText;
  for (const [token, original] of Object.entries(reverseMap)) {
    out = out.split(token).join(original);
  }
  return out;
}

/**
 * Produce the display form for a PUBLIC export: collapse the per-instance
 * tokens back to their generic form ("[phone·1]" -> "[phone]") so the output
 * does not leak how many distinct values were removed unless that matters.
 */
export function publicForm(redactedText: string): string {
  return redactedText.replace(/\[([a-z-]+)·\d+\]/gi, '[$1]');
}

/** True if any raw (non-token) digit run of 6+ digits survives — a redaction smell test. */
export function hasResidualLongDigits(text: string): boolean {
  const stripped = text.replace(/\[[a-z-]+(?:·\d+)?\]/gi, '');
  return /\d{6,}/.test(stripped);
}
