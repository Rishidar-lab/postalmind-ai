import type { Metadata } from 'next';
import { AskClient } from '@/components/ask-client';

export const metadata: Metadata = {
  title: 'Ask PostalMind',
  description:
    'Source-grounded answers on GDS rules, TRCA, leave, RTI and postal financial services. Every answer labelled VERIFIED, INFERENCE, UNVERIFIED or UNKNOWN.',
};

export default function AskPage() {
  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="label-strong">Ask PostalMind</p>
        <h1 className="mt-2 text-3xl">Source-grounded answers</h1>
        <p className="mt-3 text-muted">
          PostalMind retrieves source material before answering and constrains any language model to
          that material. It labels each answer by how well it is supported, and cites what it used.
          If it cannot find authoritative material, it says <strong>UNKNOWN</strong> rather than
          guessing a rule number or rate.
        </p>
      </header>
      <AskClient />
      <section className="card text-[13px] text-muted">
        <p className="label-strong">What the labels mean</p>
        <ul className="mt-2 space-y-1.5">
          <li><strong className="text-ink">VERIFIED</strong> — supported by a source a maintainer has checked against the primary document.</li>
          <li><strong className="text-ink">INFERENCE</strong> — reasoning across cited sources, not a direct quote.</li>
          <li><strong className="text-ink">UNVERIFIED</strong> — based on project summaries not yet checked line-by-line against the primary document.</li>
          <li><strong className="text-ink">UNKNOWN</strong> — no authoritative source retrieved; PostalMind declines to answer.</li>
        </ul>
        <p className="mt-3">
          Nothing here is legal advice. For a service matter, cite the primary document and consult
          your Divisional office or union.
        </p>
      </section>
    </div>
  );
}
