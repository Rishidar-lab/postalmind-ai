import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Disclaimer & Independence',
  description: 'PostalMind AI is an independent project, not affiliated with or endorsed by India Post.',
};

export default function DisclaimerPage() {
  return (
    <article className="prose-block">
      <p className="label-strong">Disclaimer</p>
      <h1 className="text-3xl">Independence &amp; disclaimer</h1>

      <div className="card my-5 not-prose">
        <p className="text-[15px] font-medium">
          Independent project. Not affiliated with or endorsed by India Post or the Department of
          Posts, Ministry of Communications, or the Government of India.
        </p>
      </div>

      <h2>No official status</h2>
      <p>
        PostalMind AI is a personal, public-interest project. It is not an India Post product, is not
        commissioned or reviewed by the Department of Posts, and does not speak for the Department,
        any Circle, Region, Division, or office. The postal terms used on this site (GDS, BO, TRCA,
        RPLI, IPPB, POSB and others) are used descriptively to discuss publicly documented rules and
        working conditions.
      </p>

      <h2>Not legal advice</h2>
      <p>
        Nothing on this site is legal advice or a substitute for it. Evidence classifications are
        <em> evidence categories</em>, not findings of misconduct, harassment, retaliation or
        illegality. Answers about rules are pointers to source documents, not authoritative
        interpretations. For any service matter, disciplinary matter, or dispute, consult the
        primary circular, your Divisional office, a recognised service union, or a lawyer.
      </p>

      <h2>Sources and accuracy</h2>
      <p>
        PostalMind cites the documents it relies on. Many passages in its library are marked
        <strong> UNVERIFIED</strong> — they are project summaries that have not yet been checked
        line-by-line against the primary document. Always open the linked source before relying on a
        rule number, date, order number or rate. Small-savings interest rates change every quarter
        and are never stated from memory.
      </p>

      <h2>Evidence and publication</h2>
      <p>
        The evidence tools are designed to help a worker preserve, organise and understand their own
        records. They deliberately resist turning that material into unsupported public accusation:
        a claim that a piece of evidence does not prove is reported as not proven, and a potentially
        defamatory factual claim that lacks evidence is warned or blocked before any public export.
      </p>

      <h2>Project history</h2>
      <p>
        PostalMind AI began as a submission to the Novita &times; Kilo Code Hackathon (July 2026). It
        is being rebuilt as a durable tool. The hackathon origin is recorded here for transparency;
        it confers no endorsement.
      </p>
    </article>
  );
}
