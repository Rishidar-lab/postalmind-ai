/**
 * Source-grounded ASK pipeline.
 *
 * Flow:
 *   1. retrieve passages from the local corpus (deterministic)
 *   2. if nothing relevant -> UNKNOWN, no model call
 *   3. otherwise compose an answer that is CONSTRAINED to the retrieved
 *      passages:
 *        - demo mode: extractive (join passages + citations), no generation
 *        - model mode: the model is instructed to use ONLY the passages, to
 *          cite them as [S1], [S2]… and to say when they are insufficient;
 *          the output is then checked for uncited claims
 *   4. classify the answer: VERIFIED / INFERENCE / UNVERIFIED / UNKNOWN
 *
 * The model never sees anything except the retrieved passages and the
 * question. It is never asked to "provide cited information" from its own
 * knowledge.
 */

import { getProvider } from '@/lib/ai';
import { ProviderError } from '@/lib/ai/types';
import {
  assessRetrieval,
  retrieve,
  type RetrievalConfidence,
} from '@/lib/sources/registry';
import type { RetrievedPassage } from '@/lib/sources/types';

export type AnswerClassification = 'VERIFIED' | 'INFERENCE' | 'UNVERIFIED' | 'UNKNOWN';

export interface Citation {
  ref: string; // "S1"
  sourceId: string;
  passageId: string;
  title: string;
  authority: string;
  date: string | null;
  url: string | null;
  section: string | null;
  page: number | null;
  status: 'VERIFIED' | 'UNVERIFIED' | 'DEMO';
  score: number;
}

export interface AskResult {
  classification: AnswerClassification;
  answer: string;
  citations: Citation[];
  retrieval: RetrievalConfidence;
  /** Which responder produced the prose. */
  mode: 'extractive' | 'model' | 'none';
  model: string | null;
  /** Always present — the standing caveat for this classification. */
  notice: string;
  /** Claims in the model answer that did not cite a provided source. */
  uncitedClaimWarnings: string[];
}

const INDEPENDENCE =
  'Independent project. Not affiliated with or endorsed by India Post or the Department of Posts.';

const NOTICE: Record<AnswerClassification, string> = {
  VERIFIED:
    'Supported by a source a maintainer has checked against the primary document. Still verify against the linked source for anything consequential.',
  INFERENCE:
    'This is reasoning across the cited sources, not a direct quote. Check the sources before relying on it.',
  UNVERIFIED:
    'Based on project summaries of the sources that have NOT yet been checked line-by-line against the primary documents. Treat as a pointer to the source, not as the rule itself.',
  UNKNOWN:
    'PostalMind could not retrieve authoritative source material for this question. It will not guess. Try rephrasing, or consult the linked source library.',
};

function toCitations(passages: RetrievedPassage[]): Citation[] {
  return passages.map((p, i) => ({
    ref: `S${i + 1}`,
    sourceId: p.sourceId,
    passageId: p.id,
    title: p.source.title,
    authority: p.source.authority,
    date: p.source.date,
    url: p.source.sourceUrl,
    section: p.section,
    page: p.page,
    status: p.status,
    score: Math.round(p.score * 100) / 100,
  }));
}

function buildSystemPrompt(question: string, citations: Citation[], passages: RetrievedPassage[]): string {
  const blocks = passages
    .map((p, i) => `[${citations[i].ref}] ${p.source.title} — ${p.section ?? 'passage'} (status: ${p.status})\n${p.text}`)
    .join('\n\n');
  return [
    'You are PostalMind AI, a source-grounded assistant for Gramin Dak Sevaks.',
    INDEPENDENCE,
    '',
    'RULES:',
    '- Answer ONLY using the SOURCES below. Do not add rule numbers, circular numbers, dates, rates, order numbers, officer names or court decisions that are not in the SOURCES.',
    '- Cite every factual sentence with the bracket ref of the source it comes from, e.g. [S1].',
    '- If the SOURCES do not answer the question, say so plainly and stop. Do not fill the gap from general knowledge.',
    '- If the SOURCES are project summaries (status UNVERIFIED), tell the reader to check the primary document.',
    '- Be concise. Use plain language. Reply in the language of the question (English or Tamil).',
    '- Never state a small-savings interest rate unless it appears verbatim in a SOURCE.',
    '',
    `QUESTION: ${question}`,
    '',
    `SOURCES:\n${blocks}`,
  ].join('\n');
}

/** Extractive answer for demo mode — no generation, just the passages + citations. */
function extractiveAnswer(question: string, citations: Citation[], passages: RetrievedPassage[]): string {
  const parts = passages.map((p, i) => `**[${citations[i].ref}] ${p.source.title}** — ${p.section ?? ''}\n${p.text}`);
  return [
    `PostalMind retrieved ${passages.length} source passage${passages.length > 1 ? 's' : ''} relevant to your question. It is showing them directly rather than composing an answer (no language model is configured).`,
    '',
    ...parts,
    '',
    'Read the linked sources for the exact wording. PostalMind will not paraphrase a rule it cannot quote.',
  ].join('\n');
}

const CLAIM_SPLIT = /(?<=[.!?])\s+/;

function findUncitedClaims(answer: string, refs: string[]): string[] {
  const out: string[] = [];
  for (const sentence of answer.split(CLAIM_SPLIT)) {
    const s = sentence.trim();
    if (s.length < 40) continue;
    if (/^(here|this|in summary|note:|however|for example|e\.g\.|—)/i.test(s)) continue;
    const cited = refs.some((r) => s.includes(`[${r}]`));
    // Sentences that look like factual assertions (contain a modal/●fact verb).
    const factual = /\b(is|are|must|shall|may|entitled|requires?|provides?|allows?|within \d|days|rule|section|order)\b/i.test(s);
    if (factual && !cited) out.push(s.slice(0, 160));
  }
  return out;
}

const REF_PATTERN = /\[S(\d+)\]/g;

/**
 * A model may cite a real ref and an invented one in the same sentence
 * (`findUncitedClaims` only checks that *some* bracket is present), so this
 * checks every `[Sn]` token in the full answer against the refs `ask()`
 * actually retrieved. Anything else is a fabricated citation and must never
 * be silently trusted.
 */
function findFabricatedRefs(answer: string, refs: string[]): string[] {
  const found = new Set<string>();
  for (const m of answer.matchAll(REF_PATTERN)) {
    const ref = `S${m[1]}`;
    if (!refs.includes(ref)) found.add(ref);
  }
  return [...found];
}

export interface AskOptions {
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  signal?: AbortSignal;
}

export async function ask(question: string, opts: AskOptions = {}): Promise<AskResult> {
  const q = question.trim();
  const passages = retrieve(q, { limit: 4 });
  const retrieval = assessRetrieval(passages);

  if (passages.length === 0) {
    return {
      classification: 'UNKNOWN',
      answer:
        'PostalMind could not find authoritative source material for this question in its library, so it will not answer. ' +
        'You can browse the source library, rephrase the question, or ask a maintainer to add the relevant circular.',
      citations: [],
      retrieval,
      mode: 'none',
      model: null,
      notice: NOTICE.UNKNOWN,
      uncitedClaimWarnings: [],
    };
  }

  const citations = toCitations(passages);
  const provider = getProvider();
  const refs = citations.map((c) => c.ref);

  // Demo / no-model mode: extractive only.
  if (provider.name === 'demo') {
    const classification: AnswerClassification = retrieval.anyDemo
      ? 'UNVERIFIED'
      : retrieval.allVerified
        ? 'VERIFIED'
        : 'UNVERIFIED';
    return {
      classification,
      answer: extractiveAnswer(q, citations, passages),
      citations,
      retrieval,
      mode: 'extractive',
      model: null,
      notice: NOTICE[classification],
      uncitedClaimWarnings: [],
    };
  }

  // Model mode: constrained generation.
  const system = buildSystemPrompt(q, citations, passages);
  const history = (opts.history ?? []).slice(-6);
  try {
    const result = await provider.generate({
      system,
      turns: [...history, { role: 'user', content: q }],
      temperature: 0.1,
      maxOutputTokens: 900,
      signal: opts.signal,
    });

    const uncited = findUncitedClaims(result.text, refs);
    const fabricatedRefs = findFabricatedRefs(result.text, refs);
    const fabricationWarnings = fabricatedRefs.map(
      (r) =>
        `Cited [${r}], but no such source was retrieved for this question — treat that citation as unsupported.`,
    );
    const refusal = /could not|cannot|do not (?:have|find)|not (?:enough|sufficient|covered)|no source/i.test(
      result.text.slice(0, 240),
    );

    let classification: AnswerClassification;
    if (refusal) {
      classification = 'UNKNOWN';
    } else if (fabricatedRefs.length > 0) {
      // A fabricated citation means the citation trail itself cannot be trusted —
      // never let this reach VERIFIED or INFERENCE regardless of retrieval quality.
      classification = 'UNVERIFIED';
    } else if (retrieval.anyDemo) {
      classification = 'UNVERIFIED';
    } else if (retrieval.allVerified && uncited.length === 0 && retrieval.level === 'strong') {
      classification = 'VERIFIED';
    } else if (passages.length >= 2 && uncited.length === 0) {
      classification = 'INFERENCE';
    } else {
      classification = 'UNVERIFIED';
    }

    return {
      classification,
      answer: result.text,
      citations,
      retrieval,
      mode: 'model',
      model: result.model,
      notice: NOTICE[classification],
      uncitedClaimWarnings: [...uncited, ...fabricationWarnings],
    };
  } catch (err) {
    if (err instanceof ProviderError) {
      // Internal diagnostics only — kind, never the secret or raw provider body.
      console.error(`[ask] provider unavailable (${err.kind}): ${err.message}`);
      // Fall back to extractive rather than failing the whole request or
      // surfacing a raw provider error kind to the user.
      return {
        classification: retrieval.anyDemo ? 'UNVERIFIED' : 'UNVERIFIED',
        answer:
          'AI composition is temporarily unavailable. PostalMind is showing the retrieved source material directly.\n\n' +
          extractiveAnswer(q, citations, passages),
        citations,
        retrieval,
        mode: 'extractive',
        model: null,
        notice: NOTICE.UNVERIFIED,
        uncitedClaimWarnings: [],
      };
    }
    throw err;
  }
}
