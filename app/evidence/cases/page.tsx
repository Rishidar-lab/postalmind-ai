import type { Metadata } from 'next';
import Link from 'next/link';
import { getStore } from '@/lib/store';

export const metadata: Metadata = { title: 'Cases' };
export const dynamic = 'force-dynamic';

export default async function CasesPage() {
  const store = await getStore();
  const cases = await store.listCases();

  return (
    <div className="space-y-6">
      <header>
        <p className="label-strong">Evidence</p>
        <h1 className="mt-2 text-3xl">Cases</h1>
        <p className="mt-2 text-muted">
          {cases.length} case(s). {store.durable ? 'Durable store.' : 'In-memory store — not durable.'}
        </p>
      </header>
      <ul className="space-y-3">
        {cases.map((c) => (
          <li key={c.id}>
            <Link href={`/evidence/cases/${c.id}`} className="card block hover:border-accent">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg">{c.title}</h2>
                {c.isDemo && <span className="chip chip-unknown">Demo</span>}
              </div>
              <p className="mt-1 text-[13px] text-muted">{c.description}</p>
              <p className="mt-2 font-mono text-[11px] text-faint">{c.id}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
