/**
 * Evidence classification engine.
 *
 * Deterministic and rule-based on purpose:
 *  - the output must be explainable line-by-line to an employee, a union, a
 *    journalist or an administrator
 *  - it must be reproducible (same input -> same output), which an LLM is not
 *  - it must never upgrade an *evidence category* into a *legal finding*
 *
 * Every result carries `doesNotEstablish` — what the excerpt, on its own, does
 * NOT prove. That field is mandatory and always populated.
 *
 * Bilingual: English, Tamil (Unicode), and common Tanglish (romanised Tamil).
 */

import type { ConfidenceLevel, EvidenceAnalysis, EvidenceCategory, EvidenceStrength, SpeakerRole } from './types';

export interface ClassifyInput {
  text: string;
  timestamp?: string | null;
  speakerRole?: SpeakerRole;
  /** Working-hours window as "HH:MM" strings; used for after-hours detection. */
  workingHours?: { start: string; end: string };
  /** Recent messages from the SAME speaker within a short window (for repetition). */
  recentBySameSpeaker?: Array<{ text: string; timestamp?: string | null }>;
}

interface SignalHit {
  signal: string;
  weight: number;
  categories: EvidenceCategory[];
}

/** Zero-width / bidi / BOM characters that WhatsApp and OCR sprinkle in. */
const ZERO_WIDTH_RE = /[​-‏‪-‮⁦-⁩﻿]/g;

/** Normalise for matching: lowercase, collapse ws, strip zero-width. */
export function normalizeForMatch(text: string): string {
  return text
    .replace(ZERO_WIDTH_RE, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// --- keyword tables ---------------------------------------------------------
// Each entry: [pattern, weight, categories]. Patterns are matched as substrings
// (already-lowercased) unless they look like /regex/.

type Entry = [string | RegExp, number, EvidenceCategory[]];

const TARGET: Entry[] = [
  ['target', 2, ['TARGET_INSTRUCTION']],
  ['targets', 2, ['TARGET_INSTRUCTION']],
  ['இலக்கு', 2, ['TARGET_INSTRUCTION']],
  ['ilakku', 2, ['TARGET_INSTRUCTION']],
  ['quota', 2, ['TARGET_INSTRUCTION']],
  ['achievement', 1, ['TARGET_INSTRUCTION', 'PERFORMANCE_EXPECTATION']],
  ['shortfall', 2, ['PERFORMANCE_EXPECTATION', 'REPEATED_TARGET_PRESSURE']],
  ['pending accounts', 1, ['TARGET_INSTRUCTION']],
  [/\b(pli|rpli|rd|apy|ppf|ssa|nsc|sukanya|mis)\b/, 1, ['TARGET_INSTRUCTION']],
  ['mela', 1, ['TARGET_INSTRUCTION']],
  ['canvass', 1, ['TARGET_INSTRUCTION']],
  ['business', 1, ['TARGET_INSTRUCTION']],
  // A bare work noun with a quantity ("5 accounts") reads as an output target,
  // kept at weight 1 so it stays LOW confidence without corroboration.
  ['accounts', 1, ['TARGET_INSTRUCTION']],
  // A weekday deadline ("by Friday") states an expectation, not pressure.
  [/\bby (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/, 1, ['PERFORMANCE_EXPECTATION']],
];

const PRESSURE: Entry[] = [
  ['immediately', 2, ['REPEATED_TARGET_PRESSURE']],
  ['at once', 2, ['REPEATED_TARGET_PRESSURE']],
  ['by today', 2, ['REPEATED_TARGET_PRESSURE']],
  ['by tomorrow', 1, ['REPEATED_TARGET_PRESSURE']],
  ['without fail', 2, ['REPEATED_TARGET_PRESSURE']],
  ['compulsory', 2, ['REPEATED_TARGET_PRESSURE']],
  ['must complete', 2, ['REPEATED_TARGET_PRESSURE']],
  ['how many times', 3, ['REPEATED_TARGET_PRESSURE']],
  ['again and again', 3, ['REPEATED_TARGET_PRESSURE']],
  ['daily i am telling', 3, ['REPEATED_TARGET_PRESSURE']],
  ['எத்தனை முறை', 3, ['REPEATED_TARGET_PRESSURE']],
  ['ethana murai', 3, ['REPEATED_TARGET_PRESSURE']],
  ['ethanai murai', 3, ['REPEATED_TARGET_PRESSURE']],
  ['romba naala', 2, ['REPEATED_TARGET_PRESSURE']],
  ['உடனே', 2, ['REPEATED_TARGET_PRESSURE']],
  ['udane', 2, ['REPEATED_TARGET_PRESSURE']],
  ['no excuse', 2, ['REPEATED_TARGET_PRESSURE']],
  ['last chance', 2, ['THREAT_LIKE_LANGUAGE']],
];

const PEER: Entry[] = [
  ['other bo', 2, ['PEER_COMPARISON']],
  ['other branches', 2, ['PEER_COMPARISON']],
  ['others have done', 3, ['PEER_COMPARISON']],
  ['everyone except you', 3, ['PEER_COMPARISON', 'PUBLIC_NAMING']],
  ['your colleague', 2, ['PEER_COMPARISON']],
  ['மற்றவர்கள்', 2, ['PEER_COMPARISON']],
  ['matravargal', 2, ['PEER_COMPARISON']],
  ['vera bo', 2, ['PEER_COMPARISON']],
  ['only you are', 3, ['PEER_COMPARISON', 'PUBLIC_NAMING']],
  ['you are the only one', 3, ['PEER_COMPARISON', 'PUBLIC_NAMING']],
  ['nee mattum', 3, ['PEER_COMPARISON', 'PUBLIC_NAMING']],
  ['bottom of the list', 3, ['PEER_COMPARISON', 'PUBLIC_SHAMING']],
  ['last rank', 2, ['PEER_COMPARISON']],
  [/\brank\s?\d+/, 2, ['PEER_COMPARISON']],
];

const PUBLIC: Entry[] = [
  ['in front of everyone', 3, ['PUBLIC_SHAMING']],
  ['in the group', 2, ['PUBLIC_NAMING']],
  ['group la', 2, ['PUBLIC_NAMING']],
  ['ellaru munnadi', 3, ['PUBLIC_SHAMING']],
  ['எல்லோர் முன்னாடி', 3, ['PUBLIC_SHAMING']],
  ['naanju', 1, []],
];

const SHAME: Entry[] = [
  ['useless', 3, ['PUBLIC_SHAMING', 'ABUSIVE_LANGUAGE']],
  ['lazy', 3, ['PUBLIC_SHAMING', 'ABUSIVE_LANGUAGE']],
  ['good for nothing', 3, ['PUBLIC_SHAMING', 'ABUSIVE_LANGUAGE']],
  ['worst', 2, ['PUBLIC_SHAMING']],
  ['shame', 2, ['PUBLIC_SHAMING']],
  ['வேலைக்கு ஆகாத', 3, ['PUBLIC_SHAMING', 'ABUSIVE_LANGUAGE']],
  ['velaikku agatha', 3, ['PUBLIC_SHAMING', 'ABUSIVE_LANGUAGE']],
  ['waste fellow', 3, ['ABUSIVE_LANGUAGE', 'PUBLIC_SHAMING']],
  ['nonsense', 2, ['ABUSIVE_LANGUAGE']],
];

const AFTER_HOURS_TEXT: Entry[] = [
  ['tonight', 1, ['AFTER_HOURS_COMMUNICATION']],
  ['at night', 1, ['AFTER_HOURS_COMMUNICATION']],
  ['right now it is late', 1, ['AFTER_HOURS_COMMUNICATION']],
  ['on sunday', 1, ['AFTER_HOURS_COMMUNICATION']],
  ['holiday also', 2, ['AFTER_HOURS_COMMUNICATION']],
  ['after office', 1, ['AFTER_HOURS_COMMUNICATION']],
];

const INSPECTION: Entry[] = [
  ['inspection', 2, ['INSPECTION_REFERENCE']],
  ['io visit', 2, ['INSPECTION_REFERENCE']],
  ['asp visit', 2, ['INSPECTION_REFERENCE']],
  ['sp inspection', 2, ['INSPECTION_REFERENCE']],
  ['sub division visit', 2, ['INSPECTION_REFERENCE']],
  ['ஆய்வு', 2, ['INSPECTION_REFERENCE']],
  ['aaivu', 2, ['INSPECTION_REFERENCE']],
  ['verification visit', 2, ['INSPECTION_REFERENCE']],
];

const LEAVE: Entry[] = [
  ['leave not sanctioned', 3, ['LEAVE_RELATED_PRESSURE']],
  ['cancel your leave', 3, ['LEAVE_RELATED_PRESSURE']],
  ['no leave', 2, ['LEAVE_RELATED_PRESSURE']],
  ['leave rejected', 3, ['LEAVE_RELATED_PRESSURE']],
  ['come even on leave', 3, ['LEAVE_RELATED_PRESSURE', 'AFTER_HOURS_COMMUNICATION']],
  ['விடுப்பு', 1, ['LEAVE_RELATED_PRESSURE']],
  ['vidupu', 1, ['LEAVE_RELATED_PRESSURE']],
  ['how can you take leave', 3, ['LEAVE_RELATED_PRESSURE']],
];

const THREAT_LIKE: Entry[] = [
  ['consequences', 3, ['THREAT_LIKE_LANGUAGE']],
  ['action will be taken', 3, ['THREAT_LIKE_LANGUAGE']],
  ['note will be put', 3, ['THREAT_LIKE_LANGUAGE']],
  ['you will be responsible', 3, ['THREAT_LIKE_LANGUAGE']],
  ['i will see', 2, ['THREAT_LIKE_LANGUAGE']],
  ['பார்த்துக்கறேன்', 3, ['THREAT_LIKE_LANGUAGE']],
  ['paarthukaren', 3, ['THREAT_LIKE_LANGUAGE']],
  ['paathukaren', 3, ['THREAT_LIKE_LANGUAGE']],
  ['adutha varum', 2, ['THREAT_LIKE_LANGUAGE']],
  ['explanation will be called', 2, ['THREAT_LIKE_LANGUAGE']],
];

const EXPLICIT_THREAT: Entry[] = [
  ['charge sheet', 4, ['EXPLICIT_THREAT']],
  ['charge memo', 4, ['EXPLICIT_THREAT']],
  ['show cause notice', 3, ['EXPLICIT_THREAT']],
  ['suspend you', 4, ['EXPLICIT_THREAT']],
  ['suspension', 3, ['EXPLICIT_THREAT']],
  ['terminate', 4, ['EXPLICIT_THREAT']],
  ['termination', 4, ['EXPLICIT_THREAT']],
  ['disengage', 4, ['EXPLICIT_THREAT']],
  ['put you out of service', 4, ['EXPLICIT_THREAT']],
  ['stop your salary', 4, ['EXPLICIT_THREAT', 'FINANCIAL_PRESSURE']],
  ['stop your trca', 4, ['EXPLICIT_THREAT', 'FINANCIAL_PRESSURE']],
];

const RETALIATION: Entry[] = [
  ['since you filed rti', 4, ['RETALIATION_REFERENCE']],
  ['because you complained', 4, ['RETALIATION_REFERENCE']],
  ['you went to sp', 3, ['RETALIATION_REFERENCE']],
  ['you went to union', 3, ['RETALIATION_REFERENCE']],
  ['after your complaint', 4, ['RETALIATION_REFERENCE']],
  ['you raised grievance', 3, ['RETALIATION_REFERENCE']],
];

const ABUSIVE: Entry[] = [
  ['shut up', 3, ['ABUSIVE_LANGUAGE']],
  ['stupid', 3, ['ABUSIVE_LANGUAGE']],
  ['idiot', 3, ['ABUSIVE_LANGUAGE']],
  ['bloody', 2, ['ABUSIVE_LANGUAGE']],
  ['முட்டாள்', 3, ['ABUSIVE_LANGUAGE']],
  ['muttal', 3, ['ABUSIVE_LANGUAGE']],
];

const WORKLOAD: Entry[] = [
  ['single handed', 2, ['WORKLOAD_REFERENCE']],
  ['no substitute', 2, ['WORKLOAD_REFERENCE']],
  ['extra beat', 2, ['WORKLOAD_REFERENCE']],
  ['double duty', 2, ['WORKLOAD_REFERENCE']],
  ['additional charge', 2, ['WORKLOAD_REFERENCE']],
  ['தனியா', 1, ['WORKLOAD_REFERENCE']],
];

const FINANCIAL: Entry[] = [
  ['pay from your pocket', 4, ['FINANCIAL_PRESSURE']],
  ['you deposit the amount', 4, ['FINANCIAL_PRESSURE']],
  ['recovery from salary', 4, ['FINANCIAL_PRESSURE']],
  ['penalty from your', 3, ['FINANCIAL_PRESSURE']],
  ['adjust from trca', 3, ['FINANCIAL_PRESSURE']],
  ['open account with your money', 4, ['FINANCIAL_PRESSURE']],
];

const COUNTER: Entry[] = [
  ['take rest', 3, ['COUNTER_EVIDENCE']],
  ['no problem', 2, ['COUNTER_EVIDENCE']],
  ["don't worry", 3, ['COUNTER_EVIDENCE']],
  ['well done', 3, ['COUNTER_EVIDENCE']],
  ['good work', 3, ['COUNTER_EVIDENCE']],
  ['thank you', 1, ['COUNTER_EVIDENCE']],
  ['leave sanctioned', 3, ['COUNTER_EVIDENCE']],
  ['you can do it tomorrow', 3, ['COUNTER_EVIDENCE']],
  ['sorry for', 2, ['COUNTER_EVIDENCE']],
  ['whenever possible', 2, ['COUNTER_EVIDENCE']],
  ['பரவாயில்ல', 3, ['COUNTER_EVIDENCE']],
  ['paravala', 3, ['COUNTER_EVIDENCE']],
  ['nalla panreenga', 3, ['COUNTER_EVIDENCE']],
];

const ADMIN: Entry[] = [
  ['send the bag', 1, ['ADMINISTRATIVE_INSTRUCTION']],
  ['update the register', 1, ['ADMINISTRATIVE_INSTRUCTION']],
  ['submit the account', 1, ['ADMINISTRATIVE_INSTRUCTION']],
  ['close the bo', 1, ['ADMINISTRATIVE_INSTRUCTION']],
  ['attend the meeting', 1, ['ADMINISTRATIVE_INSTRUCTION']],
  ['bring the documents', 1, ['ADMINISTRATIVE_INSTRUCTION']],
  ['report tomorrow', 2, ['ADMINISTRATIVE_INSTRUCTION']],
  ['report by', 2, ['ADMINISTRATIVE_INSTRUCTION']],
  ['send a report', 1, ['ADMINISTRATIVE_INSTRUCTION']],
];

const ALL_TABLES: Entry[] = [
  ...TARGET,
  ...PRESSURE,
  ...PEER,
  ...PUBLIC,
  ...SHAME,
  ...AFTER_HOURS_TEXT,
  ...INSPECTION,
  ...LEAVE,
  ...THREAT_LIKE,
  ...EXPLICIT_THREAT,
  ...RETALIATION,
  ...ABUSIVE,
  ...WORKLOAD,
  ...FINANCIAL,
  ...COUNTER,
  ...ADMIN,
];

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

function isAfterHours(timestamp: string, wh?: { start: string; end: string }): boolean {
  const t = /T(\d{2}):(\d{2})/.exec(timestamp);
  if (!t) return false;
  const mins = +t[1] * 60 + +t[2];
  const start = wh ? timeToMinutes(wh.start) : timeToMinutes('09:00');
  const end = wh ? timeToMinutes(wh.end) : timeToMinutes('17:00');
  const dow = new Date(timestamp).getDay(); // 0 Sun .. 6 Sat
  if (dow === 0) return true; // Sunday
  return mins < start || mins >= end;
}

const CATEGORY_SUPPORT: Partial<Record<EvidenceCategory, string>> = {
  TARGET_INSTRUCTION: 'A business/product target was communicated to the employee.',
  PERFORMANCE_EXPECTATION: 'A performance standard or expectation was stated.',
  REPEATED_TARGET_PRESSURE: 'The same individual performance demand was pressed repeatedly in a short period.',
  PEER_COMPARISON: 'The employee’s performance was compared to that of colleagues or other offices.',
  PUBLIC_NAMING: 'The employee was singled out by name in a shared/group channel.',
  PUBLIC_SHAMING: 'The employee was named in a shared channel with disparaging framing.',
  AFTER_HOURS_COMMUNICATION: 'A work demand was sent outside the employee’s stated working hours.',
  INSPECTION_REFERENCE: 'An inspection, visit or audit was referenced.',
  LEAVE_RELATED_PRESSURE: 'Pressure was applied in connection with leave.',
  THREAT_LIKE_LANGUAGE: 'Language was used that a reasonable reader could take as implying an adverse consequence.',
  EXPLICIT_THREAT: 'A specific adverse consequence (disciplinary/financial) was explicitly stated.',
  RETALIATION_REFERENCE: 'A link was drawn between the employee’s complaint/RTI/union activity and an adverse action.',
  ABUSIVE_LANGUAGE: 'Insulting or degrading terms were directed at the employee.',
  WORKLOAD_REFERENCE: 'The volume of work or staffing situation was described.',
  FINANCIAL_PRESSURE: 'Pressure involving pay, recovery, or the employee’s personal money was applied.',
  ADMINISTRATIVE_INSTRUCTION: 'A routine work instruction was given.',
  COUNTER_EVIDENCE: 'The message contains supportive, flexible or conciliatory content.',
  NEUTRAL: 'The message is ordinary workplace communication.',
  INSUFFICIENT_CONTEXT: 'There is not enough context to categorise this reliably.',
};

const GENERIC_DOES_NOT_ESTABLISH = [
  'This excerpt, on its own, does not establish harassment, misconduct, retaliation or illegality.',
  'It does not by itself prove intent, a pattern, or the effect on the employee.',
  'Any finding of that kind would require the full context, corroboration, and an authoritative process.',
];

const PER_CATEGORY_CAVEAT: Partial<Record<EvidenceCategory, string>> = {
  TARGET_INSTRUCTION: 'Communicating a target is a normal management act and is not misconduct by itself.',
  PERFORMANCE_EXPECTATION: 'Stating a performance expectation is a normal management act and is not misconduct by itself.',
  PEER_COMPARISON: 'A single peer comparison is not, by itself, harassment; repetition, tone and forum matter.',
  AFTER_HOURS_COMMUNICATION: 'A single after-hours message is a time fact, not misconduct; frequency and expectation of a reply matter.',
  INSPECTION_REFERENCE: 'Mentioning an inspection is not a threat unless it is tied to an adverse consequence.',
  THREAT_LIKE_LANGUAGE: 'This is suggestive language, not an explicit threat; reasonable readers may differ.',
  REPEATED_TARGET_PRESSURE: 'Repetition here is inferred from the text/window provided and should be verified against the full thread.',
};

export function classifyMessage(input: ClassifyInput): EvidenceAnalysis {
  const original = input.text ?? '';
  const norm = normalizeForMatch(original);
  const hits: SignalHit[] = [];
  const scores = new Map<EvidenceCategory, number>();

  const add = (cat: EvidenceCategory, w: number) =>
    scores.set(cat, (scores.get(cat) ?? 0) + w);

  if (norm.length === 0) {
    return emptyAnalysis(['Empty excerpt.']);
  }

  for (const [pat, weight, cats] of ALL_TABLES) {
    const matched =
      pat instanceof RegExp ? pat.test(norm) : norm.includes(pat);
    if (matched) {
      hits.push({ signal: pat instanceof RegExp ? pat.source : pat, weight, categories: cats });
      for (const c of cats) add(c, weight);
    }
  }

  // After-hours from the timestamp.
  if (input.timestamp && isAfterHours(input.timestamp, input.workingHours)) {
    add('AFTER_HOURS_COMMUNICATION', 2);
    hits.push({
      signal: `timestamp ${input.timestamp} outside working hours`,
      weight: 2,
      categories: ['AFTER_HOURS_COMMUNICATION'],
    });
  }

  // Repetition from recent same-speaker window.
  if (input.recentBySameSpeaker && input.recentBySameSpeaker.length) {
    const targetish = /target|இலக்கு|ilakku|pending|shortfall|achievement|pli|rd|apy/;
    const priorTargetMsgs = input.recentBySameSpeaker.filter((m) =>
      targetish.test(normalizeForMatch(m.text)),
    ).length;
    const selfTarget = targetish.test(norm);
    if (selfTarget && priorTargetMsgs >= 1) {
      add('REPEATED_TARGET_PRESSURE', 2 + Math.min(priorTargetMsgs, 3));
      hits.push({
        signal: `${priorTargetMsgs} earlier target message(s) from the same person in the window`,
        weight: 2 + Math.min(priorTargetMsgs, 3),
        categories: ['REPEATED_TARGET_PRESSURE'],
      });
    }
  }

  // Supervisory role sharpens pressure categories slightly.
  if (input.speakerRole === 'SUPERVISORY') {
    for (const c of ['REPEATED_TARGET_PRESSURE', 'THREAT_LIKE_LANGUAGE', 'EXPLICIT_THREAT', 'LEAVE_RELATED_PRESSURE'] as EvidenceCategory[]) {
      if (scores.has(c)) add(c, 1);
    }
  }

  // If a target signal exists but no pressure signal, prefer the neutral category.
  const hasPressure = ['REPEATED_TARGET_PRESSURE', 'THREAT_LIKE_LANGUAGE', 'EXPLICIT_THREAT'].some((c) =>
    scores.has(c as EvidenceCategory),
  );
  if (scores.has('TARGET_INSTRUCTION') && !hasPressure) {
    // keep as-is; TARGET_INSTRUCTION is already neutral-by-default
  }

  // Counter-evidence dampens pressure categories.
  if (scores.has('COUNTER_EVIDENCE')) {
    for (const c of ['REPEATED_TARGET_PRESSURE', 'THREAT_LIKE_LANGUAGE', 'PUBLIC_SHAMING'] as EvidenceCategory[]) {
      if (scores.has(c)) scores.set(c, (scores.get(c) as number) - 1);
    }
  }

  // Build ranked category list.
  let ranked = [...scores.entries()]
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  let confidence: ConfidenceLevel = 'LOW';
  let strength: EvidenceStrength = 'WEAK';

  if (ranked.length === 0) {
    // No signal at all.
    const short = norm.split(' ').length < 4;
    if (short) {
      ranked = ['INSUFFICIENT_CONTEXT'];
      strength = 'INSUFFICIENT';
    } else {
      ranked = ['NEUTRAL'];
      strength = 'WEAK';
    }
    confidence = 'LOW';
  } else {
    const top = scores.get(ranked[0]) as number;
    confidence = top >= 5 ? 'HIGH' : top >= 3 ? 'MODERATE' : 'LOW';
    strength =
      ranked[0] === 'EXPLICIT_THREAT' && top >= 4
        ? 'MODERATE'
        : top >= 5
          ? 'MODERATE'
          : top >= 3
            ? 'WEAK'
            : 'WEAK';
  }

  // Keep at most the 3 strongest categories, plus COUNTER_EVIDENCE if present.
  const primary: EvidenceCategory[] = ranked
    .filter((c): boolean => c !== 'COUNTER_EVIDENCE')
    .slice(0, 3);
  if (ranked.includes('COUNTER_EVIDENCE')) primary.push('COUNTER_EVIDENCE');

  const reasons: string[] = [];
  for (const h of hits.slice(0, 8)) {
    reasons.push(`matched "${h.signal}" → ${h.categories.join(', ') || 'context'}`);
  }
  if (reasons.length === 0) reasons.push('no pressure or instruction signals detected');

  const supports = primary
    .map((c) => CATEGORY_SUPPORT[c])
    .filter((s): s is string => !!s);

  const doesNotEstablish = [
    ...primary
      .map((c) => PER_CATEGORY_CAVEAT[c])
      .filter((s): s is string => !!s),
    ...GENERIC_DOES_NOT_ESTABLISH,
  ];

  return {
    categories: primary,
    confidence,
    strength,
    reasons,
    supports: supports.length ? supports : ['Ordinary workplace communication.'],
    doesNotEstablish,
    signals: hits.map((h) => h.signal),
  };
}

function emptyAnalysis(reasons: string[]): EvidenceAnalysis {
  return {
    categories: ['INSUFFICIENT_CONTEXT'],
    confidence: 'LOW',
    strength: 'INSUFFICIENT',
    reasons,
    supports: ['Nothing — the excerpt is empty or unreadable.'],
    doesNotEstablish: GENERIC_DOES_NOT_ESTABLISH,
    signals: [],
  };
}
