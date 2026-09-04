import type { Metadata } from 'next';
import Link from 'next/link';
import { getStore } from '@/lib/store';
import { DEMO_CASE_ID } from '@/lib/store/seed';
import { PatternView } from '@/components/evidence-views';
import { detectPatterns, PATTERN_DISCLAIMER } from '@/lib/evidence/patterns';

export const metadata: Metadata = { title: 'Pattern analysis' };
export const dynamic = 'force-dynamic';

export default async function PatternsPage() {
  const store = await getStore();
  const c = await store.getCase(DEMO_CASE_ID);
  const items = c ? await store.listItems(DEMO_CASE_ID) : [];
  const categories: Record<string, number> = {};
  for (const it of items) for (const cat of it.category) categories[cat] = (categories[cat] ?? 0) + 1;

  const supervisory = new Set(items.filter((i) => i.speakerRole === 'SUPERVISORY').map((i) => i.speakerLabel));
  const employees = new Set(items.filter((i) => i.speakerRole === 'SUBJECT_EMPLOYEE').map((i) => i.speakerLabel));

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="label-strong">Evidence · Patterns</p>
        <h1 className="mt-2 text-3xl">Pattern analysis</h1>
        <p className="mt-3 text-muted">
          A straight tally of classifier output for the seeded demo case <code>{DEMO_CASE_ID}</code>.
          No fabricated statistics. Build one from your own export via{' '}
          <Link href="/evidence/import" className="text-accent underline underline-offset-2">Import</Link>.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Evidence items" value={String(items.length)} />
        <Metric label="Supervisory actors" value={String(supervisory.size)} />
        <Metric label="Affected employees" value={String(employees.size)} />
      </section>

      <PatternView categories={categories} isDemo={c?.isDemo ?? true} />

      <ObservedPatterns items={items} />

      <section className="card text-[13px] text-muted">
        <p className="label-strong">Reading this table</p>
        <p className="mt-2">
          Rows in the &ldquo;neutral by default&rdquo; column marked <strong>yes</strong> (target
          instruction, performance expectation, after-hours communication, inspection reference) are
          not indicators of misconduct on their own. The value of the tally is in seeing which
          non-neutral categories recur, and how often, across a defined window.
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

function ObservedPatterns({ items }: { items: Parameters<typeof detectPatterns>[0] }) {
  const patterns = detectPatterns(items);
  return (
    <section className="card">
      <p className="label-strong">Observed patterns (Target Pressure Analyzer 2.0)</p>
      <p className="mt-1 text-[13px] text-muted">
        Deterministic sequence/timing detection across dated evidence items — not a legal conclusion.
      </p>
      {patterns.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted">
          No pattern from the current rule set was detected in this case&rsquo;s dated evidence.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {patterns.map((p) => (
            <li key={p.id} className="rounded border border-line p-3 text-[13.5px]">
              <p className="font-semibold" style={{ color: 'var(--warn)' }}>
                {p.description}
              </p>
              <p className="mt-1 text-[12px] text-faint">
                {p.dayCount} day(s) involved · {p.itemIds.length} evidence item(s) · categories:{' '}
                {p.categoriesInvolved.map((c) => c.replace(/_/g, ' ').toLowerCase()).join(', ')}
              </p>
            </li>
          ))}
          <li className="text-[12px] text-faint">{PATTERN_DISCLAIMER}</li>
        </ul>
      )}
    </section>
  );
}
