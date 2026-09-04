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
 *
 * `sourceClass` is a SEPARATE, orthogonal dimension from `status`. A source
 * can be status UNVERIFIED but sourceClass PRIMARY_OFFICIAL (an official
 * circular a maintainer just hasn't checked line-by-line yet); it can never
 * be the other way around in a way that lets the app treat it as authority
 * it isn't — see `canIndependentlyVerify`. This is the enforcement point for
 * "a union circular, blog or news story must never silently become official
 * authority": VERIFIED status alone is not enough to produce a VERIFIED
 * answer — the source's class must also be one that can independently
 * establish an official rule.
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

export const SOURCE_CLASSES = [
  'PRIMARY_OFFICIAL',
  'PRIMARY_JUDICIAL',
  'PARLIAMENTARY_OFFICIAL',
  'SECONDARY_REPUTABLE',
  'NEWS_REPORT',
  'UNION_OR_ASSOCIATION',
  'UNVERIFIED_WEB',
  'DEMO',
] as const;
export type SourceClass = (typeof SOURCE_CLASSES)[number];

/** Human-readable label for UI. */
export const SOURCE_CLASS_LABELS: Record<SourceClass, string> = {
  PRIMARY_OFFICIAL: 'Primary official document',
  PRIMARY_JUDICIAL: 'Primary judicial record',
  PARLIAMENTARY_OFFICIAL: 'Parliamentary / statutory record',
  SECONDARY_REPUTABLE: 'Secondary — reputable summary',
  NEWS_REPORT: 'News report',
  UNION_OR_ASSOCIATION: 'Union / association material',
  UNVERIFIED_WEB: 'Unverified web source',
  DEMO: 'Demo (synthetic)',
};

/**
 * Only these classes may INDEPENDENTLY establish an official rule answer as
 * VERIFIED. A union circular, a news report, a secondary summary or demo
 * content can be perfectly genuine and still never — on its own — produce a
 * VERIFIED classification. This is checked by `assessRetrieval` in
 * `lib/sources/registry.ts`, not left to be remembered at every call site.
 */
export const INDEPENDENTLY_VERIFIABLE_CLASSES: readonly SourceClass[] = [
  'PRIMARY_OFFICIAL',
  'PRIMARY_JUDICIAL',
  'PARLIAMENTARY_OFFICIAL',
];

export function canIndependentlyVerify(sourceClass: SourceClass): boolean {
  return INDEPENDENTLY_VERIFIABLE_CLASSES.includes(sourceClass);
}

export interface SourceRecord {
  id: string;
  title: string;
  authority: string;
  documentType: DocumentType;
  /** Instrument/circular/order/gazette number as printed on the document. Null if not yet recorded — never fabricated. */
  documentNumber: string | null;
  /** Publication/issue date (ISO, may be year-only "2020"). Also referred to as "date issued". */
  date: string | null;
  /** Date the instrument takes effect, if different from `date`. */
  effectiveDate: string | null;
  /** Date this instrument was superseded or withdrawn, if known. Null = not known to be superseded. */
  supersededDate: string | null;
  sourceUrl: string | null;
  localPath: string | null;
  sha256: string | null;
  pageCount: number | null;
  /** Known section/heading labels within the document, for citation anchors. */
  sections: string[];
  status: SourceStatus;
  /**
   * Editorially assigned when the source is added — never inferred silently
   * at render/answer time. See `canIndependentlyVerify`. Use
   * `suggestSourceClass` (lib/sources/trust.ts) only as a sanity check on a
   * declared value, never as the value itself.
   */
  sourceClass: SourceClass;
  /** ISO timestamp a maintainer actually checked this against the primary document, if ever. */
  verifiedAt: string | null;
  /** How it was verified, e.g. "line-by-line against Gazette PDF, page 4". Required if verifiedAt is set. */
  verificationMethod: string | null;
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
