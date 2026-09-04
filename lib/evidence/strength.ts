/**
 * Evidence-strength assessment.
 *
 * Produces one of INSUFFICIENT / WEAK / MODERATE / STRONG for a single
 * evidence item, in the context of its case. There is NO numeric
 * "harassment score" exposed anywhere — the bucket plus a written explanation
 * of the factors is the output. The internal points are only a bucketing aid
 * and are never shown as a metric.
 */

import type {
  EvidenceAnalysis,
  EvidenceItem,
  EvidenceStrength,
  SpeakerRole,
} from './types';

export interface StrengthContext {
  /** How many other items in the case share at least one category with this one. */
  corroboratingItems?: number;
  /** How many independent documentary sources back this item (orders, registers…). */
  independentDocuments?: number;
  /** Was the timestamp parseable and consistent with the case window? */
  timeConsistent?: boolean;
  /** Is the speaker role established (not UNKNOWN)? */
  speakerRole?: SpeakerRole;
  /** Repetition count already established for this thread/window. */
  repetitionCount?: number;
}

export interface StrengthAssessment {
  strength: EvidenceStrength;
  /** Plain-language factors that pushed the rating up or down. */
  factors: Array<{ factor: string; effect: 'raises' | 'lowers' | 'neutral'; note: string }>;
  explanation: string;
}

const DIRECT_CATEGORIES = new Set(['EXPLICIT_THREAT', 'ABUSIVE_LANGUAGE', 'RETALIATION_REFERENCE', 'FINANCIAL_PRESSURE']);
const SUGGESTIVE_CATEGORIES = new Set(['THREAT_LIKE_LANGUAGE', 'INSPECTION_REFERENCE', 'PEER_COMPARISON']);

export function assessStrength(
  analysis: Pick<EvidenceAnalysis, 'categories' | 'confidence' | 'signals'>,
  ctx: StrengthContext = {},
): StrengthAssessment {
  const factors: StrengthAssessment['factors'] = [];
  let points = 0;

  // 1. Is there any substantive category at all?
  const substantive = analysis.categories.filter(
    (c) => c !== 'NEUTRAL' && c !== 'INSUFFICIENT_CONTEXT' && c !== 'COUNTER_EVIDENCE',
  );
  if (substantive.length === 0) {
    return {
      strength: analysis.categories.includes('INSUFFICIENT_CONTEXT') ? 'INSUFFICIENT' : 'WEAK',
      factors: [
        {
          factor: 'Substantive content',
          effect: 'lowers',
          note: 'No pressure/instruction category was assigned with confidence.',
        },
      ],
      explanation:
        'This excerpt does not carry a substantive evidence category on its own, so its strength is low. It may still matter as context or corroboration for other items.',
    };
  }

  // 2. Directness of language.
  if (substantive.some((c) => DIRECT_CATEGORIES.has(c))) {
    points += 2;
    factors.push({
      factor: 'Directness',
      effect: 'raises',
      note: 'The language is explicit rather than implied.',
    });
  } else if (substantive.some((c) => SUGGESTIVE_CATEGORIES.has(c))) {
    points += 0;
    factors.push({
      factor: 'Directness',
      effect: 'neutral',
      note: 'The language is suggestive; reasonable readers may interpret it differently.',
    });
  } else {
    points += 1;
  }

  // 3. Confidence of the classification.
  if (analysis.confidence === 'HIGH') {
    points += 2;
    factors.push({ factor: 'Classification confidence', effect: 'raises', note: 'Multiple strong signals in the text.' });
  } else if (analysis.confidence === 'MODERATE') {
    points += 1;
    factors.push({ factor: 'Classification confidence', effect: 'neutral', note: 'Some signals, not decisive.' });
  } else {
    factors.push({ factor: 'Classification confidence', effect: 'lowers', note: 'Few or weak signals in the text.' });
  }

  // 4. Repetition.
  const rep = ctx.repetitionCount ?? 0;
  if (rep >= 3) {
    points += 2;
    factors.push({ factor: 'Repetition', effect: 'raises', note: `The demand recurs ${rep} times in the window.` });
  } else if (rep === 2) {
    points += 1;
    factors.push({ factor: 'Repetition', effect: 'raises', note: 'The demand recurs twice in the window.' });
  } else {
    factors.push({ factor: 'Repetition', effect: 'neutral', note: 'Treated as a single instance.' });
  }

  // 5. Corroboration by other items.
  const corr = ctx.corroboratingItems ?? 0;
  if (corr >= 2) {
    points += 2;
    factors.push({ factor: 'Corroboration', effect: 'raises', note: `${corr} other items in the case point the same way.` });
  } else if (corr === 1) {
    points += 1;
    factors.push({ factor: 'Corroboration', effect: 'raises', note: 'One other item points the same way.' });
  } else {
    factors.push({ factor: 'Corroboration', effect: 'lowers', note: 'No other item corroborates this yet.' });
  }

  // 6. Independent documents.
  const docs = ctx.independentDocuments ?? 0;
  if (docs >= 1) {
    points += 2;
    factors.push({
      factor: 'Independent documents',
      effect: 'raises',
      note: `${docs} documentary source(s) (orders, registers, targets sheet) support this.`,
    });
  } else {
    factors.push({ factor: 'Independent documents', effect: 'neutral', note: 'No independent document attached.' });
  }

  // 7. Speaker role.
  if (ctx.speakerRole === 'SUPERVISORY') {
    points += 1;
    factors.push({ factor: 'Speaker role', effect: 'raises', note: 'The speaker is in a supervisory position over the employee.' });
  } else if (!ctx.speakerRole || ctx.speakerRole === 'UNKNOWN') {
    factors.push({ factor: 'Speaker role', effect: 'lowers', note: 'The speaker’s role is not established.' });
  } else {
    factors.push({ factor: 'Speaker role', effect: 'neutral', note: `Speaker role: ${ctx.speakerRole}.` });
  }

  // 8. Time consistency.
  if (ctx.timeConsistent === true) {
    points += 1;
    factors.push({ factor: 'Time consistency', effect: 'raises', note: 'Timestamp parsed and fits the case window.' });
  } else if (ctx.timeConsistent === false) {
    points -= 1;
    factors.push({ factor: 'Time consistency', effect: 'lowers', note: 'Timestamp missing or inconsistent.' });
  }

  // 9. Counter-evidence in the same excerpt.
  if (analysis.categories.includes('COUNTER_EVIDENCE')) {
    points -= 2;
    factors.push({
      factor: 'Counter-evidence',
      effect: 'lowers',
      note: 'The same excerpt also contains supportive/conciliatory content.',
    });
  }

  let strength: EvidenceStrength =
    points >= 8 ? 'STRONG' : points >= 5 ? 'MODERATE' : points >= 2 ? 'WEAK' : 'INSUFFICIENT';

  // A single item is never STRONG on message content alone. STRONG requires at
  // least one independent documentary source (order, register, targets sheet,
  // official alert) so the finding does not rest on one custodian's export.
  if (strength === 'STRONG' && docs < 1) {
    strength = 'MODERATE';
    factors.push({
      factor: 'Single-source cap',
      effect: 'lowers',
      note: 'Capped at MODERATE: no independent document corroborates this item, so it rests on one source.',
    });
  }

  const explanation = buildExplanation(strength, factors);
  return { strength, factors, explanation };
}

function buildExplanation(strength: EvidenceStrength, factors: StrengthAssessment['factors']): string {
  const raisers = factors.filter((f) => f.effect === 'raises').map((f) => f.factor.toLowerCase());
  const lowerers = factors.filter((f) => f.effect === 'lowers').map((f) => f.factor.toLowerCase());
  const parts: string[] = [];
  parts.push(`Rated ${strength}.`);
  if (raisers.length) parts.push(`Raised by: ${raisers.join(', ')}.`);
  if (lowerers.length) parts.push(`Limited by: ${lowerers.join(', ')}.`);
  parts.push(
    'Strength describes how well this item is supported as evidence — not whether any rule was broken.',
  );
  return parts.join(' ');
}

/** Roll a set of item assessments into a case-level summary (no score). */
export function caseStrengthSummary(items: Pick<EvidenceItem, 'evidenceStrength'>[]): {
  strongest: EvidenceStrength;
  distribution: Record<EvidenceStrength, number>;
} {
  const distribution: Record<EvidenceStrength, number> = {
    INSUFFICIENT: 0,
    WEAK: 0,
    MODERATE: 0,
    STRONG: 0,
  };
  for (const it of items) distribution[it.evidenceStrength]++;
  const order: EvidenceStrength[] = ['STRONG', 'MODERATE', 'WEAK', 'INSUFFICIENT'];
  const strongest = order.find((s) => distribution[s] > 0) ?? 'INSUFFICIENT';
  return { strongest, distribution };
}
