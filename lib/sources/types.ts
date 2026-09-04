/**
 * Source library model.
 *
 * A SourceRecord is metadata about an authoritative document (a circular, a
 * rule notification, an order, a judgment). The document itself lives at
 * `sourceUrl` (and optionally a local mirror at `localPath`). A CorpusPassage
 * is a specific, quotable chunk extracted from a source, used for retrieval.
 *
 * `status` is deliberately conservative:
 *   VERIFIED   — a maintainer has checked the passage against the primary document
 *   UNVERIFIED — project summary, not yet checked against the primary document
 *   DEMO       — illustrative placeholder content, not for real reliance
 */

export const DOCUMENT_TYPES = [
  'RULE',
  'CIRCULAR',
  'DIRECTORATE_ORDER',
  'OFFICE_MEMORANDUM',
  'TRCA_ORDER',
  'LEAVE_INSTRUCTION',
  'FINANCIAL_PRODUCT_DOC',
  'RTI_RESPONSE',
  'PARLIAMENT_REPLY',
  'JUDGMENT',
  'GAZETTE_NOTIFICATION',
  'GUIDANCE_NOTE',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const SOURCE_STATUSES = ['VERIFIED', 'UNVERIFIED', 'DEMO'] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

export interface SourceRecord {
  id: string;
  title: string;
  authority: string;
  documentType: DocumentType;
  /** Publication date (ISO, may be year-only "2020"). */
  date: string | null;
  /** Date the instrument takes effect, if different. */
  effectiveDate: string | null;
  sourceUrl: string | null;
  localPath: string | null;
  sha256: string | null;
  pageCount: number | null;
  status: SourceStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  /** One-line description of what the document covers. */
  summary: string;
}

export interface CorpusPassage {
  id: string;
  sourceId: string;
  /** Heading / section label as it appears in the document, if known. */
  section: string | null;
  page: number | null;
  /** The passage text. For UNVERIFIED entries this is a project summary. */
  text: string;
  status: SourceStatus;
  tags: string[];
  /** Keywords to weight retrieval. */
  keywords: string[];
}

export interface RetrievedPassage extends CorpusPassage {
  source: SourceRecord;
  /** 0..1 lexical relevance score for the query. */
  score: number;
  matchedTerms: string[];
}
