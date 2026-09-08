'use client';

import { useState } from 'react';
import { ClassificationChip, SourceStatusChip } from './chips';

interface Citation {
  ref: string;
  sourceId: string;
  passageId?: string;
  title: string;
  authority: string;
  date: string | null;
  url: string | null;
  canonicalUrl?: string | null;
  documentNumber?: string | null;
  section: string | null;
  page: number | null;
  status: 'VERIFIED' | 'UNVERIFIED' | 'DEMO';
  verifiedAt?: string | null;
  sha256?: string | null;
  score: number;
}
interface AnswerClaim {
  id: string;
  text: string;
  citationRefs: string[];
  support: 'DIRECT' | 'INFERENCE' | 'UNSUPPORTED';
}
interface AskResult {
  classification: 'VERIFIED' | 'INFERENCE' | 'UNVERIFIED' | 'UNKNOWN';
  answer: string;
  directAnswer?: string;
  claims?: AnswerClaim[];
  qualifications?: string[];
  citations: Citation[];
  notice: string;
  mode: string;
  model: string | null;
  retrieval: { level: string; passageCount: number; topScore?: number };
  uncitedClaimWarnings: string[];
  rationale: string;
  limits: string[];
}

const EXAMPLES = [
  'What does the GDS engagement framework say about disciplinary procedure?',
  'What is TRCA and when was it revised?',
  'How long does a PIO have to answer an RTI application?',
  'என் TRCA தாமதம் — RTI போட எப்படி?',
];

export function AskClient() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<AskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(q: string) {
    const query = q.trim();
    if (!query || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setResult(data as AskResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(question);
        }}
        className="card"
      >
        <label htmlFor="q" className="label-strong">
          Your question
        </label>
        <textarea
          id="q"
          className="field mt-2 min-h-[84px] resize-y"
          placeholder="Ask about GDS rules, TRCA, leave, RTI, or postal financial services…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={6000}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[12px] text-faint">
            Answers are tied to retrieved sources. PostalMind will say &ldquo;unknown&rdquo; rather than guess.
          </span>
          <button type="submit" className="btn btn-primary" disabled={loading || !question.trim()}>
            {loading ? 'Retrieving…' : 'Ask'}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            className="badge normal-case tracking-normal hover:border-accent hover:text-accent"
            onClick={() => {
              setQuestion(ex);
              run(ex);
            }}
            disabled={loading}
          >
            {ex}
          </button>
        ))}
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)' }}>
          <p className="text-[13px]" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex flex-wrap items-center gap-2">
              <ClassificationChip value={result.classification} />
              <span className="text-[12px] text-faint">
                {result.mode === 'model' ? 'Composed answer' : result.mode === 'extractive' ? 'Source-only answer' : 'No answer'}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{result.answer}</p>
            <p className="mt-4 border-t border-line pt-3 text-[12.5px] text-muted">{result.notice}</p>
            <p className="mt-1 text-[11.5px] text-faint">Sources determine verification status; the model does not.</p>

            <details className="mt-3 text-[12.5px]">
              <summary className="cursor-pointer select-none text-muted">Why this answer / what it does not establish</summary>
              <div className="mt-2 space-y-2 border-t border-line pt-2">
                <div>
                  <p className="label-strong">Why this answer</p>
                  <p className="mt-1 text-muted">{result.rationale}</p>
                </div>
                <div>
                  <p className="label-strong">What this does NOT establish</p>
                  <ul className="mt-1 list-disc pl-5 text-muted">
                    {result.limits.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>

            <details className="mt-2 text-[12px]">
              <summary className="cursor-pointer select-none text-faint">Technical details</summary>
              <div className="mt-2 space-y-1 border-t border-line pt-2 text-faint">
                <p>
                  Retrieval: {result.retrieval.passageCount} passage{result.retrieval.passageCount === 1 ? '' : 's'} ({result.retrieval.level} match)
                  {result.mode === 'model' && result.model ? ` · composed with ${result.model} via OpenRouter` : ''}
                  {result.mode === 'extractive' ? ' · deterministic source-only synthesis' : ''}
                </p>
                {result.citations.some((c) => c.sha256) && (
                  <p className="break-all">
                    Primary-document fingerprints:{' '}
                    {result.citations
                      .filter((c) => c.sha256)
                      .map((c) => `${c.ref} ${c.sha256!.slice(0, 16)}…`)
                      .join(' · ')}
                  </p>
                )}
              </div>
            </details>

            {result.classification !== 'VERIFIED' && result.uncitedClaimWarnings.length > 0 && (
              <div className="mt-3 rounded border border-line bg-accent-soft p-3 text-[12.5px]">
                <p className="font-semibold" style={{ color: 'var(--warn)' }}>
                  Sentences removed or flagged before display — treat with caution:
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {result.uncitedClaimWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {result.citations.length > 0 && (
            <div className="card">
              <p className="label-strong">Sources</p>
              <ul className="mt-3 space-y-3">
                {result.citations.map((c) => (
                  <li key={c.ref} className="text-[13px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge">{c.ref}</span>
                      <SourceStatusChip value={c.status} />
                    </div>
                    <p className="mt-1 font-medium">{c.title}</p>
                    <p className="text-muted">
                      {c.authority}
                      {c.documentNumber ? ` · ${c.documentNumber}` : ''}
                      {c.date ? ` · ${c.date}` : ''}
                      {c.section ? ` · ${c.section}` : ''}
                      {c.page ? ` · p.${c.page}` : ''}
                      {c.status === 'VERIFIED' && c.verifiedAt ? ` · checked ${c.verifiedAt.slice(0, 10)}` : ''}
                    </p>
                    {(c.canonicalUrl ?? c.url) && (
                      <a
                        href={(c.canonicalUrl ?? c.url) as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent underline underline-offset-2"
                      >
                        Open source ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
