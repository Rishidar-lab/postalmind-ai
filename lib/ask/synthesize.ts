/**
 * High-precision deterministic answer synthesiser (source-only path).
 *
 * Builds concise, human-readable answers WITHOUT a language model:
 *   1. classify intent (lib/ask/intent.ts)
 *   2. pick sentences from retrieved passages by query-term overlap,
 *      restricted per intent (VERIFIED passages where they suffice)
 *   3. strip maintainer trailers ("Verified against…", "Project summary…")
 *      — verification state lives on the citation card, not in the prose
 *   4. attach the owning citation ref to every sentence
 *
 * Nothing here paraphrases beyond tight, token-faithful compression in a
 * few hand-written intent leads — and every emitted factual sentence is
 * re-checked by the claim gate (lib/ask/claims.ts) before display.
 * DEMO passages are never used as factual support.
 */

import { stem, tokenize } from '@/lib/sources/registry';
import type { RetrievedPassage } from '@/lib/sources/types';
import { splitSentences } from './claims';
import { classifyQuestion, type ClassifiedQuestion, type QuestionIntent } from './intent';

export interface SynthesisClaim {
  text: string;
  /** Passage ids backing this sentence, in citation order. */
  passageIds: string[];
}

export interface Synthesis {
  paragraphs: string[];
  claims: SynthesisClaim[];
  qualifications: string[];
  usedPassageIds: string[];
  insufficient: boolean;
}

export function stripTrailer(s: string): string {
  return s
    .replace(/\s*Verified against primary[^.]*\.\s*$/i, '')
    .replace(/\s*Project summary\s*[—–-][\s\S]*$/i, '')
    .trim();
}

interface Scored {
  sentence: string;
  passage: RetrievedPassage;
  score: number;
}

function queryStems(question: string): Set<string> {
  return new Set(tokenize(question).map(stem));
}

/** Score every sentence of the given passages by distinct query-stem overlap. */
export function scoreSentences(
  question: string,
  passages: RetrievedPassage[],
): Scored[] {
  const qs = queryStems(question);
  const out: Scored[] = [];
  for (const p of passages) {
    if (p.status === 'DEMO' || p.source.sourceClass === 'DEMO') continue;
    for (const raw of splitSentences(p.text)) {
      const s = stripTrailer(raw);
      if (s.length < 25) continue;
      const stems = new Set(tokenize(s).map(stem));
      let overlap = 0;
      for (const t of qs) if (stems.has(t)) overlap += 1;
      if (overlap === 0) continue;
      // Slight preference for VERIFIED passages on ties; never exclusion —
      // when only an unverified passage covers the question it must be cited.
      const bonus = p.status === 'VERIFIED' ? 0.5 : 0;
      out.push({ sentence: s, passage: p, score: overlap + bonus });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

function topSentences(question: string, passages: RetrievedPassage[], limit: number): Scored[] {
  const scored = scoreSentences(question, passages);
  const picked: Scored[] = [];
  const seen = new Set<string>();
  for (const s of scored) {
    if (picked.length >= limit) break;
    const key = s.sentence.slice(0, 60).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(s);
  }
  return picked;
}

function verifiedOnly(passages: RetrievedPassage[]): RetrievedPassage[] {
  return passages.filter((p) => p.status === 'VERIFIED');
}

const TAMIL_WORKING_HOURS = [
  'GDS (நடத்தை மற்றும் ஈடுபாடு) விதிகள், 2020, விதி 3-A இன் படி, ஒரு GDS ஒரு நாளில் அதிகபட்சம் 5 மணி நேரத்திற்கு மேல் பணிபுரிய வேண்டியதில்லை.',
  'பணி நேர அளவுகள் 4 மணி நேரம் மற்றும் 5 மணி நேரம் என நிர்ணயிக்கப்பட்டுள்ளன.',
];

const TAMIL_LEAD = 'உங்கள் கேள்விக்கான பதில் கீழே ஆங்கில ஆதார வாக்கியங்களில் தரப்பட்டுள்ளது.';

function renderWithRefs(
  items: Array<{ sentence: string; passage: RetrievedPassage }>,
  refOf: (id: string) => string,
): { text: string; used: string[] } {
  const used: string[] = [];
  const parts = items.map(({ sentence, passage }) => {
    if (!used.includes(passage.id)) used.push(passage.id);
    const end = /[.!?]$/.test(sentence) ? '' : '.';
    return `${sentence}${end} [${refOf(passage.id)}]`;
  });
  return { text: parts.join(' '), used };
}

export function synthesize(
  question: string,
  passages: RetrievedPassage[],
  refOf: (passageId: string) => string,
): Synthesis & { classified: ClassifiedQuestion } {
  const classified = classifyQuestion(question);
  const usable = passages.filter((p) => p.status !== 'DEMO' && p.source.sourceClass !== 'DEMO');
  if (usable.length === 0) {
    return { paragraphs: [], claims: [], qualifications: [], usedPassageIds: [], insufficient: true, classified };
  }
  const v = verifiedOnly(usable);
  const s = synthesizeByIntent(question, classified, usable, v, refOf);
  return { ...s, classified };
}

function synthesizeByIntent(
  question: string,
  classified: ClassifiedQuestion,
  usable: RetrievedPassage[],
  v: RetrievedPassage[],
  refOf: (passageId: string) => string,
): Omit<Synthesis, 'classified'> {
  const empty = { paragraphs: [], claims: [], qualifications: [], usedPassageIds: [], insufficient: true };
  const byId = new Map(usable.map((p) => [p.id, p]));

  const finish = (
    items: Array<{ sentence: string; passage: RetrievedPassage }>,
    qualifications: string[] = [],
  ): Omit<Synthesis, 'classified'> => {
    if (items.length === 0) return empty;
    const { text, used } = renderWithRefs(items, refOf);
    return {
      paragraphs: [text],
      claims: items.map((it) => ({ text: it.sentence, passageIds: [it.passage.id] })),
      qualifications,
      usedPassageIds: used,
      insufficient: false,
    };
  };

  const findIn = (pool: RetrievedPassage[], patterns: RegExp[]): Scored[] => {
    const out: Scored[] = [];
    for (const p of pool) {
      for (const raw of splitSentences(p.text)) {
        const s = stripTrailer(raw);
        if (s.length < 25) continue;
        if (patterns.every((re) => re.test(s))) out.push({ sentence: s, passage: p, score: 1 });
      }
    }
    return out;
  };
  void byId;

  switch (classified.intent) {
    case 'WORKING_HOURS': {
      if (classified.lang === 'ta') {        // Fixed Tamil template — quantities preserved as digits, refs attached.
        const nature = v.find((p) => p.id === 'gds-2020-nature-of-engagement');
        const trca = v.find((p) => p.id === 'trca-2018-structure');
        const used = [nature, trca].filter((p): p is RetrievedPassage => !!p);
        if (used.length === 0) return empty;
        const text =
          `${TAMIL_WORKING_HOURS[0]} [${refOf(used[0].id)}]` +
          (used[1] ? ` ${TAMIL_WORKING_HOURS[1]} [${refOf(used[1].id)}]` : '');
        return {
          paragraphs: [text],
          claims: [
            { text: TAMIL_WORKING_HOURS[0], passageIds: [used[0].id] },
            ...(used[1] ? [{ text: TAMIL_WORKING_HOURS[1], passageIds: [used[1].id] }] : []),
          ],
          qualifications: [],
          usedPassageIds: used.map((p) => p.id),
          insufficient: false,
        };
      }
      const wantsNorms = /norm|workload assessment|assessed/i.test(question);
      const pool = wantsNorms ? usable : v.length > 0 ? v : usable;
      // Clause-level extraction: the Rule 3-A passage packs three points into
      // one sentence — for an hours question only the hours clause is shown
      // (no unrelated civil-service text).
      const items: Scored[] = [];
      const nature = pool.find((p) => p.id === 'gds-2020-nature-of-engagement');
      if (nature) {
        const clauses = nature.text.split(';').map((c) => c.trim()).filter((c) => c.length > 0);
        const hoursClause = clauses.find((c) => /5 hours|maximum period/i.test(c));
        if (hoursClause) {
          const lead = hoursClause.startsWith('Under Rule 3-A')
            ? hoursClause
            : `Under Rule 3-A of the GDS (Conduct and Engagement) Rules, 2020, ${hoursClause.charAt(0).toLowerCase()}${hoursClause.slice(1)}`;
          items.push({ sentence: lead, passage: nature, score: 10 });
        }
      }
      const trca = pool.find((p) => p.id === 'trca-2018-structure');
      if (trca && /4 and 5 hours/i.test(trca.text)) {
        items.push({ sentence: 'Working-hour slabs are 4 hours and 5 hours', passage: trca, score: 9 });
      }
      if (items.length === 0) {
        const cap = findIn(pool, [/5 hours/, /rule 3-a/i]).slice(0, 1);
        const slabs = findIn(pool, [/slab/i, /4/i]).filter((s) => /4 and 5|4-hour|4 hours/i.test(s.sentence)).slice(0, 1);
        items.push(...cap, ...slabs);
      }
      if (wantsNorms) {
        const norms = topSentences(question, usable, 1).filter((s) => !items.some((i) => i.passage.id === s.passage.id && i.sentence === s.sentence));
        items.push(...norms.slice(0, 1));
      }
      if (items.length === 0) items.push(...topSentences(question, pool, 2));
      return finish(items, [
        'Your exact roster depends on the engagement for your post — the rule sets the range, not the roster.',
      ]);
    }

    case 'RATE': {
      const posb = usable.find((p) => p.id === 'posb-rates-must-cite-quarter');
      const base = posb ? [posb] : usable;
      const items = findIn(base, [/unchanged/i]).slice(0, 1);
      const picked = items.length > 0 ? items : topSentences(question, base, 1);
      return finish(picked, [
        'PostalMind will not state a percentage from memory: the verified Q2 source carries no numerical rate table, so a rate-table notification for the quarter must be read directly.',
      ]);
    }

    case 'TRCA': {
      const trca = usable.filter((p) => p.id === 'trca-2018-structure');
      const pool = trca.length > 0 ? trca : usable;
      // Structure first (categories/slabs), then effect (wef/arrears/DA) —
      // both halves of a "what are the slabs" answer, each directly cited.
      const structure = findIn(pool, [/categ|slab/i]).slice(0, 1);
      const seenT = new Set(structure.map((t) => t.sentence));
      // Prefer the sentence covering the most effect aspects (wef + arrears).
      const effect = findIn(pool, [/w\.e\.f|arrears|dearness|01\.07\.2018|1 July/i])
        .filter((t) => !seenT.has(t.sentence))
        .sort(
          (a, b) =>
            (b.sentence.match(/w\.e\.f|arrears|dearness|01\.07\.2018/gi) ?? []).length -
            (a.sentence.match(/w\.e\.f|arrears|dearness|01\.07\.2018/gi) ?? []).length,
        )
        .slice(0, 1);
      let items = [...structure, ...effect];
      if (items.length === 0) items = topSentences(question, pool, 2);
      const quals: string[] = [];
      if (classified.asksIndividualFigure) {
        quals.push(
          'An individual figure depends on the category (BPM / ABPM / Dak Sevak), the working-hour slab and level, and the current DA position — none of which can be assumed here.',
        );
      } else {
        quals.push('For an individual figure, the category, slab and current DA revision would still be needed.');
      }
      return finish(items.length > 0 ? items : topSentences(question, usable, 2), quals);
    }

    case 'LEAVE': {
      const leave = usable.filter((p) => p.id === 'gds-leave-paid-leave');
      const pool = leave.length > 0 ? leave : usable;
      if (/emergency/i.test(question)) {
        const combo = findIn(pool, [/emergency/i]).slice(0, 1);
        const items = combo.length > 0 ? combo : topSentences(question, pool, 1);
        return finish(items, [
          'The verified leave source mentions emergency leave only to exclude it from combination with paid leave; it does not by itself establish a separate emergency-leave entitlement.',
        ]);
      }
      if (/encash/i.test(question)) {
        const items = findIn(pool, [/encash/i]).slice(0, 2);
        return finish(items.length > 0 ? items : topSentences(question, pool, 2));
      }
      const items = topSentences(question, pool, 2);
      return finish(items.length > 0 ? items : topSentences(question, usable, 2));
    }

    case 'DEADLINE': {
      // Timeline first, then the remedy (appeal/refusal) — the remedy is the
      // point of a "what if no reply" question even without query overlap.
      const timeline = findIn(usable, [/thirt|forty-eight|\b30 days\b|\b48 hours\b/i]).slice(0, 1);
      const seen = new Set(timeline.map((t) => t.sentence));
      const remedy = findIn(usable, [/appeal|refus/i])
        .filter((t) => !seen.has(t.sentence))
        .sort((a, b) => (/appeal/i.test(b.sentence) ? 1 : 0) - (/appeal/i.test(a.sentence) ? 1 : 0))
        .slice(0, 1);
      let items = [...timeline, ...remedy];
      if (items.length === 0) items = topSentences(question, usable, 2);
      if (classified.lang === 'ta') {
        return {
          paragraphs: [`${TAMIL_LEAD} ${renderWithRefs(items, refOf).text}`],
          claims: items.map((it) => ({ text: it.sentence, passageIds: [it.passage.id] })),
          qualifications: [],
          usedPassageIds: [...new Set(items.map((i) => i.passage.id))],
          insufficient: false,
        };
      }
      return finish(items);
    }

    case 'TARGET_PRESSURE':
    case 'EVIDENCE_INTERPRETATION': {
      return evidenceSynthesis(question, usable, refOf, finish);
    }

    default: {
      // RULE_LOOKUP, DEADLINE, PROCEDURE, ENTITLEMENT, FACT_LOOKUP, UNKNOWN:
      // most relevant sentences across usable passages, VERIFIED preferred.
      const items = topSentences(question, usable, 2);
      if (items.length === 0) return empty;
      if (classified.lang === 'ta') {
        return {
          paragraphs: [`${TAMIL_LEAD} ${renderWithRefs(items, refOf).text}`],
          claims: items.map((it) => ({ text: it.sentence, passageIds: [it.passage.id] })),
          qualifications: [],
          usedPassageIds: [...new Set(items.map((i) => i.passage.id))],
          insufficient: false,
        };
      }
      return finish(items);
    }
  }
}

/**
 * Evidence questions: OBSERVED / CLASSIFICATION / WHY / DOES NOT ESTABLISH /
 * NEXT — deterministic, never a misconduct finding.
 */
function evidenceSynthesis(
  question: string,
  usable: RetrievedPassage[],
  refOf: (passageId: string) => string,
  finish: (
    items: Array<{ sentence: string; passage: RetrievedPassage }>,
    qualifications?: string[],
  ) => Omit<Synthesis, 'classified'>,
): Omit<Synthesis, 'classified'> {
  void question;
  const biz = usable.find((p) => p.id === 'business-targets-nature');
  // Evidence judgments are grounded ONLY in the business/targets passage.
  // Without it there is nothing authoritative to stand on — synthesising
  // from unrelated passages (Rule 3-A, RTI timelines, …) would be nonsense,
  // so report insufficient and let ask() decline.
  if (!biz) return { paragraphs: [], claims: [], qualifications: [], usedPassageIds: [], insufficient: true };
  const pool = [biz];
  const observed = topSentences(question, pool, 2);
  const base = finish(observed.length > 0 ? observed : topSentences('target', pool, 1));
  if (base.insufficient) return base;
  return {
    ...base,
    qualifications: [
      'DOES NOT ESTABLISH: whether any particular message amounts to misconduct — that is evidence-specific and needs the messages themselves.',
      'NEXT EVIDENCE NEEDED: the dated messages, who sent them, and what happened around each one.',
    ],
  };
}

export type { QuestionIntent };
