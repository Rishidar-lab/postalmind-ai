/**
 * Rule Change Tracker log.
 *
 * A RuleChange records that PostalMind has verified — by deterministic text
 * comparison of two document versions, never by asking a model to "spot the
 * difference" — that a rule genuinely changed. It starts empty, like
 * content/corrections.ts: no source in this project's library currently has
 * two verified, dated versions on file to compare. Add an entry only once
 * both old and new text has been checked against the actual documents.
 */

export interface RuleChange {
  id: string;
  /** Links to a content/sources.ts id, if the source is already registered. */
  sourceId: string | null;
  title: string;
  oldLabel: string;
  oldText: string;
  oldDate: string | null;
  newLabel: string;
  newText: string;
  newDate: string | null;
  effectiveDate: string | null;
  /** Where both versions were obtained — never asserted without this. */
  source: string;
  /** Editorially written, deterministic-diff-informed impact note. Never AI-generated. */
  impact: string;
  recordedAt: string;
}

export const RULE_CHANGES: RuleChange[] = [];
