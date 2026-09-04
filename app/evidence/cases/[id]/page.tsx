import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStore } from '@/lib/store';
import { buildTimeline } from '@/lib/evidence/timeline';
import { caseStrengthSummary } from '@/lib/evidence/strength';
import { EvidenceItemCard, PatternView, TimelineView } from '@/components/evidence-views';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const store = await getStore();
  const c = await store.getCase(id);
  return { title: c ? c.title : 'Case' };
}

export default async function CaseWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const caseRecord = await store.getCase(id);
  if (!caseRecord) notFound();

  const [sources, items, audit] = await Promise.all([
    store.listSources(id),
    store.listItems(id),
    store.listAudit(id),
  ]);
  const timeline = buildTimeline(items, { centralEventDate: caseRecord.eventDate });
  const strength = caseStrengthSummary(items);
  const categories: Record<string, number> = {};
  for (const it of items) for (const c of it.category) categories[c] = (categories[c] ?? 0) + 1;

  return (
    <div className="space-y-8">
      <header>
        <p className="label-strong">Case workspace</p>
        <h1 className="mt-2 text-3xl">{caseRecord.title}</h1>
        <p className="mt-1 font-mono text-[12px] text-faint">{caseRecord.id}</p>
        <p className="mt-3 max-w-2xl text-muted">{caseRecord.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
          <span className="badge normal-case tracking-normal">{caseRecord.status}</span>
          <span className="badge normal-case tracking-normal">confidentiality: {caseRecord.confidentialityLevel}</span>
          {caseRecord.eventDate && <span className="badge normal-case tracking-normal">event {caseRecord.eventDate}</span>}
          {caseRecord.isDemo && <span className="chip chip-unknown">Demo — synthetic data</span>}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Sources" value={String(sources.length)} />
        <Metric label="Evidence items" value={String(items.length)} />
        <Metric label="Strongest item" value={strength.strongest} />
        <Metric
          label="Strength spread"
          value={`${strength.distribution.MODERATE}M / ${strength.distribution.WEAK}W / ${strength.distribution.INSUFFICIENT}I`}
        />
      </section>

      <section>
        <p className="label-strong">Timeline</p>
        <div className="mt-3">
          <TimelineView timeline={timeline} />
        </div>
      </section>

      <section>
        <p className="label-strong">Patterns</p>
        <div className="mt-3">
          <PatternView categories={categories} isDemo={caseRecord.isDemo} />
        </div>
      </section>

      <section>
        <p className="label-strong">Evidence items</p>
        <div className="mt-3 space-y-3">
          {items.map((it) => (
            <EvidenceItemCard key={it.id} item={it} />
          ))}
        </div>
      </section>

      <section>
        <p className="label-strong">Sources</p>
        <div className="mt-3 space-y-2">
          {sources.map((s) => (
            <div key={s.id} className="card text-[13px]">
              <p className="font-medium">{s.originalFilename}</p>
              <p className="text-muted">
                {s.type} · {s.byteLength} bytes · sha256 {s.sha256.slice(0, 16)}…
                {s.isOriginalImmutable ? ' · immutable original' : ''}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="label-strong">Audit log</p>
        <ol className="mt-3 space-y-1.5 text-[12.5px] text-muted">
          {audit.map((a) => (
            <li key={a.id}>
              <span className="font-mono text-faint">{a.at.replace('T', ' ').slice(0, 19)}</span>{' '}
              <span className="badge normal-case tracking-normal">{a.action}</span> {a.summary}
            </li>
          ))}
          {audit.length === 0 && <li>No audit entries.</li>}
        </ol>
      </section>

      <section className="card text-[13px] text-muted">
        <p className="label-strong">What this case does — and does not — show</p>
        <p className="mt-2">
          The classifications above establish that communications of a certain character occurred and
          recurred. They do <strong>not</strong> establish harassment, retaliation, misconduct or
          illegality — those require the full context, corroboration and an authoritative process.
          One item is deliberately recorded as counter-evidence.
        </p>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-line p-3">
      <p className="text-[11px] uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-0.5 font-serif text-lg">{value}</p>
    </div>
  );
}
