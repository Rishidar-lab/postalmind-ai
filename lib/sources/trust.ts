/**
 * Source-class validation and enforcement.
 *
 * `sourceClass` is a field a maintainer sets explicitly on `SourceRecord`
 * (lib/sources/types.ts) — it is never inferred at answer time. This module
 * does two separate jobs, and they must not be confused:
 *
 *  - `suggestSourceClass` is a heuristic guess from authority/title text,
 *    used only to sanity-check a declared value in tests or an editor UI.
 *    It is NEVER the value the app trusts.
 *  - `verificationViolations` checks the actual stored data for the
 *    invariants that keep "VERIFIED" meaning something: a genuinely
 *    verified source needs a recorded mirror hash AND a source class that
 *    can independently establish an official rule AND a verifiedAt record.
 */

import { canIndependentlyVerify, type SourceClass, type SourceRecord } from './types';

const OFFICIAL_RE =
  /department of posts|ministry of|government of india|gazette|directorate|circular no|office memorandum/i;
const COURT_RE = /supreme court|high court|\btribunal\b|judgment|\bcourt\b/i;
const PARLIAMENT_RE = /\bparliament\b|\block sabha\b|\brajya sabha\b|\back,\s*\d{4}\b|parliament reply/i;
const UNION_RE = /\bunion\b|\bassociation\b|\bfederation\b|staff side/i;
const NEWS_RE = /\btimes\b|\bhindu\b|\bexpress\b|\bnews\b|\bpress\b|\bmedia\b|\breporter\b|\bblog\b/i;

/**
 * Heuristic suggestion from authority + title + document type. This is a
 * sanity check on a declared `sourceClass`, never the value itself — a real
 * source class is set deliberately when the source is added.
 */
export function suggestSourceClass(
  source: Pick<SourceRecord, 'authority' | 'title' | 'documentType' | 'status'>,
): SourceClass {
  if (source.status === 'DEMO') return 'DEMO';
  const a = `${source.authority} ${source.title}`;
  if (COURT_RE.test(a) || source.documentType === 'JUDGMENT') return 'PRIMARY_JUDICIAL';
  if (PARLIAMENT_RE.test(a) || source.documentType === 'PARLIAMENT_REPLY') return 'PARLIAMENTARY_OFFICIAL';
  if (OFFICIAL_RE.test(a)) return 'PRIMARY_OFFICIAL';
  if (UNION_RE.test(a)) return 'UNION_OR_ASSOCIATION';
  if (NEWS_RE.test(a)) return 'NEWS_REPORT';
  return 'SECONDARY_REPUTABLE';
}

/**
 * Genuine verification invariants. Returns violations (empty = the corpus is
 * honest). This is what actually gets enforced — `suggestSourceClass` above
 * is advisory only and is deliberately NOT part of this check, because a
 * correct manual classification can reasonably differ from a text heuristic
 * (e.g. a committee report is PRIMARY_OFFICIAL even though its title doesn't
 * contain any of the heuristic's trigger words).
 */
export function verificationViolations(sources: SourceRecord[]): string[] {
  const out: string[] = [];
  for (const s of sources) {
    if (s.status === 'VERIFIED') {
      if (!s.sha256 || !s.localPath) {
        out.push(`${s.id}: marked VERIFIED without a recorded primary-document mirror (localPath + sha256).`);
      }
      if (!canIndependentlyVerify(s.sourceClass)) {
        out.push(
          `${s.id}: marked VERIFIED but sourceClass ${s.sourceClass} cannot independently establish an official rule — only PRIMARY_OFFICIAL, PRIMARY_JUDICIAL or PARLIAMENTARY_OFFICIAL may.`,
        );
      }
      if (!s.verifiedAt) {
        out.push(`${s.id}: marked VERIFIED but has no verifiedAt timestamp recorded.`);
      }
    }
    if (s.verifiedAt && !s.verificationMethod) {
      out.push(`${s.id}: has verifiedAt but no verificationMethod recorded.`);
    }
    if (s.status === 'DEMO' && s.sourceClass !== 'DEMO') {
      out.push(`${s.id}: DEMO content must be declared sourceClass DEMO, not ${s.sourceClass}.`);
    }
    if (s.sourceClass === 'DEMO' && s.status !== 'DEMO') {
      out.push(`${s.id}: sourceClass DEMO must have status DEMO, not ${s.status}.`);
    }
  }
  return out;
}
