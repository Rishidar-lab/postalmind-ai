/**
 * Verified answer contract (internal) + deterministic question-intent
 * classification.
 *
 * The model is only the LANGUAGE COMPOSER. Verification is:
 *   verified primary source → retrieved passage → answer claim →
 *   citation → deterministic entailment/support check → final response.
 *
 * Intent is classified with keyword/stem rules only — never an LLM call —
 * so the answer shape is predictable and testable.
 */

export type QuestionIntent =
  | 'WORKING_HOURS'
  | 'RULE_LOOKUP'
  | 'ENTITLEMENT'
  | 'PROCEDURE'
  | 'DEADLINE'
  | 'RATE'
  | 'TRCA'
  | 'LEAVE'
  | 'TARGET_PRESSURE'
  | 'EVIDENCE_INTERPRETATION'
  | 'FACT_LOOKUP'
  | 'UNKNOWN';

export type QuestionLang = 'en' | 'ta';

export interface ClassifiedQuestion {
  intent: QuestionIntent;
  lang: QuestionLang;
  /** True when the question is about the asker's own figure/case (needs their data, never assumed). */
  asksIndividualFigure: boolean;
}

const TAMIL_RE = /[஀-௿]/;

/** Minimal Tamil keyword map for intent when the question has no Latin intent words. */
const TAMIL_HINTS: Array<{ intent: QuestionIntent; words: string[] }> = [
  { intent: 'WORKING_HOURS', words: ['மணி', 'நேரம்', 'வேலை'] },
  { intent: 'LEAVE', words: ['விடுப்பு', 'லீவு'] },
  { intent: 'RATE', words: ['வட்டி', 'விகிதம்'] },
  { intent: 'TRCA', words: ['சம்பளம்', 'ஊதியம்'] },
  { intent: 'DEADLINE', words: ['நாள்', 'நாட்கள்', 'காலக்கெடு'] },
  { intent: 'TARGET_PRESSURE', words: ['இலக்கு', 'டார்கெட்'] },
];

function hasWord(hay: string, words: string[]): boolean {
  return words.some((w) => hay.includes(w));
}

export function classifyQuestion(question: string): ClassifiedQuestion {
  const q = question.toLowerCase();
  const lang: QuestionLang = TAMIL_RE.test(question) ? 'ta' : 'en';
  const asksIndividualFigure = /\b(my|mine|should i get|what (will|would) i get|for me|எனக்கு|எனது)\b/.test(q);

  // Specificity order: the most load-bearing intents first.
  let intent: QuestionIntent = 'UNKNOWN';
  if (
    hasWord(q, ['interest rate', 'rate of interest', 'percent', '%', 'rd rate', 'ppf', 'nsc', 'kvp', 'scss', 'mis rate', 'ssa rate', 'td rate', 'unchanged', 'quarter']) ||
    (/\brate\b/.test(q) && hasWord(q, ['current', 'rate', 'rd', 'ppf', 'deposit', 'scheme']))
  ) {
    intent = 'RATE';
  } else if (hasWord(q, ['trca', 'time related', 'slab', 'level 1', 'level 2', 'arrear', 'wage', 'salary', 'allowance'])) {
    intent = 'TRCA';
  } else if (hasWord(q, ['leave', 'encash', 'maternity', 'holiday', 'lwa', 'paid leave', 'casual leave'])) {
    intent = 'LEAVE';
  } else if (hasWord(q, ['working hour', 'work hour', 'duty hour', 'hours of work', 'hours per day', 'shift', 'roster'])) {
    intent = 'WORKING_HOURS';
  } else if (hasWord(q, ['how long', 'how many days', 'time limit', 'deadline', 'within', 'reply', 'respond', 'response time', 'timeline'])) {
    intent = 'DEADLINE';
  } else if (
    hasWord(q, ['target', 'pressure', 'harass', 'mela', 'whatsapp', 'business', 'comparison', 'compare', 'threat', 'sham'])
  ) {
    // Evidence-flavoured target questions go to the evidence renderer when
    // they ask for a judgment; plain "are targets part of work" stays factual.
    intent = /prove|confirm|right\?|legal|establish|evidence|message/i.test(question)
      ? 'EVIDENCE_INTERPRETATION'
      : 'TARGET_PRESSURE';
  } else if (hasWord(q, ['prove', 'confirm', 'evidence', 'message', 'establish misconduct'])) {
    intent = 'EVIDENCE_INTERPRETATION';
  } else if (/\brule\s*\d|\bsection\s*\d+|\bs\.?\s*\d+|what does (the )?rule|which rule|rule 3|rule 9|rule 10|rule 12|rule 13/.test(q)) {
    intent = 'RULE_LOOKUP';
  } else if (hasWord(q, ['entitl', 'eligib', 'can i', 'do i get', 'do gds get', 'can gds', 'am i '])) {
    intent = 'ENTITLEMENT';
  } else if (hasWord(q, ['how to', 'how do', 'apply', 'appeal', 'file', 'procedure', 'process', 'steps', 'where to'])) {
    intent = 'PROCEDURE';
  } else if (/^(are|is|what is|who|do|does)\b/.test(q.trim()) || hasWord(q, ['employee', 'civil service', 'status', 'regular'])) {
    intent = 'FACT_LOOKUP';
  }

  if (intent === 'UNKNOWN' && lang === 'ta') {
    for (const h of TAMIL_HINTS) {
      if (h.words.some((w) => question.includes(w))) {
        intent = h.intent;
        break;
      }
    }
    // A Tamil question naming only GDS with no other hint is a factual lookup.
    if (intent === 'UNKNOWN' && /gds/i.test(q)) intent = 'FACT_LOOKUP';
  }

  return { intent, lang, asksIndividualFigure };
}
