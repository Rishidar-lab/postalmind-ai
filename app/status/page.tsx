import type { Metadata } from 'next';
import Link from 'next/link';
import { retrieve } from '@/lib/sources/registry';

export const metadata: Metadata = {
  title: 'Know your status',
  description: 'What a Gramin Dak Sevak is, what the engagement rules cover, and what TRCA and leave mean — each point linked to its source.',
};

const TOPICS = [
  {
    q: 'What is a Gramin Dak Sevak, in service terms?',
    take:
      'GDS are engaged by the Department of Posts under a distinct rule set and are held outside the regular civil-service establishment; conduct and discipline run under the GDS (Conduct and Engagement) Rules, 2020.',
  },
  {
    q: 'What does the 2020 engagement framework cover?',
    take:
      'Engagement, conduct obligations, "put off duty", the disciplinary authorities and penalties, and appeal — any adverse consequence must follow the Rules’ procedure.',
  },
  {
    q: 'What is TRCA and when was it revised?',
    take:
      'Time Related Continuity Allowance is the monthly allowance paid to GDS in place of pay. A revised two-level structure took effect 1 July 2018 with arrears; the figure depends on category and working-hour slab.',
  },
  {
    q: 'What working-hours norms apply?',
    take:
      'The GDS Committee framework moved GDS toward defined working-hour slabs based on a workload assessment of the branch office; the slab drives the TRCA.',
  },
  {
    q: 'What paid leave do GDS get?',
    take:
      'Paid leave is provided under departmental instructions, creditable to a leave account with an accumulation ceiling and encashment on discharge; maternity leave and leave without allowance are separate.',
  },
];

export const dynamic = 'force-static';

export default function StatusPage() {
  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="label-strong">Know your status</p>
        <h1 className="mt-2 text-3xl">Duties, service conditions, sources</h1>
        <p className="mt-3 text-muted">
          Short, source-linked takes on the questions GDS employees ask most. Each is a pointer to a
          document — open it before relying on a rule, date or figure. For the full answer with
          citations, send the question to{' '}
          <Link href="/ask" className="text-accent underline underline-offset-2">Ask PostalMind</Link>.
        </p>
      </header>

      <div className="space-y-3">
        {TOPICS.map((t) => {
          const hits = retrieve(t.q, { limit: 2 });
          return (
            <article key={t.q} className="card">
              <h2 className="text-lg">{t.q}</h2>
              <p className="mt-2 text-[14px] text-muted">{t.take}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
                {hits.map((h) => (
                  <span key={h.id} className="badge normal-case tracking-normal">
                    {h.source.title}
                  </span>
                ))}
                <Link
                  href={`/ask`}
                  className="text-accent underline underline-offset-2"
                >
                  Ask with citations →
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <section className="card text-[13px] text-muted">
        <p className="label-strong">Caution</p>
        <p className="mt-2">
          The passages behind these takes are project summaries not yet checked line-by-line against
          the primary documents. They are a map to the source, not the source. Nothing here is legal
          advice.
        </p>
      </section>
    </div>
  );
}
