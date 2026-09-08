import type { Metadata } from 'next';
import Link from 'next/link';
import { getStore } from '@/lib/store';

export const metadata: Metadata = {
  title: 'Evidence',
  description: 'Preserve, organise and analyse workplace evidence — privately, and without overstating it.',
};

export const dynamic = 'force-dynamic';

export default async function EvidenceDashboard() {
  const store = await getStore();
  const cases = await store.listCases();

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="label-strong">Evidence</p>
        <h1 className="mt-2 text-3xl">Evidence dashboard</h1>
        <p className="mt-3 text-muted">
          Tools to preserve, organise, analyse and — carefully — present workplace evidence. The
          system is built to tell you when your evidence <em>does not</em> prove your claim.
        </p>
      </header>

      {!store.durable && (
        <div className="card text-[13px]" style={{ borderColor: 'var(--warn)' }}>
          <p className="font-semibold" style={{ color: 'var(--warn)' }}>
            Demo persistence
          </p>
          <p className="mt-1 text-muted">
            This deployment uses an in-memory store: cases you create are <strong>not durable</strong>{' '}
            and reset on restart. The &ldquo;Analyse&rdquo; workflow is fully functional and never
            needed persistence. Configure a database for durable cases — see the README.
          </p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <Link href="/evidence/import" className="card block hover:border-accent">
          <p className="label-strong">Import</p>
          <p className="mt-1 text-[14px]">Analyse a WhatsApp export or paste messages. Local, not saved.</p>
        </Link>
        <Link href="/evidence/quick" className="card block hover:border-accent">
          <p className="label-strong">Quick Incident</p>
          <p className="mt-1 text-[14px]">Record one message in under 30 seconds. Local-only.</p>
        </Link>
        <Link href="/evidence/vault" className="card block hover:border-accent">
          <p className="label-strong">Local vault</p>
          <p className="mt-1 text-[14px]">Durable on-device cases + .postalmind-case backup.</p>
        </Link>
        <Link href="/evidence/mela" className="card block hover:border-accent">
          <p className="label-strong">Mela template</p>
          <p className="mt-1 text-[14px]">PRE / EVENT-DAY / POST template for PM-GDS-MELA-2026-09-10.</p>
        </Link>
        <Link href="/evidence/timeline" className="card block hover:border-accent">
          <p className="label-strong">Timeline</p>
          <p className="mt-1 text-[14px]">PRE-EVENT / EVENT-DAY / POST-EVENT view with activity clusters.</p>
        </Link>
        <Link href="/evidence/patterns" className="card block hover:border-accent">
          <p className="label-strong">Patterns</p>
          <p className="mt-1 text-[14px]">Category tally across a case. No fabricated statistics.</p>
        </Link>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <p className="label-strong">Cases</p>
          <Link href="/evidence/cases" className="text-[13px] text-accent underline underline-offset-2">
            All cases →
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {cases.map((c) => (
            <Link key={c.id} href={`/evidence/cases/${c.id}`} className="card block hover:border-accent">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg">{c.title}</h2>
                <div className="flex items-center gap-2">
                  {c.isDemo && <span className="chip chip-unknown">Demo</span>}
                  <span className="badge normal-case tracking-normal">{c.status}</span>
                </div>
              </div>
              <p className="mt-1 text-[13px] text-muted line-clamp-2">{c.description}</p>
              <p className="mt-2 text-[12px] text-faint">
                {c.sourceCount} source(s) · {c.evidenceItemCount} evidence item(s)
                {c.eventDate ? ` · event ${c.eventDate}` : ''}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="card text-[13px] text-muted">
        <p className="label-strong">The Mela case</p>
        <p className="mt-2">
          The seeded demo case <code>PM-GDS-MELA-2026-09-10</code> is built from a fully synthetic
          WhatsApp export — no real names, numbers or offices. It demonstrates how PostalMind
          distinguishes an ordinary target instruction from repeated pressure, a peer comparison, an
          after-hours message and an explicit threat, and how it records counter-evidence.
        </p>
      </section>
    </div>
  );
}
