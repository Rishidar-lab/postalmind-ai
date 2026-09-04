/**
 * Source registry + lexical retrieval.
 *
 * Retrieval is deliberately simple and transparent: a bag-of-words score over
 * each passage's keywords and text. No embeddings, no external calls. The
 * caller can see exactly which terms matched and why a passage ranked.
 */

import { CORPUS } from '@/content/corpus';
import { SOURCES, SOURCE_BY_ID } from '@/content/sources';
import type { CorpusPassage, RetrievedPassage, SourceRecord } from './types';

export function listSources(): SourceRecord[] {
  return [...SOURCES].sort((a, b) => a.title.localeCompare(b.title));
}

export function getSource(id: string): SourceRecord | undefined {
  return SOURCE_BY_ID.get(id);
}

export function listPassages(): CorpusPassage[] {
  return CORPUS;
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'to', 'in', 'is', 'are', 'for', 'on', 'and', 'or', 'my', 'me', 'i',
  'what', 'how', 'do', 'does', 'can', 'about', 'with', 'as', 'at', 'by', 'be', 'this', 'that',
  'it', 'if', 'from', 'was', 'will', 'am', 'we', 'you', 'your', 'their', 'there', 'so', 'please',
]);

export function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Light stemming for a few common English suffixes. */
function stem(t: string): string {
  return t.replace(/(ing|ers|er|ed|es|s)$/i, (m) => (t.length - m.length >= 3 ? '' : m));
}

interface RetrieveOptions {
  limit?: number;
  /** Minimum score (0..1) to be returned at all. */
  minScore?: number;
}

export function retrieve(query: string, opts: RetrieveOptions = {}): RetrievedPassage[] {
  const limit = opts.limit ?? 4;
  const minScore = opts.minScore ?? 0.08;
  const qTokens = tokenize(query);
  const qStems = new Set(qTokens.map(stem));
  if (qStems.size === 0) return [];

  const scored: RetrievedPassage[] = [];

  for (const p of CORPUS) {
    const source = SOURCE_BY_ID.get(p.sourceId);
    if (!source) continue;

    const kwTokens = p.keywords.flatMap((k) => tokenize(k)).map(stem);
    const textTokens = tokenize(p.text).map(stem);
    const tagTokens = p.tags.flatMap((k) => tokenize(k)).map(stem);
    const titleTokens = tokenize(source.title).map(stem);

    const matched = new Set<string>();
    let score = 0;
    for (const qs of qStems) {
      if (kwTokens.includes(qs)) {
        score += 3;
        matched.add(qs);
      } else if (tagTokens.includes(qs)) {
        score += 2;
        matched.add(qs);
      } else if (titleTokens.includes(qs)) {
        score += 1.5;
        matched.add(qs);
      } else if (textTokens.includes(qs)) {
        score += 1;
        matched.add(qs);
      }
    }
    // Normalise by query size so short and long questions are comparable.
    const norm = score / (qStems.size * 3);
    if (norm >= minScore) {
      scored.push({
        ...p,
        source,
        score: Math.min(1, norm),
        matchedTerms: [...matched],
      });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

export interface RetrievalConfidence {
  level: 'none' | 'weak' | 'moderate' | 'strong';
  topScore: number;
  passageCount: number;
  allVerified: boolean;
  anyDemo: boolean;
}

export function assessRetrieval(passages: RetrievedPassage[]): RetrievalConfidence {
  if (passages.length === 0) {
    return { level: 'none', topScore: 0, passageCount: 0, allVerified: false, anyDemo: false };
  }
  const topScore = passages[0].score;
  const allVerified = passages.every((p) => p.status === 'VERIFIED');
  const anyDemo = passages.some((p) => p.status === 'DEMO');
  const level: RetrievalConfidence['level'] =
    topScore >= 0.6 && passages.length >= 2 ? 'strong' : topScore >= 0.35 ? 'moderate' : 'weak';
  return { level, topScore, passageCount: passages.length, allVerified, anyDemo };
}
