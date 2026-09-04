import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Ground Reality',
  description:
    'An evidence-led editorial series on the working reality of Gramin Dak Sevaks — every claim carrying its source, evidence basis and qualification.',
};

const SECTIONS = [
  { n: '01', t: 'Who is a GDS?', s: 'The engagement category, in plain terms, and why it is distinct from a departmental post.', status: 'draft' },
  { n: '02', t: 'Responsibility without parity', s: 'Cash handling, savings-bank work, business targets and accountability, set against the allowance structure.', status: 'draft' },
  { n: '03', t: 'Working hours vs working reality', s: 'What the workload-assessment slabs say, and what a branch day actually contains.', status: 'draft' },
  { n: '04', t: 'Target culture', s: 'How RPLI / IPPB / small-savings targets are set and reviewed, and where incentives end and pressure begins.', status: 'draft' },
  { n: '05', t: 'When targets become pressure', s: 'The evidence categories that distinguish a review from sustained individual pressure.', status: 'draft' },
  { n: '06', t: 'Public performance comparison', s: 'Ranking sheets and group-channel naming — what the record shows and what it does not.', status: 'draft' },
  { n: '07', t: 'After-hours communication', s: 'Messages outside working hours and on holidays: a time fact, and when it compounds.', status: 'draft' },
  { n: '08', t: 'Documented GDS workplace cases', s: 'Reported cases, each classified by source quality, with careful language on causation.', status: 'planned' },
  { n: '09', t: 'What the evidence shows', s: 'The conclusions the collected material can support.', status: 'planned' },
  { n: '10', t: 'What the evidence does not show', s: 'The conclusions it cannot support — stated as plainly as the rest.', status: 'planned' },
  { n: '11', t: 'What should change', s: 'Specific, sourced proposals.', status: 'planned' },
];

export default function GroundRealityPage() {
  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="label-strong">Ground Reality — a PostalMind AI evidence project</p>
        <h1 className="mt-2 text-3xl">The working reality of Gramin Dak Sevaks</h1>
        <p className="mt-3 text-muted">
          A structured series. Every published claim carries a source, an evidence basis, a date and
          a qualification where one is needed. It reports what the evidence shows and, with equal
          prominence, what it does not. It is not campaign material.
        </p>
      </header>

      <div className="card text-[13px] text-muted">
        <p className="label-strong">Editorial standard</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Documented cases are classified: news report · FIR reported · union allegation · department response · court/tribunal record · official document · unverified claim.</li>
          <li>Causation is never asserted without an authoritative finding. &ldquo;Death reported in connection with allegations of&hellip;&rdquo;, not &ldquo;caused by&rdquo;.</li>
          <li>Individuals are named only where naming is necessary to the point; role labels otherwise.</li>
          <li>Every section passes the <Link href="/methodology#publication" className="text-accent underline underline-offset-2">publication safety check</Link> before it goes up.</li>
        </ul>
      </div>

      <ol className="space-y-3">
        {SECTIONS.map((sec) => (
          <li key={sec.n} className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[12px] text-faint">{sec.n}</p>
                <h2 className="mt-0.5 text-lg">{sec.t}</h2>
                <p className="mt-1 text-[14px] text-muted">{sec.s}</p>
              </div>
              <span className={`chip ${sec.status === 'planned' ? 'chip-unknown' : 'chip-unverified'}`}>
                {sec.status === 'planned' ? 'Planned' : 'In draft'}
              </span>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-[13px] text-faint">
        Sections are published as their sourcing is completed. The framework is fixed; the content is
        being written to the standard above rather than rushed.
      </p>
    </div>
  );
}
