import type { Metadata } from 'next';
import Link from 'next/link';
import { RULE_CHANGES } from '@/content/changes';
import { RuleDiffClient } from '@/components/rule-diff-client';

export const metadata: Metadata = {
  title: 'Rule changes',
  description: 'Compare old and new wording of a circular or rule with a deterministic difference — and browse changes PostalMind has verified.',
};

export const dynamic = 'force-static';

export default function ChangesPage() {
  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="label-strong">Rule Change Tracker</p>
        <h1 className="mt-2 text-3xl">Is this circular still current?</h1>
        <p className="mt-3 text-muted">
          A rule or TRCA slab can be superseded without most GDS ever seeing a side-by-side comparison.
          This tool computes what changed between two versions using a deterministic text comparison —
          never a model guessing at differences. Below that, PostalMind lists rule changes a maintainer
          has verified and logged.
        </p>
      </header>

      <RuleDiffClient />

      <section className="space-y-3">
        <p className="label-strong">Verified rule changes</p>
        {RULE_CHANGES.length === 0 ? (
          <div className="card text-[14px] text-muted">
            <p className="label-strong text-ink">No verified rule changes logged yet</p>
            <p className="mt-2">
              This is not a claim that no GDS rule has changed — it means PostalMind does not yet hold
              two verified, dated versions of any document to compare and log. Use the tool above with
              your own copies, or see the{' '}
              <Link href="/sources" className="text-accent underline underline-offset-2">source library</Link>{' '}
              for what is currently on file.
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {RULE_CHANGES.map((c) => (
              <li key={c.id} id={c.id} className="card">
                <h2 className="text-lg">{c.title}</h2>
                <dl className="mt-3 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
                  <div>
                    <dt className="label-strong">Old wording ({c.oldLabel}{c.oldDate ? `, ${c.oldDate}` : ''})</dt>
                    <dd className="mt-1 text-muted">{c.oldText}</dd>
                  </div>
                  <div>
                    <dt className="label-strong">New wording ({c.newLabel}{c.newDate ? `, ${c.newDate}` : ''})</dt>
                    <dd className="mt-1 text-ink">{c.newText}</dd>
                  </div>
                  <div>
                    <dt className="label-strong">Effective date</dt>
                    <dd className="mt-1 text-muted">{c.effectiveDate ?? 'not stated'}</dd>
                  </div>
                  <div>
                    <dt className="label-strong">Source</dt>
                    <dd className="mt-1 text-muted">{c.source}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="label-strong">Impact</dt>
                    <dd className="mt-1 text-muted">{c.impact}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
