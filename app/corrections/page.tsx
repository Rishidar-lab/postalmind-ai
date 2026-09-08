import type { Metadata } from 'next';
import Link from 'next/link';
import { CORRECTIONS } from '@/content/corrections';

export const metadata: Metadata = {
  title: 'Corrections',
  description: 'Every factual correction PostalMind AI has made to a published claim, logged openly.',
};

export const dynamic = 'force-static';

export default function CorrectionsPage() {
  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="label-strong">Corrections</p>
        <h1 className="mt-2 text-3xl">Every correction, logged</h1>
        <p className="mt-3 text-muted">
          PostalMind will correct factual errors. When it does, the original claim, the corrected
          claim, the reason, the date and the source are all preserved here — never silently edited
          away. Full policy: <Link href="/methodology" className="text-accent underline underline-offset-2">methodology</Link> and{' '}
          <code>docs/CORRECTIONS-POLICY.md</code> in the repository.
        </p>
      </header>

      {CORRECTIONS.length === 0 ? (
        <div className="card text-[14px] text-muted">
          <p className="label-strong text-ink">No corrections logged yet</p>
          <p className="mt-2">
            This is not a claim that everything published so far is error-free — it means no error has
            been identified and corrected yet. Found one? See <code>SECURITY.md</code> for how to
            report it, or open an issue on the repository. It will be checked against its source and,
            if it is wrong, logged here — not quietly fixed.
          </p>
        </div>
      ) : (
        <ol className="space-y-4">
          {CORRECTIONS.map((c) => (
            <li key={c.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[12px] text-faint">{c.date}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="badge normal-case tracking-normal"
                    style={c.severity === 'RETRACTION' || c.severity === 'FACTUAL_CORRECTION' ? { borderColor: 'var(--danger)', color: 'var(--danger)' } : undefined}
                  >
                    {c.severity.replace(/_/g, ' ').toLowerCase()}
                  </span>
                  <span className="badge normal-case tracking-normal">{c.location}</span>
                </div>
              </div>
              <dl className="mt-3 space-y-2 text-[13px]">
                <div>
                  <dt className="label-strong">Original claim</dt>
                  <dd className="mt-1 text-muted">{c.originalClaim}</dd>
                </div>
                <div>
                  <dt className="label-strong">Corrected claim</dt>
                  <dd className="mt-1 text-ink">{c.correctedClaim}</dd>
                </div>
                <div>
                  <dt className="label-strong">Reason</dt>
                  <dd className="mt-1 text-muted">{c.reason}</dd>
                </div>
                <div>
                  <dt className="label-strong">Source</dt>
                  <dd className="mt-1 text-muted">{c.source}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
