/**
 * PostalMind AI — evidence data model.
 *
 * These types are the contract for the whole evidence subsystem. They are
 * deliberately plain (no ORM decorators) so the same shapes are used by the
 * in-memory demo store, a future Prisma/Postgres store, tests, and API
 * responses.
 *
 * Nothing in here makes a legal finding. Every classification is an
 * *evidence category*, not a conclusion about misconduct, harassment or
 * illegality. See docs/EVIDENCE-MODEL.md.
 */

// ---------------------------------------------------------------------------
// Enums (kept as string unions + const arrays so we can iterate them in UI)
// ---------------------------------------------------------------------------

export const EVIDENCE_CATEGORIES = [
  'ADMINISTRATIVE_INSTRUCTION',
  'TARGET_INSTRUCTION',
  'PERFORMANCE_EXPECTATION',
  'REPEATED_TARGET_PRESSURE',
  'PEER_COMPARISON',
  'PUBLIC_NAMING',
  'PUBLIC_SHAMING',
  'AFTER_HOURS_COMMUNICATION',
  'INSPECTION_REFERENCE',
  'LEAVE_RELATED_PRESSURE',
  'THREAT_LIKE_LANGUAGE',
  'EXPLICIT_THREAT',
  'RETALIATION_REFERENCE',
  'ABUSIVE_LANGUAGE',
  'WORKLOAD_REFERENCE',
  'FINANCIAL_PRESSURE',
  'NEUTRAL',
  'COUNTER_EVIDENCE',
  'INSUFFICIENT_CONTEXT',
] as const;
export type EvidenceCategory = (typeof EVIDENCE_CATEGORIES)[number];

/** Human-readable label + one-line description for each category. */
export const CATEGORY_META: Record<
  EvidenceCategory,
  { label: string; description: string; neutralByDefault: boolean }
> = {
  ADMINISTRATIVE_INSTRUCTION: {
    label: 'Administrative instruction',
    description: 'A routine work instruction within a supervisor’s normal authority.',
    neutralByDefault: true,
  },
  TARGET_INSTRUCTION: {
    label: 'Target instruction',
    description: 'Communication of a business/product target or quota. Not misconduct by itself.',
    neutralByDefault: true,
  },
  PERFORMANCE_EXPECTATION: {
    label: 'Performance expectation',
    description: 'A statement of expected output or standard. Not misconduct by itself.',
    neutralByDefault: true,
  },
  REPEATED_TARGET_PRESSURE: {
    label: 'Repeated target pressure',
    description: 'The same individual performance demand pressed multiple times in a short window.',
    neutralByDefault: false,
  },
  PEER_COMPARISON: {
    label: 'Peer comparison',
    description: 'One employee’s performance compared to named or identifiable colleagues.',
    neutralByDefault: false,
  },
  PUBLIC_NAMING: {
    label: 'Public naming',
    description: 'An individual singled out by name in a group channel.',
    neutralByDefault: false,
  },
  PUBLIC_SHAMING: {
    label: 'Public shaming',
    description: 'An individual named in a group channel with disparaging or humiliating framing.',
    neutralByDefault: false,
  },
  AFTER_HOURS_COMMUNICATION: {
    label: 'After-hours communication',
    description: 'Work demand sent outside the employee’s working hours. A time fact, not misconduct by itself.',
    neutralByDefault: true,
  },
  INSPECTION_REFERENCE: {
    label: 'Inspection reference',
    description: 'Mention of an inspection, visit or audit. Not a threat by itself.',
    neutralByDefault: true,
  },
  LEAVE_RELATED_PRESSURE: {
    label: 'Leave-related pressure',
    description: 'Pressure connected to applying for, taking, or returning from leave.',
    neutralByDefault: false,
  },
  THREAT_LIKE_LANGUAGE: {
    label: 'Threat-like language',
    description: 'Language a reasonable reader could take as implying an adverse consequence, without an explicit threat.',
    neutralByDefault: false,
  },
  EXPLICIT_THREAT: {
    label: 'Explicit threat',
    description: 'A stated intention to cause a specific adverse consequence.',
    neutralByDefault: false,
  },
  RETALIATION_REFERENCE: {
    label: 'Retaliation reference',
    description: 'A link drawn between an employee’s complaint/RTI/union activity and an adverse action.',
    neutralByDefault: false,
  },
  ABUSIVE_LANGUAGE: {
    label: 'Abusive language',
    description: 'Insulting, degrading or abusive terms directed at a person.',
    neutralByDefault: false,
  },
  WORKLOAD_REFERENCE: {
    label: 'Workload reference',
    description: 'A statement about volume of work, hours, or staffing. Context for other categories.',
    neutralByDefault: true,
  },
  FINANCIAL_PRESSURE: {
    label: 'Financial pressure',
    description: 'Pressure involving pay, allowances, recovery, or personal money to meet a target.',
    neutralByDefault: false,
  },
  NEUTRAL: {
    label: 'Neutral communication',
    description: 'Ordinary communication with no pressure indicators.',
    neutralByDefault: true,
  },
  COUNTER_EVIDENCE: {
    label: 'Counter-evidence',
    description: 'Content that weakens or contradicts a pressure/harassment reading (e.g. supportive, flexible, apologetic).',
    neutralByDefault: true,
  },
  INSUFFICIENT_CONTEXT: {
    label: 'Insufficient context',
    description: 'Not enough surrounding information to categorise reliably.',
    neutralByDefault: true,
  },
};

export const EVIDENCE_STRENGTHS = ['INSUFFICIENT', 'WEAK', 'MODERATE', 'STRONG'] as const;
export type EvidenceStrength = (typeof EVIDENCE_STRENGTHS)[number];

export const CONFIDENCE_LEVELS = ['LOW', 'MODERATE', 'HIGH'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const EVIDENCE_SOURCE_TYPES = [
  'WHATSAPP_TEXT',
  'SCREENSHOT',
  'IMAGE',
  'PDF',
  'TEXT',
  'NOTE',
] as const;
export type EvidenceSourceType = (typeof EVIDENCE_SOURCE_TYPES)[number];

export const REDACTION_STATES = ['ORIGINAL', 'DERIVED', 'REDACTED', 'PUBLIC'] as const;
export type RedactionState = (typeof REDACTION_STATES)[number];

export const PUBLICATION_SUITABILITY = [
  'NOT_ASSESSED',
  'INTERNAL_ONLY',
  'NEEDS_REDACTION',
  'PUBLISHABLE_WITH_REDACTION',
  'PUBLISHABLE',
] as const;
export type PublicationSuitability = (typeof PUBLICATION_SUITABILITY)[number];

export const CASE_STATUSES = ['DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'ARCHIVED'] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CONFIDENTIALITY_LEVELS = ['STANDARD', 'SENSITIVE', 'HIGH'] as const;
export type ConfidentialityLevel = (typeof CONFIDENTIALITY_LEVELS)[number];

export const SPEAKER_ROLES = [
  'SUPERVISORY',
  'PEER',
  'SUBJECT_EMPLOYEE',
  'CUSTOMER',
  'SYSTEM',
  'UNKNOWN',
] as const;
export type SpeakerRole = (typeof SPEAKER_ROLES)[number];

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface Case {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  status: CaseStatus;
  sourceCount: number;
  evidenceItemCount: number;
  confidentialityLevel: ConfidentialityLevel;
  /** ISO date of the central event this case is built around, if any. */
  eventDate: string | null;
  tags: string[];
  /** true when the case ships as demo/synthetic content. */
  isDemo: boolean;
}

export interface EvidenceSource {
  id: string;
  caseId: string;
  type: EvidenceSourceType;
  originalFilename: string;
  mimeType: string;
  /** SHA-256 hex of the exact bytes that were imported. */
  sha256: string;
  byteLength: number;
  uploadedAt: string;
  /** Where the immutable original is (or would be) stored. */
  originalStoredPath: string | null;
  derivedStoredPath: string | null;
  redactedStoredPath: string | null;
  isOriginalImmutable: boolean;
  metadata: Record<string, unknown>;
}

export interface EvidenceItem {
  id: string;
  caseId: string;
  sourceId: string;
  /** ISO timestamp of the underlying message/event, if known. */
  timestamp: string | null;
  speakerLabel: string | null;
  speakerRole: SpeakerRole;
  rawExcerpt: string;
  /** Normalised (whitespace-collapsed, control-stripped) version of rawExcerpt. */
  normalizedExcerpt: string;
  category: EvidenceCategory[];
  confidence: ConfidenceLevel;
  evidenceStrength: EvidenceStrength;
  contextBefore: string | null;
  contextAfter: string | null;
  corroboration: string[];
  counterEvidence: string[];
  analystNotes: string | null;
  publicationSuitability: PublicationSuitability;
  redactionStatus: RedactionState;
  createdAt: string;
  /** Machine explanation of the classification (not shown as legal advice). */
  analysis: EvidenceAnalysis;
}

/** Output of the classification engine for one excerpt. */
export interface EvidenceAnalysis {
  categories: EvidenceCategory[];
  confidence: ConfidenceLevel;
  strength: EvidenceStrength;
  /** Short, plain-language reasons the categories were assigned. */
  reasons: string[];
  /** What this excerpt, on its own, does support. */
  supports: string[];
  /** What this excerpt, on its own, does NOT establish. Always populated. */
  doesNotEstablish: string[];
  /** Signals detected in the text, for transparency/debugging. */
  signals: string[];
}

export const AUDIT_ACTIONS = [
  'SOURCE_IMPORTED',
  'HASH_CALCULATED',
  'ANALYSIS_CREATED',
  'MANUAL_CORRECTION',
  'REDACTION_MADE',
  'PUBLICATION_EXPORT_GENERATED',
  'CASE_CREATED',
  'CASE_UPDATED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditLogEntry {
  id: string;
  caseId: string | null;
  action: AuditAction;
  at: string;
  /** Non-sensitive summary — never the evidence content itself. */
  summary: string;
  /** Optional structured detail (hashes, counts) — no PII. */
  detail?: Record<string, unknown>;
}
