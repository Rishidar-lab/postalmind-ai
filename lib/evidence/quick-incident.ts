/**
 * QUICK INCIDENT — record one workplace communication in under 30 seconds.
 *
 * Mobile-first: only `excerpt` is required. Everything else defaults so the
 * form can be completed with a few taps. Classification runs LOCALLY via
 * `classifyMessage` (no network, no AI provider).
 *
 * Each incident stores exactly what the RC1 spec requires: timestamp, source,
 * speaker alias, speaker role, exact excerpt, context before/after, category,
 * evidence strength, what it supports, what it DOES NOT establish,
 * counter-evidence and notes.
 *
 * Speaker is always an ALIAS (e.g. "Supervising Official", "Subject Employee").
 * Never store real names or phone numbers in code or fixtures.
 */

import { classifyMessage } from './classify';
import type { EvidenceCategory, EvidenceItem, EvidenceStrength, SpeakerRole } from './types';

export const QUICK_INCIDENT_SOURCES = ['whatsapp', 'in-person', 'call', 'notice', 'other'] as const;
export type QuickIncidentSource = (typeof QUICK_INCIDENT_SOURCES)[number];

export interface QuickIncidentInput {
  /** Exact words observed (paste or type). Required. */
  excerpt: string;
  /** Alias only — never a real name. Defaults to "Unknown speaker". */
  speakerAlias?: string;
  speakerRole?: SpeakerRole;
  source?: QuickIncidentSource;
  /** ISO timestamp; defaults to now. */
  timestamp?: string | null;
  contextBefore?: string;
  contextAfter?: string;
  counterEvidence?: string;
  notes?: string;
}

export interface QuickIncident {
  id: string;
  timestamp: string;
  source: QuickIncidentSource;
  speakerAlias: string;
  speakerRole: SpeakerRole;
  exactExcerpt: string;
  contextBefore: string | null;
  contextAfter: string | null;
  category: EvidenceCategory[];
  evidenceStrength: EvidenceStrength;
  confidence: QuickIncidentConfidence;
  whatItSupports: string[];
  whatItDoesNotEstablish: string[];
  counterEvidence: string[];
  notes: string | null;
}

type QuickIncidentConfidence = 'LOW' | 'MODERATE' | 'HIGH';

function newId(): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `qi_${Date.now().toString(36)}_${rnd}`;
}

export function createQuickIncident(input: QuickIncidentInput): QuickIncident {
  const excerpt = (input.excerpt ?? '').trim();
  if (!excerpt) throw new Error('Provide the exact excerpt (what was said or written).');
  if (excerpt.length > 2000) throw new Error('Excerpt too long (max 2000 characters).');

  const analysis = classifyMessage({
    text: excerpt,
    timestamp: input.timestamp ?? new Date().toISOString(),
    speakerRole: input.speakerRole ?? 'UNKNOWN',
  });

  const counter: string[] = [];
  if (analysis.categories.includes('COUNTER_EVIDENCE')) counter.push('Same excerpt contains supportive/flexible content.');
  if (input.counterEvidence?.trim()) counter.push(input.counterEvidence.trim());

  return {
    id: newId(),
    timestamp: input.timestamp ?? new Date().toISOString(),
    source: input.source ?? 'whatsapp',
    speakerAlias: (input.speakerAlias ?? '').trim() || 'Unknown speaker',
    speakerRole: input.speakerRole ?? 'UNKNOWN',
    exactExcerpt: excerpt,
    contextBefore: input.contextBefore?.trim() ? input.contextBefore.trim().slice(0, 500) : null,
    contextAfter: input.contextAfter?.trim() ? input.contextAfter.trim().slice(0, 500) : null,
    category: analysis.categories,
    evidenceStrength: analysis.strength,
    confidence: analysis.confidence,
    whatItSupports: analysis.supports,
    whatItDoesNotEstablish: analysis.doesNotEstablish,
    counterEvidence: counter,
    notes: input.notes?.trim() ? input.notes.trim().slice(0, 1000) : null,
  };
}

/** Map a Quick Incident to an EvidenceItem so it can join a case timeline. */
export function quickIncidentToItem(
  qi: QuickIncident,
  opts: { caseId: string; sourceId: string },
): EvidenceItem {
  return {
    id: qi.id,
    caseId: opts.caseId,
    sourceId: opts.sourceId,
    timestamp: qi.timestamp,
    speakerLabel: qi.speakerAlias,
    speakerRole: qi.speakerRole,
    rawExcerpt: qi.exactExcerpt,
    normalizedExcerpt: qi.exactExcerpt.replace(/\s+/g, ' ').trim().slice(0, 500),
    category: qi.category,
    confidence: qi.confidence,
    evidenceStrength: qi.evidenceStrength,
    contextBefore: qi.contextBefore,
    contextAfter: qi.contextAfter,
    corroboration: [],
    counterEvidence: qi.counterEvidence,
    analystNotes: qi.notes,
    publicationSuitability: 'NOT_ASSESSED',
    redactionStatus: 'DERIVED',
    createdAt: new Date().toISOString(),
    analysis: {
      categories: qi.category,
      confidence: qi.confidence,
      strength: qi.evidenceStrength,
      reasons: ['Recorded via Quick Incident (local classification).'],
      supports: qi.whatItSupports,
      doesNotEstablish: qi.whatItDoesNotEstablish,
      signals: [],
    },
  };
}
