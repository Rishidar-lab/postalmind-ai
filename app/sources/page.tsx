import type { Metadata } from 'next';
import { listPassages, listSources } from '@/lib/sources/registry';
import { SourceStatusChip } from '@/components/chips';
import { DOCUMENT_TYPES } from '@/lib/sources/types';

export const metadata: Metadata = {
  title: 'Source library',
  description: 'The documents PostalMind AI cites, with their status and links to the primary text.',
};

export const dynamic = 'force-static';

export default function SourcesPage() {
  const sources = listSources();
  const passages = listPassages();
  const passagesBySource = passages.reduce<Record<string, number>>((a, p) => {
    a[p.sourceId] = (a[p.sourceId] ?? 0) + 1;
    return a;
  }, {});
  const counts = sources.reduce<Record<string, number>>((a, s) => {
    a[s.status] = (a[s.status] ?? 0) + 1;
    return a;
  }, {});

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="label-strong">Source library</p>
        <h1 className="mt-2 text-3xl">What PostalMind cites</h1>
        <p className="mt-3 text-muted">
          {sources.length} source records · {passages.length} retrieval passages ·{' '}
          {counts.VERIFIED ?? 0} verified, {counts.UNVERIFIED ?? 0} unverified summaries,{' '}
          {counts.DEMO ?? 0} demo.
        </p>
        <p className="mt-2 text-[13px] text-faint">
          <strong>Verified</strong> means a maintainer checked the passage against the primary
          document and recorded its hash. <strong>Unverified summary</strong> means it is a
          project paraphrase — open the source before relying on it. The library is intentionally
          small; growing it is the main editorial task.
        </p>
      </header>

      <div className="space-y-3">
        {sources.map((s) => (
          <article key={s.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg">{s.title}</h2>
              <SourceStatusChip value={s.status} />
            </div>
            <p className="mt-1 text-[13px] text-muted">
              {s.authority}
              {s.date ? ` · ${s.date}` : ''}
              {s.effectiveDate && s.effectiveDate !== s.date ? ` · effective ${s.effectiveDate}` : ''}
            </p>
            <p className="mt-2 text-[14px]">{s.summary}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-faint">
              <span className="badge normal-case tracking-normal">{prettyType(s.documentType)}</span>
              <span>{passagesBySource[s.id] ?? 0} passage(s)</span>
              {s.sha256 ? <span>sha256 recorded</span> : <span>no local mirror yet</span>}
              {s.tags.slice(0, 5).map((t) => (
                <span key={t} className="badge normal-case tracking-normal">
                  {t}
                </span>
              ))}
            </div>
            {s.sourceUrl && (
              <a
                href={s.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-[13px] text-accent underline underline-offset-2"
              >
                Primary document ↗
              </a>
            )}
          </article>
        ))}
      </div>

      <section className="card text-[13px] text-muted">
        <p className="label-strong">Document types tracked</p>
        <p className="mt-2">{DOCUMENT_TYPES.map(prettyType).join(' · ')}</p>
      </section>
    </div>
  );
}

function prettyType(t: string): string {
  return t
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
