import Link from 'next/link';
import { getConfig } from '@/lib/config';

export default function HomePage() {
  const cfg = getConfig();
  return (
    <div className="space-y-16">
      {/* HERO */}
      <section className="max-w-3xl">
        <p className="label-strong">PostalMind AI</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">Ground reality. Verified.</h1>
        <p className="mt-4 text-lg text-muted">
          AI-powered knowledge, evidence analysis and practical tools built around the working
          reality of Gramin Dak Sevaks. Every answer is tied to a source, or it says it
          doesn&rsquo;t know.
        </p>
        <p className="mt-2 text-[14px] font-medium text-ink">
          Built from direct GDS operational experience.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/ask" className="btn btn-primary">Ask PostalMind</Link>
          <Link href="/evidence/import" className="btn">Analyse Evidence</Link>
          <Link href="/ground-reality" className="btn">Ground Reality</Link>
        </div>
        <p className="mt-4 text-[13px] text-faint">
          {cfg.demoMode
            ? 'Running in demo mode — no language model configured. The assistant shows retrieved sources rather than composing new claims.'
            : `Language model: ${cfg.ai.model}. Answers are still constrained to retrieved sources.`}
        </p>
        <p className="mt-2 text-[12.5px] text-faint">
          Independent project. Not affiliated with or endorsed by India Post or the Department of
          Posts.
        </p>
      </section>

      {/* FOUR PILLARS */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card
          href="/ask"
          kicker="Ask PostalMind"
          title="Rules, circulars, procedures — grounded"
          body="GDS CE Rules, TRCA, leave, RTI timelines, financial-service basics. PostalMind retrieves source material first and labels every answer VERIFIED, INFERENCE, UNVERIFIED or UNKNOWN. It will not invent a rule number, circular number or interest rate."
        />
        <Card
          href="/evidence"
          kicker="Analyse evidence"
          title="Messages, orders, documents — objectively"
          body="Import a WhatsApp export or screenshots. PostalMind parses it locally, classifies each message into evidence categories, rates evidence strength, builds a timeline, and helps you redact private data before anything is shared."
        />
        <Card
          href="/status"
          kicker="Know your status"
          title="Duties, service conditions, sources"
          body="What a GDS is, what the engagement rules say, what TRCA is and how it was revised — each point linked to the document it comes from."
        />
        <Card
          href="/ground-reality"
          kicker="Ground Reality"
          title="Evidence-led reporting on GDS working life"
          body="A structured editorial series on responsibility without parity, target culture, after-hours pressure and documented cases — every claim carrying its source, evidence basis and qualification."
        />
      </section>

      {/* HOW CLAIMS ARE VERIFIED */}
      <section className="card">
        <p className="label-strong">How claims are verified</p>
        <div className="mt-3 grid gap-4 text-[14px] text-muted sm:grid-cols-4">
          <div>
            <p className="font-semibold text-ink">1. Retrieve</p>
            <p className="mt-1">The question is matched against a library of source records and passages.</p>
          </div>
          <div>
            <p className="font-semibold text-ink">2. Constrain</p>
            <p className="mt-1">Any language model only sees the retrieved passages — never its own memory of &ldquo;the rules&rdquo;.</p>
          </div>
          <div>
            <p className="font-semibold text-ink">3. Classify</p>
            <p className="mt-1">VERIFIED / INFERENCE / UNVERIFIED / UNKNOWN, based on retrieval quality and citation checks.</p>
          </div>
          <div>
            <p className="font-semibold text-ink">4. Cite or decline</p>
            <p className="mt-1">If nothing authoritative is found, PostalMind says so instead of guessing.</p>
          </div>
        </div>
        <p className="mt-4 text-[13px]">
          <Link href="/methodology" className="text-accent underline underline-offset-2">
            Read the full methodology
          </Link>
        </p>
      </section>

      {/* PRIVACY */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <p className="label-strong">Privacy</p>
          <h3 className="mt-2 text-lg">Sensitive workplace evidence stays yours</h3>
          <p className="mt-2 text-[14px] text-muted">
            WhatsApp parsing, PII detection, redaction and hashing run locally in your request — the
            text is not sent to any AI provider. Nothing becomes public automatically; a
            twelve-point safety check must pass first.
          </p>
          <p className="mt-3 text-[13px]">
            <Link href="/privacy" className="text-accent underline underline-offset-2">Privacy policy</Link>
          </p>
        </div>
        <div className="card">
          <p className="label-strong">Builder</p>
          <h3 className="mt-2 text-lg">Built from direct GDS operational experience</h3>
          <p className="mt-2 text-[14px] text-muted">
            PostalMind AI is built and maintained by a serving Gramin Dak Sevak. It began as a
            hackathon project and is being rebuilt as a durable public-interest tool. Exact
            workplace identifiers are deliberately kept off this site.
          </p>
          <p className="mt-3 text-[13px]">
            <Link href="/disclaimer" className="text-accent underline underline-offset-2">
              Independence &amp; disclaimer
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

function Card({
  href,
  kicker,
  title,
  body,
}: {
  href: string;
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <Link href={href} className="card block transition-colors hover:border-accent">
      <p className="label-strong">{kicker}</p>
      <h2 className="mt-2 text-xl">{title}</h2>
      <p className="mt-2 text-[14px] text-muted">{body}</p>
      <p className="mt-3 text-[13px] text-accent">Open →</p>
    </Link>
  );
}
