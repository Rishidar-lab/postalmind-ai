/**
 * Local case vault — IndexedDB schema.
 *
 * This is the durable store for a REAL workplace evidence case. It lives only
 * in the user's browser on their device. Nothing here is uploaded anywhere by
 * PostalMind; the user exports a backup bundle themselves (see
 * lib/storage/backup.ts).
 */

import type {
  AuditLogEntry,
  Case,
  EvidenceItem,
  EvidenceSource,
} from '@/lib/evidence/types';
import type { ManualTimelineEvent } from '@/lib/evidence/timeline';

export const DB_NAME = 'postalmind-vault';
/** Bump on any store/index change and add a migration in db.ts. */
export const DB_VERSION = 1;

export const STORES = {
  cases: 'cases',
  sources: 'sources',
  blobs: 'blobs',
  items: 'items',
  extras: 'extras',
  audit: 'audit',
  meta: 'meta',
} as const;

/** Per-case data that is neither a source nor an item. */
export interface CaseExtras {
  caseId: string;
  manualEvents: ManualTimelineEvent[];
  /** redaction maps keyed by sourceId: { token -> original } (workspace only). */
  redactionMaps: Record<string, Record<string, string>>;
  analystNotes: string;
  updatedAt: string;
}

/** The immutable original bytes of an imported source. */
export interface StoredBlob {
  id: string; // == sourceId
  caseId: string;
  sourceId: string;
  filename: string;
  mimeType: string;
  sha256: string;
  blob: Blob;
  storedAt: string;
}

export interface VaultCaseRecord extends Case {
  /** Local-only bookkeeping. */
  schemaVersion: number;
  savedAt: string;
}

/** Everything needed to render / export one case. */
export interface FullCase {
  case: VaultCaseRecord;
  sources: EvidenceSource[];
  items: EvidenceItem[];
  extras: CaseExtras;
  audit: AuditLogEntry[];
  blobs: StoredBlob[];
}

export const CURRENT_SCHEMA_VERSION = DB_VERSION;
