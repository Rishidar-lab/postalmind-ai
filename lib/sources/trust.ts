/**
 * Source trust classes (analyst-facing) mapped onto the stored `status`.
 *
 * Stored status is conservative and mechanical:
 *   VERIFIED   — maintainer checked the passage line-by-line against the
 *                primary document AND recorded localPath + sha256
 *   UNVERIFIED — project summary, not yet checked
 *   DEMO       — synthetic, never for reliance
 *
 * Trust classes describe the *kind* of authority for UI filtering. A trust
 * class NEVER upgrades a passage: only status VERIFIED (with a recorded hash)
 * may be cited as verified, and this module enforces that.
 */

import type { SourceRecord } from './types';

export const TRUST_CLASSES = [
  'PRIMARY_OFFICIAL',
  'PRIMARY_JUDICIAL',
  'SECONDARY_REPUTABLE',
  'UNION_OR_ASSOCIATION',
  'NEWS_REPORT',
  'UNVERIFIED_WEB',
] as const;
export type TrustClass = (typeof TRUST_CLASSES)[number];

const OFFICIAL_RE = /department of posts|ministry of|government of india|gazette|parliament|supreme court|high court|tribunal|information commission/i;
const COURT_RE = /supreme court|high court|\btribunal\b|judgment|\bcourt\b/i;
const UNION_RE = /\bunion\b|\bassociation\b|\bfederation\b|staff side/i;
const NEWS_RE = /\btimes\b|\bhindu\b|\bexpress\b|\bnews\b|\bpress\b|\bmedia\b|\breporter\b/i;

/** Heuristic trust class from authority + document type. Never implies verification. */
export function trustOf(source: SourceRecord): TrustClass {
  if (source.status === 'DEMO') return 'UNVERIFIED_WEB';
  const a = `${source.authority} ${source.title}`;
  if (COURT_RE.test(a) || source.documentType === 'JUDGMENT') return 'PRIMARY_JUDICIAL';
  if (OFFICIAL_RE.test(a)) return 'PRIMARY_OFFICIAL';
  if (UNION_RE.test(a)) return 'UNION_OR_ASSOCIATION';
  if (NEWS_RE.test(a)) return 'NEWS_REPORT';
  return 'SECONDARY_REPUTABLE';
}

/**
 * Genuine verification: status VERIFIED requires a recorded mirror hash.
 * Returns violations (empty = corpus is honest).
 */
export function verificationViolations(sources: SourceRecord[]): string[] {
  const out: string[] = [];
  for (const s of sources) {
    if (s.status === 'VERIFIED' && (!s.sha256 || !s.localPath)) {
      out.push(`${s.id}: marked VERIFIED without a recorded primary-document mirror (localPath + sha256).`);
    }
    if (s.status === 'DEMO' && trustOf(s) !== 'UNVERIFIED_WEB') {
      out.push(`${s.id}: DEMO content must stay UNVERIFIED_WEB trust.`);
    }
  }
  return out;
}
