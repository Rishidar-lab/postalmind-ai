import type { Metadata } from 'next';
import Link from 'next/link';
import { getStore } from '@/lib/store';
import { listSources } from '@/lib/sources/registry';
import { RULE_CHANGES } from '@/content/changes';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Ask PostalMind, your cases, quick incident capture, workday log, rule changes, the source library and Ground Reality — in one place.',
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const store = await getStore();
  const cases = await store.listCases();
  const sources = listSources();

  const CARDS = [
    { href: '/ask', title: 'Ask PostalMind', body: 'Source-grounded answers, labelled VERIFIED / INFERENCE / UNVERIFIED / UNKNOWN.', stat: null },
    { href: '/evidence/cases', title: 'My cases', body: 'Cases in this store.', stat: `${cases.length} case${cases.length === 1 ? '' : 's'}` },
    { href: '/evidence/quick', title: 'Quick incident', body: 'Capture one incident fast, on this device.', stat: null },
    { href: '/tools/workday', title: 'Workday log', body: 'A local, day-by-day record of hours and duties.', stat: 'on this device' },
    { href: '/changes', title: 'Rule changes', body: 'Compare old vs. new wording deterministically; browse verified changes.', stat: `${RULE_CHANGES.length} logged` },
    { href: '/sources', title: 'Source library', body: 'What PostalMind cites, with source class and verification status.', stat: `${sources.length} source${sources.length === 1 ? '' : 's'}` },
    { href: '/ground-reality', title: 'Ground Reality', body: 'The evidence-led series on GDS working conditions.', stat: null },
  ];

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="label-strong">Dashboard</p>
        <h1 className="mt-2 text-3xl">Start here</h1>
        <p className="mt-3 text-muted">
          Every number below is a real, current count from this store or registry — not a vanity
          metric. Workday Log and Quick Incident are stored only on this device, so no count is shown
          for them here.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className="card block transition-colors hover:border-accent">
            <h2 className="text-lg">{c.title}</h2>
            <p className="mt-1 text-[14px] text-muted">{c.body}</p>
            {c.stat && <p className="mt-3 text-[12px] text-faint">{c.stat}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
