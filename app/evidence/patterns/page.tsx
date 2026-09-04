import type { Metadata } from 'next';
import Link from 'next/link';
import { getStore } from '@/lib/store';
import { DEMO_CASE_ID } from '@/lib/store/seed';
import { PatternView } from '@/components/evidence-views';

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
