import type { Metadata } from 'next';
import Link from 'next/link';
import { SourceStatusChip } from '@/components/chips';

export const metadata: Metadata = {
  title: 'Ground Reality',
  description:
    'An evidence-led editorial series on the working reality of Gramin Dak Sevaks — every claim carrying its source, evidence basis and qualification.',
};

type EvidenceStatus = 'VERIFIED' | 'UNVERIFIED' | 'DEMO';

interface Section {
  n: string;
  title: string;
  summary: string;
  claim: string;
  evidenceStatus: EvidenceStatus;
  sourceClass: string;
  source: string;
  sourceUrl: string | null;
  date: string | null;
  qualification: string;
  supports: string;
  doesNotProve: string;
}

const SECTIONS: Section[] = [
  {
    n: '01',
    title: 'Who is a GDS?',
    summary: 'The engagement category, in plain terms, and why it is distinct from a departmental post.',
    claim:
      'Gramin Dak Sevak is a distinct category of engagement with the Department of Posts, governed by its own conduct-and-engagement rules — not the same service category as a regular departmental postal employee.',
    evidenceStatus: 'UNVERIFIED',
    sourceClass: 'PRIMARY OFFICIAL FACT — project summary, not yet checked line-by-line against the primary document',
    source: 'Gramin Dak Sevaks (Conduct and Engagement) Rules, 2020',
    sourceUrl: 'https://www.indiapost.gov.in/VAS/Pages/GraminDakSevaks.aspx',
    date: '2020-06-18',
    qualification: 'Verify exact wording against the notified 2020 Rules before treating any specific clause as authoritative.',
    supports: 'That GDS is a formally separate engagement framework, distinct in kind from departmental service.',
    doesNotProve: 'Any comparative legal ranking, or how any individual office treats the distinction in practice.',
  },
  {
    n: '02',
    title: 'Responsibility without parity',
    summary: 'Cash handling, savings-bank work, business targets and accountability, set against the allowance structure.',
    claim:
      'Documented GDS duties span mail/branch operations, savings-bank and financial services, and business/marketing procurement — under a Time Related Continuity Allowance (TRCA) structure distinct from regular pay scales.',
    evidenceStatus: 'UNVERIFIED',
    sourceClass: 'PRIMARY OFFICIAL FACT — project summaries, unverified',
    source: 'GDS (Conduct and Engagement) Rules 2020 · Kamlesh Chandra Committee Report 2016 · TRCA Implementation Order 2018',
    sourceUrl: 'https://www.indiapost.gov.in/VAS/Pages/GraminDakSevaks.aspx',
    date: '2016-11-24 / 2018-06-25 / 2020-06-18',
    qualification: 'Exact duty scope depends on office category and workload slab; do not generalise one office to all.',
    supports: 'That the role spans multiple service lines while compensation follows a distinct allowance structure, not a regular pay scale.',
    doesNotProve: 'Any quantified "responsibility gap" (e.g. a percentage figure) — no such calculation exists in these sources.',
  },
  {
    n: '03',
    title: 'Working hours vs working reality',
    summary: 'What the workload-assessment slabs say, and what a branch day actually contains.',
    claim:
      'The formal framework assesses GDS into working-hour slabs based on branch workload, rather than a single uniform working day.',
    evidenceStatus: 'UNVERIFIED',
    sourceClass: 'PRIMARY OFFICIAL FACT — project summary, unverified',
    source: 'Report of the One-Man Committee on Gramin Dak Sevaks (Kamlesh Chandra Committee), 2016',
    sourceUrl: 'https://www.indiapost.gov.in/VAS/Pages/GraminDakSevaks.aspx',
    date: '2016-11-24',
    qualification: 'The specific slab for an individual GDS depends on their branch’s own workload-assessment order, which PostalMind does not hold on file for any named office.',
    supports: 'That a workload-slab classification framework exists and governs assessed working hours.',
    doesNotProve: 'What hours any individual GDS actually works in practice, or that actual hours exceed the assessed slab — that needs case-level evidence, not yet on file.',
  },
  {
    n: '04',
    title: 'Target culture',
    summary: 'How RPLI / IPPB / small-savings targets are set and reviewed, and where incentives end and pressure begins.',
    claim:
      'Business development work (small savings, RPLI/PLI, IPPB) is documented as part of GDS work, described as supported by an incentive structure.',
    evidenceStatus: 'UNVERIFIED',
    sourceClass: 'PRIMARY OFFICIAL FACT — project summary, unverified',
    source: 'Report of the One-Man Committee on Gramin Dak Sevaks (Kamlesh Chandra Committee), 2016',
    sourceUrl: 'https://www.indiapost.gov.in/VAS/Pages/GraminDakSevaks.aspx',
    date: '2016-11-24',
    qualification: 'This source describes an incentive-based structure on paper. It does not describe how targets are communicated or enforced on the ground — that is a separate evidence question (section 05).',
    supports: 'That business targets are a documented, formally incentivised part of the role, not an informal add-on.',
    doesNotProve: 'That any specific target is unreasonable, or that target-setting is inherently coercive.',
  },
  {
    n: '05',
    title: 'When targets become pressure',
    summary: 'The evidence categories that distinguish a review from sustained individual pressure — and what has already reached Parliament.',
    claim:
      'Allegations of undue pressure on GDS to achieve business targets were raised with the Ministry via an MP representation; the Ministry’s reported response states no undue pressure should be exerted and that officers have been advised accordingly.',
    evidenceStatus: 'UNVERIFIED',
    sourceClass: 'NEWS REPORT — secondary summary of a departmental D.O. Letter (No. GD-16/133/2025-GDS-DOP); PostalMind has not sighted the primary letter itself',
    source: 'PostalStudy.in, reporting an MP representation by Shri Balwant B. Wankhade and the Department’s response',
    sourceUrl: 'https://www.postalstudy.in/2026/07/no-undue-pressure-on-gramin-dak.html',
    date: 'reported July 2026 (referencing a departmental response dated around November 2025)',
    qualification: 'This is a blog’s report of an official letter, not the letter itself. Treat the Department’s exact wording as reported, not verbatim, until the primary letter is sighted. A blog is never cited here as if it were the circular.',
    supports: 'That target-pressure allegations concerning GDS were serious enough to reach an MP and draw a formal ministerial response — the concern is documented, not fringe.',
    doesNotProve: 'That undue pressure is widespread, that it is unaddressed, or any specific instance against any named GDS or office. PostalMind classifies indicators (repeated individual demands, peer comparison, public naming, leave linkage, inspection threats, after-hours follow-up, retaliation references) separately in its evidence tool, and none of them is asserted as established here without a submitted, reviewed case.',
  },
  {
    n: '06',
    title: 'Peer comparison & public naming',
    summary: 'Ranking sheets and group-channel naming — what the record shows and what it does not.',
    claim:
      'PostalMind’s evidence tool treats public performance-ranking or naming in group channels as a distinct, classifiable evidence category, separate from ordinary supervisory review.',
    evidenceStatus: 'DEMO',
    sourceClass: 'DEMO — synthetic, illustrative only',
    source: 'PostalMind AI demo scenario (synthetic; no real names, messages or identifiers)',
    sourceUrl: null,
    date: '2026-09-04',
    qualification: 'This is a synthetic scenario built to demonstrate the evidence workflow. It is not a real reported case and must never be cited as one.',
    supports: 'That the tooling can classify this evidence category once a real, submitted case exists.',
    doesNotProve: 'That peer comparison or public naming is occurring in any real branch — no real case is on file for this section yet.',
  },
  {
    n: '07',
    title: 'After-hours communication',
    summary: 'Messages outside working hours and on holidays: a time fact, and when it compounds.',
    claim:
      'PostalMind’s evidence tool builds a PRE/EVENT/POST timeline from message timestamps, which can show after-hours contact as a plain time fact.',
    evidenceStatus: 'DEMO',
    sourceClass: 'DEMO — synthetic, illustrative only',
    source: 'PostalMind AI demo scenario (synthetic; no real names, messages or identifiers)',
    sourceUrl: null,
    date: '2026-09-04',
    qualification: 'A timestamp outside working hours is a fact about time, not by itself proof of harassment. It is one input among several the evidence tool records.',
    supports: 'That the timeline tooling can surface after-hours contact once real, submitted messages exist.',
    doesNotProve: 'That after-hours contact is occurring, or its intent, in any real, currently-documented case.',
  },
  {
    n: '08',
    title: 'Documented GDS workplace cases',
    summary: 'Reported cases, each classified by source quality, with careful language on causation.',
    claim:
      'As of this publication, PostalMind AI’s source library does not contain an independently verified, real GDS-specific workplace-pressure case.',
    evidenceStatus: 'UNVERIFIED',
    sourceClass: 'STATUS STATEMENT — not a sourced factual claim about the world, a statement about what this project currently holds',
    source: 'PostalMind AI evidence library (internal status, cross-referenced against section 05)',
    sourceUrl: null,
    date: '2026-09-04',
    qualification: 'This says nothing about whether such cases exist in reality — only that none is yet verified and published here. See the Corrections Policy for how this section is updated once one is.',
    supports: 'An honest account of the current state of the evidence library, including its limits.',
    doesNotProve: 'That no GDS has experienced undue pressure — absence of a verified case here is not evidence of absence in reality.',
  },
  {
    n: '09',
    title: 'What the evidence shows',
    summary: 'The conclusions the collected material can support.',
    claim:
      'GDS is a distinct engagement category (01) whose documented duties span postal, financial and commercial service lines under a separate allowance structure (02); working hours follow a workload-slab framework (03); business targets are a documented, incentivised part of the role (04); and pressure allegations around targets have been serious enough to draw a formal ministerial response (05).',
    evidenceStatus: 'UNVERIFIED',
    sourceClass: 'SYNTHESIS — combines sections 01–05 above; carries the same UNVERIFIED status as its inputs',
    source: 'Sections 01–05 of this page',
    sourceUrl: null,
    date: '2026-09-04',
    qualification: 'A synthesis is only as strong as its weakest input; every claim here traces to a specific section above.',
    supports: 'A short, defensible summary of what the current source library actually establishes.',
    doesNotProve: 'Anything not already stated, sourced and qualified in the sections it draws from.',
  },
  {
    n: '10',
    title: 'What the evidence does not show',
    summary: 'The conclusions it cannot support — stated as plainly as the rest.',
    claim:
      'No verified GDS-specific death, injury or harassment case is currently documented; no measure exists here of how widespread undue pressure is; no quantified comparison establishes that GDS carry more responsibility than departmental staff; no causal link between any specific incident and target pressure is established.',
    evidenceStatus: 'UNVERIFIED',
    sourceClass: 'SYNTHESIS — an explicit limits statement, given equal prominence to section 09',
    source: 'Sections 01–08 of this page',
    sourceUrl: null,
    date: '2026-09-04',
    qualification: 'This section exists so the absence of proof is never quietly implied — it is stated as directly as what the evidence does show.',
    supports: 'Honest scope-limiting of every other claim on this page.',
    doesNotProve: 'N/A — this section is itself the "does not prove" statement.',
  },
  {
    n: '11',
    title: 'What should change',
    summary: 'Specific, sourced proposals.',
    claim:
      'Based on sections 01–10, PostalMind AI proposes discussing: written and transparent target instructions; locality-sensitive target expectations; a clear prohibition on public humiliation; explicit rules on after-hours communication; transparent leave decisions; separation of business performance review from personal intimidation; a confidential grievance channel; documented escalation; independent review of serious complaints; and better public source-transparency for GDS rules and circulars.',
    evidenceStatus: 'UNVERIFIED',
    sourceClass: 'EDITORIAL PROPOSAL — PostalMind AI’s own position, not attributed to any official body',
    source: 'PostalMind AI editorial position, informed by sections 01–10 of this page',
    sourceUrl: null,
    date: '2026-09-04',
    qualification: 'These are proposals worth discussing, not demands presented as already-agreed policy, and not attributed to the Department, a union, or any court.',
    supports: 'A concrete, sourced starting point for discussion.',
    doesNotProve: 'That any specific proposal will be adopted, or that it is the only reasonable option.',
  },
];

export default function GroundRealityPage() {
  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="label-strong">Ground Reality — a PostalMind AI evidence project</p>
        <h1 className="mt-2 text-3xl">The working reality of Gramin Dak Sevaks</h1>
        <p className="mt-3 text-muted">
          A structured series on who Gramin Dak Sevaks are, what the record shows about their working
          conditions, and where legitimate performance review can shade into workplace pressure. Every
          claim below carries a source, an evidence status, a date and a qualification. It reports what
          the evidence shows and, with equal prominence, what it does not. It is not campaign material.
        </p>
        <p className="mt-2 text-[13px] text-faint">
          Independent project. Not affiliated with or endorsed by India Post or the Department of Posts.
        </p>
      </header>

      <div className="card text-[13px] text-muted">
        <p className="label-strong">Editorial standard</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Every claim is classified by source class: primary official fact · primary judicial fact · news report · union allegation · employee testimony · police/FIR reported · unverified claim · demo.</li>
          <li>Causation is never asserted without an authoritative finding. &ldquo;Reported amid allegations of&hellip;&rdquo;, not &ldquo;caused by&rdquo;.</li>
          <li>A blog or secondary summary is never cited as if it were the primary circular or order it describes.</li>
          <li>Individuals are named only where naming is necessary to the point; role labels otherwise.</li>
          <li>Every section passes the <Link href="/methodology#publication" className="text-accent underline underline-offset-2">publication safety check</Link> before it goes up, and factual corrections are logged at <Link href="/corrections" className="text-accent underline underline-offset-2">/corrections</Link>.</li>
        </ul>
      </div>

      <ol className="space-y-4">
        {SECTIONS.map((sec) => (
          <li key={sec.n} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[12px] text-faint">{sec.n}</p>
                <h2 className="mt-0.5 text-lg">{sec.title}</h2>
                <p className="mt-1 text-[14px] text-muted">{sec.summary}</p>
              </div>
              <SourceStatusChip value={sec.evidenceStatus} />
            </div>

            <dl className="mt-4 grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="label-strong">Claim</dt>
                <dd className="mt-1 text-ink">{sec.claim}</dd>
              </div>
              <div>
                <dt className="label-strong">Source class</dt>
                <dd className="mt-1 text-muted">{sec.sourceClass}</dd>
              </div>
              <div>
                <dt className="label-strong">Source</dt>
                <dd className="mt-1 text-muted">
                  {sec.sourceUrl ? (
                    <a href={sec.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
                      {sec.source}
                    </a>
                  ) : (
                    sec.source
                  )}
                </dd>
              </div>
              <div>
                <dt className="label-strong">Date</dt>
                <dd className="mt-1 text-muted">{sec.date ?? 'not dated in source'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="label-strong">Qualification</dt>
                <dd className="mt-1 text-muted">{sec.qualification}</dd>
              </div>
              <div>
                <dt className="label-strong text-[var(--ok)]">What the evidence supports</dt>
                <dd className="mt-1 text-muted">{sec.supports}</dd>
              </div>
              <div>
                <dt className="label-strong text-[var(--warn)]">What it does NOT prove</dt>
                <dd className="mt-1 text-muted">{sec.doesNotProve}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>

      <p className="text-[13px] text-faint">
        This page is updated as sourcing improves. Corrections to any claim above are logged, not made
        silently — see <Link href="/corrections" className="text-accent underline underline-offset-2">/corrections</Link>.
      </p>
    </div>
  );
}
