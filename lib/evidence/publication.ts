/**
 * Publication safety engine.
 *
 * Nothing becomes public automatically. Before any content can be exported as
 * PUBLIC, it must pass this check. The check WARNS or BLOCKS; it never
 * silently allows. See docs/PUBLISHING-STANDARD.md.
 */

import { detectPII, summarizePII, type PIIMatch } from './pii';
import { hasResidualLongDigits } from './redaction';
import type { EvidenceCategory } from './types';

export interface PublicationInput {
  /** The exact text that would be published (already redacted). */
  text: string;
  /** Categories asserted about this content. */
  categories?: EvidenceCategory[];
  /** Does the analyst assert a factual claim about a *named* person? */
  namesIndividuals?: boolean;
  /** Are those names necessary to the public-interest point? */
  namesAreNecessary?: boolean;
  /** Has counter-evidence been recorded/considered for this content? */
  counterEvidenceConsidered?: boolean;
  /** Is surrounding context retained (not a stripped one-liner)? */
  contextRetained?: boolean;
  /** Is at least one source cited for factual claims? */
  sourceCited?: boolean;
  /** Does the text state or imply a legal/criminal conclusion? */
  assertsLegalConclusion?: boolean;
  /** Is that legal conclusion backed by an authoritative finding (court/tribunal/official order)? */
  legalConclusionIsAuthoritative?: boolean;
}

export type CheckResult = 'PASS' | 'WARN' | 'BLOCK';

export interface PublicationCheckItem {
  id: string;
  question: string;
  result: CheckResult;
  detail: string;
}

export interface PublicationReport {
  verdict: CheckResult;
  canExport: boolean;
  items: PublicationCheckItem[];
  pii: {
    matches: PIIMatch[];
    summary: ReturnType<typeof summarizePII>;
  };
  /** Short reasons the verdict is not PASS. */
  blockers: string[];
  warnings: string[];
}

const DEFAMATION_SENSITIVE_CATEGORIES: EvidenceCategory[] = [
  'EXPLICIT_THREAT',
  'ABUSIVE_LANGUAGE',
  'RETALIATION_REFERENCE',
  'PUBLIC_SHAMING',
  'FINANCIAL_PRESSURE',
];

export function publicationSafetyCheck(input: PublicationInput): PublicationReport {
  const items: PublicationCheckItem[] = [];
  const matches = detectPII(input.text);
  const summary = summarizePII(matches);

  const push = (id: string, question: string, result: CheckResult, detail: string) =>
    items.push({ id, question, result, detail });

  // 1–6: direct PII.
  const piiByType = summary.byType;
  const blockingPii = (t: string) => (piiByType as Record<string, number>)[t] ?? 0;

  push(
    'phone',
    'Phone numbers removed?',
    blockingPii('PHONE') > 0 ? 'BLOCK' : 'PASS',
    blockingPii('PHONE') > 0 ? `${blockingPii('PHONE')} phone number(s) still present.` : 'No phone numbers detected.',
  );
  push(
    'email',
    'Email addresses removed?',
    blockingPii('EMAIL') > 0 ? 'BLOCK' : 'PASS',
    blockingPii('EMAIL') > 0 ? `${blockingPii('EMAIL')} email(s) still present.` : 'No emails detected.',
  );
  push(
    'account',
    'Account numbers / customer identifiers removed?',
    blockingPii('ACCOUNT_NUMBER') > 0 || blockingPii('AADHAAR') > 0 || blockingPii('PAN') > 0 || blockingPii('IFSC') > 0
      ? 'BLOCK'
      : hasResidualLongDigits(input.text)
        ? 'WARN'
        : 'PASS',
    blockingPii('ACCOUNT_NUMBER') + blockingPii('AADHAAR') + blockingPii('PAN') + blockingPii('IFSC') > 0
      ? 'Financial / identity numbers still present.'
      : hasResidualLongDigits(input.text)
        ? 'A long digit run survived redaction — check it is not an identifier.'
        : 'No account/identity numbers detected.',
  );
  push(
    'facility',
    'Branch / facility identifiers removed?',
    blockingPii('FACILITY_ID') > 0 ? 'BLOCK' : 'PASS',
    blockingPii('FACILITY_ID') > 0
      ? 'A post-office facility ID is still present — this can identify individuals.'
      : 'No facility IDs detected.',
  );
  push(
    'employee',
    'Uninvolved employee IDs removed?',
    blockingPii('EMPLOYEE_ID') > 0 ? 'BLOCK' : 'PASS',
    blockingPii('EMPLOYEE_ID') > 0 ? 'A possible employee ID is still present.' : 'No employee IDs detected.',
  );
  push(
    'names',
    'Uninvolved third-party names removed?',
    blockingPii('POSSIBLE_NAME') > 0 ? 'WARN' : 'PASS',
    blockingPii('POSSIBLE_NAME') > 0
      ? `${blockingPii('POSSIBLE_NAME')} possible third-party name(s) detected — confirm each is involved or redact.`
      : 'No obvious uninvolved names detected.',
  );

  // 7: context retained.
  push(
    'context',
    'Context retained (not a stripped one-liner)?',
    input.contextRetained === false ? 'WARN' : input.text.trim().length < 40 ? 'WARN' : 'PASS',
    input.contextRetained === false
      ? 'Analyst marked context as NOT retained.'
      : input.text.trim().length < 40
        ? 'The text is very short — a decontextualised quote can mislead.'
        : 'Context appears retained.',
  );

  // 8: claims supported / source cited.
  push(
    'source',
    'Sources retained for factual claims?',
    input.sourceCited === false ? 'BLOCK' : input.sourceCited === undefined ? 'WARN' : 'PASS',
    input.sourceCited === false
      ? 'A factual claim is made with no source cited.'
      : input.sourceCited === undefined
        ? 'Source citation not confirmed.'
        : 'At least one source is cited.',
  );

  // 9: counter-evidence considered.
  push(
    'counter',
    'Counter-evidence considered?',
    input.counterEvidenceConsidered === true ? 'PASS' : 'WARN',
    input.counterEvidenceConsidered === true
      ? 'Analyst confirmed counter-evidence was considered.'
      : 'Counter-evidence not confirmed as considered.',
  );

  // 10: legal conclusion.
  const legalIssue =
    input.assertsLegalConclusion === true && input.legalConclusionIsAuthoritative !== true;
  push(
    'legal',
    'Legal / criminal conclusions avoided unless authoritative?',
    legalIssue ? 'BLOCK' : 'PASS',
    legalIssue
      ? 'The text asserts a legal or criminal conclusion that is not backed by a court/tribunal/official finding. Use qualified language ("alleged", "reportedly", "not judicially established").'
      : 'No unsupported legal conclusion detected.',
  );

  // 11: names necessity.
  const nameNecessity =
    input.namesIndividuals === true && input.namesAreNecessary !== true;
  push(
    'name-necessity',
    'Naming individuals is necessary to the point?',
    nameNecessity ? 'WARN' : 'PASS',
    nameNecessity
      ? 'An individual is named but naming was not marked as necessary. Prefer role labels ("the Mail Overseer") unless the name is essential.'
      : 'Naming is either absent or marked necessary.',
  );

  // 12: defamation-sensitive category with weak backing.
  const sensitiveCat = (input.categories ?? []).some((c) => DEFAMATION_SENSITIVE_CATEGORIES.includes(c));
  const weaklyBacked = input.sourceCited !== true || input.counterEvidenceConsidered !== true;
  push(
    'defamation',
    'Potentially defamatory claim is evidence-backed?',
    sensitiveCat && weaklyBacked && input.namesIndividuals === true ? 'BLOCK' : sensitiveCat && weaklyBacked ? 'WARN' : 'PASS',
    sensitiveCat && weaklyBacked
      ? 'This content is in a defamation-sensitive category and is not fully backed (source + counter-evidence). ' +
        (input.namesIndividuals ? 'Because an individual is named, export is blocked.' : 'Strengthen backing before publishing.')
      : 'Not applicable or adequately backed.',
  );

  const blockers = items.filter((i) => i.result === 'BLOCK').map((i) => `${i.question} — ${i.detail}`);
  const warnings = items.filter((i) => i.result === 'WARN').map((i) => `${i.question} — ${i.detail}`);
  const verdict: CheckResult = blockers.length ? 'BLOCK' : warnings.length ? 'WARN' : 'PASS';

  return {
    verdict,
    canExport: verdict !== 'BLOCK',
    items,
    pii: { matches, summary },
    blockers,
    warnings,
  };
}
