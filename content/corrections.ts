/**
 * Corrections log.
 *
 * Every entry here documents a factual correction to something PostalMind AI
 * published — see docs/CORRECTIONS-POLICY.md. This array starts empty
 * because no correction has been needed yet. Add an entry when one is,
 * with every field filled in; never silently edit a published claim
 * without adding one here. An important correction is never removed from
 * this array — if a correction itself needs revising, add a new entry
 * referencing the old one rather than deleting it.
 */

export const CORRECTION_SEVERITIES = [
  'TYPO',
  'CLARIFICATION',
  'FACTUAL_CORRECTION',
  'SOURCE_UPGRADE',
  'RETRACTION',
] as const;
export type CorrectionSeverity = (typeof CORRECTION_SEVERITIES)[number];

export interface Correction {
  id: string;
  date: string; // ISO date the correction was made
  location: string; // where the original claim was published, e.g. "/ground-reality #05"
  originalClaim: string;
  correctedClaim: string;
  reason: string;
  source: string;
  severity: CorrectionSeverity;
}

export const CORRECTIONS: Correction[] = [];
