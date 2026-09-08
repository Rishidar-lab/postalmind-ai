/**
 * Verified claim gate + citation entitlement checks (deterministic).
 *
 * The model is only the LANGUAGE COMPOSER. After composition, every factual
 * sentence is parsed into a claim and checked against the cited passages:
 *
 *   - refs must exist (fabricated [Sn] → UNSUPPORTED)
 *   - load-bearing numbers / dates / rule & section identifiers / order
 *     numbers / authorities must occur in the cited text or source metadata
 *   - obligation wording (MUST/SHALL/entitled/prohibited/…) must not be
 *     stronger than what the cited passage states
 *
 * Unsupported claims are REMOVED or rewritten before display — never merely
 * warned about — when the final answer is classified VERIFIED.
 *
 * Retrieved document text is always treated as DATA, never as instructions:
 * these checks are pure token/entailment tests and can never "follow" an
 * instruction embedded in a passage.
 */

import type { RetrievedPassage } from '@/lib/sources/types';

export type ClaimSupport = 'DIRECT' | 'INFERENCE' | 'UNSUPPORTED';

export interface CheckedClaim {
  id: string;
  text: string;
  citationRefs: string[];
  support: ClaimSupport;
  reasons: string[];
}

export interface RefTarget {
  passage: RetrievedPassage;
  /** Source-level metadata, for identifier/date/page checks. */
  meta: {
    title: string;
    authority: string;
    date: string | null;
    documentNumber: string | null;
    page: number | null;
  };
}

// ---------------------------------------------------------------------------
// Sentence splitting (abbreviation-aware: "OM No.", "s.6", "w.e.f.", dates)
// ---------------------------------------------------------------------------

const PROTECTED = /(\b(?:No|no|s|OM|Dte|Shri|Smt|e\.g|vs|w\.e\.f)\.\s)|(\d)\.(\d)/g;

export function splitSentences(text: string): string[] {
  const masked = text
    .replace(PROTECTED, (_m, abbr?: string, d1?: string, d2?: string) =>
      abbr ? abbr.replace(/\.\s$/, '§§§') : `${d1}§§${d2}`,
    );
  return masked
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/§§§/g, '. ').replace(/§§/g, '.').trim())
    .filter((s) => s.length > 0);
}

// ---------------------------------------------------------------------------
// Number normalisation (digits ↔ English words, date leading zeros)
// ---------------------------------------------------------------------------

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS: Record<number, string> = { 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety' };

function numToWords(n: number): string[] {
  if (n < 20) return [ONES[n]];
  if (n < 100) {
    const t = Math.floor(n / 10) * 10;
    const o = n % 10;
    const base = TENS[t];
    // Exact forms only: bare "forty" must never stand in for 45, or a wrong
    // figure would pass against an unrelated number-word in the source.
    if (o === 0) return [base];
    return [`${base}-${ONES[o]}`, `${base} ${ONES[o]}`];
  }
  return [String(n)];
}

const MONTHS: Record<string, string> = {
  january: '1', february: '2', march: '3', april: '4', may: '5', june: '6',
  july: '7', august: '8', september: '9', october: '10', november: '11', december: '12',
};

/** Canonical form for support comparison: lowercased, dates flattened, leading zeros stripped. */
export function canonical(s: string): string {
  let t = ` ${s.toLowerCase()} `;
  for (const [name, num] of Object.entries(MONTHS)) t = t.replace(new RegExp(`\\b${name}\\b`, 'g'), ` ${num} `);
  t = t.replace(/\b0+(\d)/g, '$1'); // leading zeros: 01.07.2018 → 1.7.2018, 07 → 7
  t = t.replace(/[^a-z0-9.%₹/-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return t;
}

/**
 * Totally flat form for identifier/date/number comparison: dots and spaces
 * removed, so "w.e.f. 01.07.2018" ≡ "wef 1.7.2018" and "s.7" ≡ "s 7".
 * Used on BOTH sides of every containment check below.
 */
export function flat(s: string): string {
  return canonical(s).replace(/[.\s]+/g, '');
}

/** All surface forms a number may take: digits + English words. */
function numberForms(raw: string): string[] {
  const forms = [raw.replace(/^0+(\d)/, '$1')];
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 0 && n < 100) forms.push(...numToWords(n));
  return [...new Set(forms)];
}

// ---------------------------------------------------------------------------
// Feature extraction
// ---------------------------------------------------------------------------

const WORD_NUMBERS: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7',
  eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12', thirteen: '13',
  fourteen: '14', fifteen: '15', sixteen: '16', seventeen: '17', eighteen: '18',
  nineteen: '19', twenty: '20', thirty: '30', forty: '40', fifty: '50',
  sixty: '60', seventy: '70', eighty: '80', ninety: '90', hundred: '100',
};

export interface ClaimFeatures {
  numbers: string[]; // digit runs incl. decimals
  wordNumbers: string[]; // English number-words, as digit strings
  qtyPairs: Array<{ digits: string; unit: string; raw: string }>;
  percents: string[];
  money: string[];
  ruleIds: string[];
  sectionIds: string[];
  orderIds: string[];
  dates: string[];
  authorities: string[];
  pages: string[];
  obligations: string[];
  factual: boolean;
}

const AUTHORITY_PHRASES = [
  'department of posts', 'ministry of finance', 'ministry of communications',
  'department of economic affairs', 'budget division', 'central information commission',
  'state information commission', 'government of india', 'national savings institute',
  'reserve bank of india', 'central/state public information officer',
  'central public information officer', 'state public information officer',
];

const OBLIGATION_RES = [
  /\bmust\b/i, /\bshall\b/i, /\brequired?\b/i, /\brequirement\b/i, /\bentitled?\b/i,
  /\bentitlement\b/i, /\bprohibit(?:ed|s|ion)?\b/i, /\bdeadline\b/i, /\bappeal lies\b/i,
  /\bgives? (?:a |him\/her )?right\b/i, /\bmay be granted\b/i, /\bshall be\b/i,
  /\bmust not\b/i, /\bshall not\b/i, /\bno .*encashment\b/i, /\bwithin\b.+\bday/i,
];

const DEONTIC_RES = [
  /\bshall\b/i, /\bmust\b/i, /\brequir/i, /\bentitl/i, /\bprohibit/i, /\blies\b/i,
  /\bgives?\b/i, /\bgrant/i, /\bmay be\b/i, /\bshall be\b/i, /\bprovided\b/i,
  /\bno .*encashment\b/i,
  // A deadline only mirrors when quantified ("within thirty days") — bare
  // "within" also matches prepositional uses ("within normal supervision").
  /\bwithin\b[^.]{0,40}\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|ninety)\b/i,
  /\bdeemed\b/i,
];

/** Sentences that look like factual assertions (share the heuristic with the legacy path). */
export function isFactualSentence(s: string): boolean {
  if (s.length < 40) return false;
  if (/^(here|this|in summary|note:|however|for example|e\.g\.|—)/i.test(s)) return false;
  if (OBLIGATION_RES.some((r) => r.test(s))) return true;
  if (/\b\d/.test(s)) return true; // any digit run (incl. word-numbers below)
  if (/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|ninety|hundred)\b/i.test(s)) return true;
  return /\b(is|are|provides?|allows?|rule|section|order|act)\b/i.test(s);
}

const NUMWORD_ALT =
  'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred';

const UNIT_SINGULAR: Record<string, string> = {
  days: 'day', day: 'day', hours: 'hour', hour: 'hour', months: 'month', month: 'month',
  years: 'year', year: 'year', weeks: 'week', week: 'week', minutes: 'minute', minute: 'minute',
};

/** Character spans of matches, for masking numbers already covered by a parent pattern. */
function spansOf(text: string, res: RegExp[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const re of res) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
    let m: RegExpExecArray | null;
    while ((m = g.exec(text)) !== null) out.push([m.index, m.index + m[0].length]);
  }
  return out;
}

function inSpans(pos: number, len: number, spans: Array<[number, number]>): boolean {
  return spans.some(([a, b]) => pos < b && pos + len > a);
}

const DATE_RES = [
  /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g,
  /\b\d{4}[./-]\d{1,2}[./-]\d{1,2}/g,
  /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)[,]?\s+\d{4}/gi,
];
const ORDER_RES = [
  /\bOM\s*no\.?\s*[\w/-]+/gi,
  /\bF\.?\s*no\.?\s*[\w/.-]+/gi,
  /\bSB Order\s*no\.?\s*[\w/-]+/gi,
  /\bDte\.?\s*OM\b[^.,;]*/gi,
];
const RULE_RES = [/\brule\s*\d+[a-z]*(?:[-–][a-z0-9]+)?/gi];
const SECTION_RES = [/\bsection\s*\d+[a-z]*/gi, /\bs\.?\s*\d+[a-z]*/gi];
const MONEY_RES = [/₹\s*[\d,]+(?:\.\d+)?\s*(?:lakh|lac|crore|thousand)?/gi];
const PERCENT_RES = [/\d+(?:\.\d+)?\s*%/g];

/** Mask date strings out of hay so a bare number can never "match" inside an unrelated date. */
export function maskDates(hay: string): string {
  let out = hay;
  for (const re of DATE_RES) {
    out = out.replace(new RegExp(re.source, 'gi'), (m) => {
      // Keep the year: "revised in 2018" IS established by "dated 25.06.2018".
      const y = m.match(/\d{4}/);
      return y ? ` ${y[0]} ` : ' ';
    });
  }
  return out;
}

export function extractFeatures(text: string): ClaimFeatures {
  const covered = spansOf(text, [...DATE_RES, ...ORDER_RES, ...RULE_RES, ...SECTION_RES, ...MONEY_RES, ...PERCENT_RES]);
  const numbers: string[] = [];
  for (const m of text.matchAll(/\d+(?:\.\d+)?/g)) {
    if (m.index === undefined) continue;
    if (inSpans(m.index, m[0].length, covered)) continue;
    // A digit run glued to ASCII letters (Q2, FY2026, S7-style codes) is an
    // opaque code fragment, not a bare figure — never checked alone.
    const before = m.index > 0 ? text[m.index - 1] : '';
    const after = m.index + m[0].length < text.length ? text[m.index + m[0].length] : '';
    if (/[A-Za-z]/.test(before) || /[A-Za-z]/.test(after)) continue;
    numbers.push(m[0]);
  }
  const wordNumbers: string[] = [];
  const wordRe = new RegExp(
    `\\b(${NUMWORD_ALT})(?:[-\\s](?:one|two|three|four|five|six|seven|eight|nine))?\\b`, 'gi',
  );
  for (const m of text.matchAll(wordRe)) {
    if (m.index !== undefined && inSpans(m.index, m[0].length, covered)) continue;
    const [a, b] = m[0].toLowerCase().split(/[-\s]/);
    const sum = (WORD_NUMBERS[a] ?? '0');
    wordNumbers.push(!b ? sum : String(Number(sum) + Number(WORD_NUMBERS[b] ?? 0)));
  }
  // Quantity pairs ("30 days", "5 hours", "forty-eight hours"): number and
  // unit must occur TOGETHER — "30 days" is not supported by "30.12.2025".
  const qtyPairs: ClaimFeatures['qtyPairs'] = [];
  const pairRe = new RegExp(
    `(\\d+(?:\\.\\d+)?|${NUMWORD_ALT}(?:[-\\s](?:one|two|three|four|five|six|seven|eight|nine))?)\\s*[-–]?\\s*(days?|hours?|months?|years?|weeks?|minutes?)\\b`, 'gi',
  );
  for (const m of text.matchAll(pairRe)) {
    const rawNum = m[1];
    const unit = UNIT_SINGULAR[m[2].toLowerCase()] ?? m[2].toLowerCase();
    const digits = /^\d/.test(rawNum)
      ? rawNum.replace(/^0+(\d)/, '$1')
      : (() => {
          const [a, b] = rawNum.toLowerCase().split(/[-\s]/);
          const sum = (WORD_NUMBERS[a] ?? '0');
          return !b ? sum : String(Number(sum) + Number(WORD_NUMBERS[b] ?? 0));
        })();
    qtyPairs.push({ digits, unit, raw: m[0] });
  }
  const percents = [...text.matchAll(/\d+(?:\.\d+)?\s*%/g)].map((m) => m[0]);
  const money = [...text.matchAll(/₹\s*[\d,]+(?:\.\d+)?\s*(?:lakh|lac|crore|thousand)?/gi)].map((m) => m[0]);
  const ruleIds = [...text.matchAll(/\brule\s*\d+[a-z]*(?:[-–][a-z0-9]+)?/gi)].map((m) => m[0]);
  const sectionIds = [
    ...text.matchAll(/\bsection\s*\d+[a-z]*/gi),
    ...text.matchAll(/\bs\.?\s*\d+[a-z]*/gi),
  ].map((m) => m[0]);
  const orderIds = [
    ...text.matchAll(/\bOM\s*no\.?\s*[\w/-]+/gi),
    ...text.matchAll(/\bF\.?\s*no\.?\s*[\w/.-]+/gi),
    ...text.matchAll(/\bSB Order\s*no\.?\s*[\w/-]+/gi),
    ...text.matchAll(/\bDte\.?\s*OM\b[^.,;]*/gi),
  ].map((m) => m[0]);
  const dates = [
    ...text.matchAll(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g),
    ...text.matchAll(/\b\d{4}[./-]\d{1,2}[./-]\d{1,2}/g),
    ...text.matchAll(/\b\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)[,]?\s+\d{4}/gi),
  ].map((m) => m[0]);
  const authorities = AUTHORITY_PHRASES.filter((a) => text.toLowerCase().includes(a));
  const pages = [...text.matchAll(/\b(?:pp?\.?|pages?)\s*\d+(?:\s*[-–]\s*\d+)?/gi)].map((m) => m[0]);
  const obligations = OBLIGATION_RES.filter((r) => r.test(text)).map((r) => r.source);
  return { numbers, wordNumbers, qtyPairs, percents, money, ruleIds, sectionIds, orderIds, dates, authorities, pages, obligations, factual: isFactualSentence(text) };
}

// ---------------------------------------------------------------------------
// Support checking
// ---------------------------------------------------------------------------

const REF_TOKEN = /\[S(\d+)\]/g;

export function refsIn(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(REF_TOKEN)) out.add(`S${m[1]}`);
  return [...out];
}

function hayFor(targets: RefTarget[]): string {
  return targets.map((t) => `${t.passage.text} ${t.meta.title} ${t.meta.authority} ${t.meta.date ?? ''} ${t.meta.documentNumber ?? ''}`).join('\n');
}

/**
 * Check one claim sentence against its cited passages. Pure token/metadata
 * comparison — passage text is DATA and can never authorise anything beyond
 * what it literally (or numerically-equivalently) contains.
 */
export function checkClaim(
  text: string,
  refs: string[],
  refMap: Map<string, RefTarget>,
): CheckedClaim {
  const reasons: string[] = [];
  const unknown = refs.filter((r) => !refMap.has(r));
  if (refs.length === 0) {
    const f = extractFeatures(text);
    if (!f.factual) return { id: '', text, citationRefs: refs, support: 'DIRECT', reasons: ['non-factual connective/meta sentence'] };
    return { id: '', text, citationRefs: refs, support: 'UNSUPPORTED', reasons: ['factual sentence carries no citation'] };
  }
  if (unknown.length > 0) {
    return { id: '', text, citationRefs: refs, support: 'UNSUPPORTED', reasons: [`fabricated refs: ${unknown.join(', ')}`] };
  }
  const targets = refs.map((r) => refMap.get(r)!);
  const hay = hayFor(targets);
  const chay = canonical(hay);
  const fhay = flat(hay);
  // Citation markers ([S1]) are addressing, not content: strip them before
  // feature extraction so the gate never reads its own refs as identifiers.
  const contentText = text.replace(/\[S\d+\]/g, ' ');
  const f = extractFeatures(contentText);
  let level: ClaimSupport = 'DIRECT';

  const missing: string[] = [];
  // Bare numbers are checked against date-masked hay. Single digits use
  // token equality or hyphen affixes ("3" matches "3-a", never inside
  // "2011"); multi-digit runs use substring ("2026" matches "FY2026-27").
  // A figure hiding inside an unrelated date can never support a claim.
  const hayNoDates = canonical(maskDates(hay));
  // Tokens shed edge dots ("3." → "3") but keep hyphens ("3-a" stays whole
  // for the affix rule below).
  const hayTokens = new Set(hayNoDates.split(' ').map((t) => t.replace(/^\.+|\.+$/g, '')));
  const hasNum = (raw: string) => {
    const stripped = raw.replace(/^0+(\d)/, '$1');
    if (/^\d$/.test(stripped)) {
      if (hayTokens.has(stripped)) return true;
      for (const t of hayTokens) {
        if (t.startsWith(`${stripped}-`) || t.endsWith(`-${stripped}`)) return true;
      }
      return numberForms(raw).some((w) => /^[a-z]/.test(w) && hayTokens.has(w));
    }
    return numberForms(raw).some((form) => hayNoDates.includes(canonical(form)));
  };
  for (const n of f.numbers) {
    // Numbers glued inside identifiers/dates are checked with their parent
    // pattern (spans masked at extraction); the rest must still occur.
    if (!hasNum(n)) missing.push(`number ${n}`);
  }
  for (const w of f.wordNumbers) {
    // Word-form numbers must resolve to the same figure in the source
    // (digits or words): "thirty days" is not supported by "20 days".
    if (!hasNum(w)) missing.push(`number ${w}`);
  }
  for (const qp of f.qtyPairs) {
    // Quantity + unit must occur TOGETHER: "30 days" needs "30 days"
    // (either digit or word surface), not a stray 30 in some date.
    const cands = [`${qp.digits}${qp.unit}`, ...numberForms(qp.digits).map((w) => flat(`${w} ${qp.unit}`))];
    if (cands.some((c) => fhay.includes(c))) continue;
    // Distributed numerals ("4 and 5 hours"): the digit within a short
    // window before the unit still establishes the quantity.
    const forms = [qp.digits, ...numberForms(qp.digits)];
    let near = false;
    for (const form of forms) {
      const fc = flat(form);
      let ix = fhay.indexOf(fc);
      while (ix >= 0 && !near) {
        if (fhay.slice(ix, ix + fc.length + 14).includes(qp.unit)) near = true;
        ix = fhay.indexOf(fc, ix + 1);
      }
      if (near) break;
    }
    if (!near) missing.push(`quantity ${qp.raw}`);
  }
  for (const p of f.percents) {
    if (!fhay.includes(flat(p))) missing.push(`percentage ${p}`);
  }
  for (const m of f.money) {
    if (!fhay.includes(flat(m))) missing.push(`amount ${m}`);
  }
  for (const r of f.ruleIds) {
    if (!fhay.includes(flat(r))) missing.push(`rule identifier ${r}`);
  }
  for (const s of f.sectionIds) {
    // "s.7" and "section 7" are equivalent; accept either surface form.
    const digits = (s.match(/\d+/) ?? [''])[0];
    const ok =
      fhay.includes(flat(s)) ||
      fhay.includes(`section${digits}`) ||
      fhay.includes(`s${digits}`);
    if (!ok) missing.push(`section identifier ${s}`);
  }
  for (const o of f.orderIds) {
    // Order numbers may be cited short ("SB Order No. 01/2026" ↔ "01/2026").
    const tail = o.replace(/^(OM|F\.?|SB Order|Dte\.?\s*OM)\s*no\.?\s*/i, '').trim();
    if (!fhay.includes(flat(o)) && !(tail && fhay.includes(flat(tail)))) {
      missing.push(`order identifier ${o}`);
    }
  }
  for (const d of f.dates) {
    if (!fhay.includes(flat(d))) missing.push(`date ${d}`);
  }
  for (const a of f.authorities) {
    if (!hay.toLowerCase().includes(a)) missing.push(`authority ${a}`);
  }
  for (const pg of f.pages) {
    const nums = (pg.match(/\d+/g) ?? []).map(Number);
    const citedPages = targets.map((t) => t.meta.page).filter((p): p is number => p != null);
    const inText = fhay.includes(flat(pg));
    const inMeta = nums.some((n) => citedPages.includes(n));
    if (!inText && !inMeta) missing.push(`page ${pg}`);
  }

  if (missing.length > 0) {
    return { id: '', text, citationRefs: refs, support: 'UNSUPPORTED', reasons: missing.map((m) => `not established by cited source: ${m}`) };
  }

  // Obligation wording must not be stronger than the cited passage.
  if (f.obligations.length > 0) {
    const mirrored = DEONTIC_RES.some((r) => r.test(hay));
    if (!mirrored) {
      level = 'INFERENCE';
      reasons.push(`obligation wording (${f.obligations[0]}) goes beyond cited passage — treated as inference`);
    }
  }
  if (reasons.length === 0) reasons.push('all load-bearing tokens established by cited source');
  return { id: '', text, citationRefs: refs, support: level, reasons };
}

/** Gate a full draft: returns accepted claims, removed claims (with reasons), and fabricated refs. */
export function gateClaims(
  sentences: string[],
  refMap: Map<string, RefTarget>,
): { accepted: CheckedClaim[]; removed: CheckedClaim[]; fabricatedRefs: string[] } {
  const accepted: CheckedClaim[] = [];
  const removed: CheckedClaim[] = [];
  const fabricated = new Set<string>();
  sentences.forEach((s, i) => {
    const refs = refsIn(s);
    const checked = checkClaim(s, refs, refMap);
    checked.id = `C${i + 1}`;
    for (const r of refs) if (!refMap.has(r)) fabricated.add(r);
    if (checked.support === 'UNSUPPORTED') removed.push(checked);
    else accepted.push(checked);
  });
  return { accepted, removed, fabricatedRefs: [...fabricated] };
}

// ---------------------------------------------------------------------------
// False-premise detection (unsupported rule/section/order/₹/% identifiers)
// ---------------------------------------------------------------------------

export interface UnsupportedPremise {
  kind: 'rule' | 'section' | 'order' | 'amount' | 'percent';
  raw: string;
}

/**
 * A question that hinges on a specific identifier (Rule 999, ₹5 lakh, 7.5%,
 * OM No. X…) which occurs NOWHERE in the retrieved passages is a false
 * premise: answer UNKNOWN rather than composing around it. Bare quantities
 * ("30 days") and years are NOT premises — they are what the question asks.
 */
export function findUnsupportedPremise(
  question: string,
  passages: RetrievedPassage[],
): UnsupportedPremise | null {
  const hay = canonical(
    passages.map((p) => `${p.text} ${p.source.title} ${p.source.documentNumber ?? ''}`).join('\n'),
  );
  const cands: UnsupportedPremise[] = [];
  for (const m of question.matchAll(/\brule\s*(\d+[a-z]*(?:[-–][a-z0-9]+)?)/gi)) {
    cands.push({ kind: 'rule', raw: m[0] });
  }
  for (const m of question.matchAll(/\bsection\s*(\d+[a-z]*)/gi)) cands.push({ kind: 'section', raw: m[0] });
  for (const m of question.matchAll(/\bs\.?\s*(\d+[a-z]*)/gi)) {
    // Avoid matching stray abbreviations ("s. No", decimals): require the
    // digits to look like a section reference in context.
    if (/section|act|rti|rule/i.test(question)) cands.push({ kind: 'section', raw: m[0] });
  }
  for (const m of question.matchAll(/\b(?:OM|F\.?|SB Order|Dte\.?\s*OM)\s*no\.?\s*([\w/.-]+)/gi)) {
    cands.push({ kind: 'order', raw: m[0] });
  }
  for (const m of question.matchAll(/₹\s*[\d,]+(?:\.\d+)?\s*(?:lakh|lac|crore|thousand)?/gi)) {
    cands.push({ kind: 'amount', raw: m[0] });
  }
  for (const m of question.matchAll(/\b\d+(?:\.\d+)?\s*%/g)) cands.push({ kind: 'percent', raw: m[0] });

  for (const c of cands) {
    const norm = canonical(c.raw);
    if (c.kind === 'section' || c.kind === 'rule') {
      // Match the captured number against whole tokens: "Rules 2020" is
      // supported by any "2020" token, while "Rule 999" needs a real 999.
      const core = (c.raw.match(/\d+/) ?? [''])[0];
      const suffix = (c.raw.match(/\d+\s*[-–]?\s*([a-z]+)/i) ?? [])[1] ?? '';
      const tokens = new Set(hay.split(' '));
      const normSuffix = suffix.toLowerCase();
      const ok =
        hay.includes(norm) ||
        [...tokens].some(
          (t) => t === core || (normSuffix !== '' && t.replace(/[^a-z0-9-]/g, '').includes(`${core}-${normSuffix}`)),
        );
      if (!ok) return c;
      continue;
    }
    if (!hay.includes(norm)) return c;
  }
  return null;
}
