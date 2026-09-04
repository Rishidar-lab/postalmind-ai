/**
 * Corrections log.
 *
 * Every entry here documents a factual correction to something PostalMind AI
 * published — see docs/CORRECTIONS-POLICY.md. This array starts empty
 * because no correction has been needed yet. Add an entry when one is,
 * with all five fields filled in; never silently edit a published claim
 * without adding one here.
 */

export interface Correction {
  id: string;
  date: string; // ISO date the correction was made
  location: string; // where the original claim was published, e.g. "/ground-reality #05"
  originalClaim: string;
  correctedClaim: string;
  reason: string;
  source: string;
}

export const CORRECTIONS: Correction[] = [];
