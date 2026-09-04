/**
 * PII / sensitive-data detection, tuned for Indian postal workplace evidence.
 *
 * This is a *detector*, not a guarantee. It errs toward over-flagging. A human
 * reviews every match before anything is published (see publication.ts and
 * docs/REDACTION.md). Detection runs locally — no text is sent anywhere to
 * find PII.
 */

export const PII_TYPES = [
  'PHONE',
  'EMAIL',
  'AADHAAR',
  'PAN',
  'ACCOUNT_NUMBER',
  'AMOUNT',
  'PIN_CODE',
  'EMPLOYEE_ID',
  'FACILITY_ID',
  'URL',
  'HANDLE',
  'IFSC',
  'VEHICLE',
  'POSSIBLE_NAME',
] as const;
export type PIIType = (typeof PII_TYPES)[number];

export interface PIIMatch {
  type: PIIType;
  value: string;
  start: number;
  end: number;
  confidence: 'high' | 'medium' | 'low';
  label: string;
  /** What redaction would substitute, e.g. "[phone]". */
  suggestedReplacement: string;
}

interface Rule {
  type: PIIType;
  re: RegExp;
  confidence: PIIMatch['confidence'];
  label: string;
  replacement: string;
  /** Optional extra validation on the matched string. */
  valid?: (m: RegExpExecArray) => boolean;
}

const digitsOnly = (s: string) => s.replace(/\D/g, '');

const RULES: Rule[] = [
  {
    type: 'EMAIL',
    re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    confidence: 'high',
    label: 'Email address',
    replacement: '[email]',
  },
  {
    type: 'URL',
    re: /\bhttps?:\/\/[^\s<>()]+/gi,
    confidence: 'medium',
    label: 'URL',
    replacement: '[link]',
  },
  {
    type: 'IFSC',
    re: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
    confidence: 'high',
    label: 'Bank IFSC code',
    replacement: '[ifsc]',
  },
  {
    type: 'PAN',
    re: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
    confidence: 'high',
    label: 'PAN',
    replacement: '[pan]',
  },
  {
    type: 'AADHAAR',
    // 12 digits, optionally spaced/hyphenated 4-4-4, not starting 0 or 1.
    re: /\b([2-9]\d{3})[\s-]?(\d{4})[\s-]?(\d{4})\b/g,
    confidence: 'medium',
    label: 'Possible Aadhaar number',
    replacement: '[aadhaar]',
    valid: (m) => {
      const d = digitsOnly(m[0]);
      return d.length === 12;
    },
  },
  {
    type: 'PHONE',
    // Indian mobile: optional +91/91/0 prefix, then 10 digits starting 6-9,
    // grouped as 10, 5-5, or 3-3-4 with spaces/hyphens between groups.
    re: /(?:\+?\s?91[\s-]?|\b0)?[6-9]\d{9}\b|(?:\+?\s?91[\s-]?)?\b[6-9]\d{4}[\s-]\d{5}\b|(?:\+?\s?91[\s-]?)?\b[6-9]\d{2}[\s-]\d{3}[\s-]\d{4}\b/g,
    confidence: 'high',
    label: 'Phone number',
    replacement: '[phone]',
    valid: (m) => {
      const d = digitsOnly(m[0]).replace(/^91/, '').replace(/^0/, '');
      return d.length === 10 && /^[6-9]/.test(d);
    },
  },
  {
    type: 'FACILITY_ID',
    // BO/SO/HO/RMS facility IDs like BO29411310005, and "PIN 606106" office refs.
    re: /\b(?:BO|SO|HO|RMS|MDG|EDSO|EDBO)\s?\d{6,13}\b/gi,
    confidence: 'high',
    label: 'Post office facility ID',
    replacement: '[facility-id]',
  },
  {
    type: 'EMPLOYEE_ID',
    re: /\b(?:emp(?:loyee)?|staff|gds|hr)\s?(?:id|no|code|number)?[:.\s-]{0,3}[A-Z0-9]{4,12}\b/gi,
    confidence: 'medium',
    label: 'Possible employee ID',
    replacement: '[employee-id]',
  },
  {
    type: 'VEHICLE',
    re: /\b[A-Z]{2}[\s-]?\d{1,2}[\s-]?[A-Z]{1,3}[\s-]?\d{3,4}\b/g,
    confidence: 'low',
    label: 'Possible vehicle registration',
    replacement: '[vehicle]',
  },
  {
    type: 'AMOUNT',
    re: /(?:₹|Rs\.?|INR)\s?\d[\d,]*(?:\.\d{1,2})?(?:\s?(?:lakh|lakhs|crore|cr|k))?/gi,
    confidence: 'low',
    label: 'Money amount',
    replacement: '[amount]',
  },
  {
    type: 'PIN_CODE',
    re: /\b[1-9]\d{2}\s?\d{3}\b/g,
    confidence: 'low',
    label: 'Possible PIN code',
    replacement: '[pin]',
    // Avoid matching any 6-digit run: require a nearby postal word is handled
    // by the caller's context pass; here keep low confidence.
  },
  {
    type: 'HANDLE',
    re: /(^|[^\w@])@[A-Za-z0-9_]{3,30}\b/g,
    confidence: 'low',
    label: 'Social handle',
    replacement: '[handle]',
  },
  {
    type: 'ACCOUNT_NUMBER',
    // Long bare digit runs (9–18) that are not already phone/aadhaar.
    re: /\b\d{9,18}\b/g,
    confidence: 'medium',
    label: 'Possible account number',
    replacement: '[account]',
  },
];

/** Priority for resolving overlaps — higher wins. */
const PRIORITY: Record<PIIType, number> = {
  EMAIL: 100,
  IFSC: 95,
  PAN: 92,
  URL: 90,
  FACILITY_ID: 88,
  AADHAAR: 85,
  PHONE: 80,
  EMPLOYEE_ID: 70,
  ACCOUNT_NUMBER: 60,
  VEHICLE: 40,
  AMOUNT: 35,
  PIN_CODE: 30,
  HANDLE: 25,
  POSSIBLE_NAME: 20,
};

const NAME_CUE_RE =
  /\b(?:customer|complainant|colleague|beneficiary|nominee|depositor|Shri|Smt|Thiru|Mr|Mrs|Ms|Dr|Sri)\.?\s+((?:(?:Mr|Mrs|Ms|Dr|Shri|Smt|Sri|Thiru)\.?\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g;

export function detectPII(text: string): PIIMatch[] {
  const raw: PIIMatch[] = [];

  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.re.exec(text)) !== null) {
      if (m[0].length === 0) {
        rule.re.lastIndex++;
        continue;
      }
      if (rule.valid && !rule.valid(m)) continue;
      // For HANDLE the capture starts after a leading non-word char.
      const offset = rule.type === 'HANDLE' ? m[0].length - m[0].replace(/^[^@]*/, '').length : 0;
      const value = rule.type === 'HANDLE' ? m[0].slice(offset) : m[0];
      const start = m.index + offset;
      raw.push({
        type: rule.type,
        value,
        start,
        end: start + value.length,
        confidence: rule.confidence,
        label: rule.label,
        suggestedReplacement: rule.replacement,
      });
    }
  }

  // Name cues (medium confidence — a title/role word immediately before a name).
  NAME_CUE_RE.lastIndex = 0;
  let nm: RegExpExecArray | null;
  while ((nm = NAME_CUE_RE.exec(text)) !== null) {
    const name = nm[1];
    const start = nm.index + nm[0].indexOf(name);
    raw.push({
      type: 'POSSIBLE_NAME',
      value: name,
      start,
      end: start + name.length,
      confidence: 'medium',
      label: 'Possible person name (uninvolved third party)',
      suggestedReplacement: '[name]',
    });
  }

  // Resolve overlaps: sort by start, then keep the higher-priority match when
  // spans intersect.
  raw.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: PIIMatch[] = [];
  for (const cand of raw) {
    const clash = kept.find((k) => cand.start < k.end && k.start < cand.end);
    if (!clash) {
      kept.push(cand);
      continue;
    }
    if (PRIORITY[cand.type] > PRIORITY[clash.type]) {
      kept.splice(kept.indexOf(clash), 1, cand);
    }
  }
  return kept.sort((a, b) => a.start - b.start);
}

export interface PIISummary {
  total: number;
  byType: Partial<Record<PIIType, number>>;
  highConfidence: number;
  hasBlocking: boolean;
}

/** Types that block a PUBLIC export until explicitly cleared. */
export const BLOCKING_PII_TYPES: PIIType[] = [
  'PHONE',
  'EMAIL',
  'AADHAAR',
  'PAN',
  'ACCOUNT_NUMBER',
  'IFSC',
  'EMPLOYEE_ID',
  'FACILITY_ID',
];

export function summarizePII(matches: PIIMatch[]): PIISummary {
  const byType: Partial<Record<PIIType, number>> = {};
  for (const m of matches) byType[m.type] = (byType[m.type] ?? 0) + 1;
  return {
    total: matches.length,
    byType,
    highConfidence: matches.filter((m) => m.confidence === 'high').length,
    hasBlocking: matches.some(
      (m) => BLOCKING_PII_TYPES.includes(m.type) && m.confidence !== 'low',
    ),
  };
}
