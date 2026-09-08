import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Methodology',
  description:
    'How PostalMind AI grounds answers in sources, classifies evidence, rates evidence strength, and gates public export.',
};

export default function MethodologyPage() {
  return (
    <article className="prose-block">
      <p className="label-strong">Methodology</p>
      <h1 className="text-3xl">How PostalMind works, in enough detail to argue with</h1>
      <p>
        PostalMind has two jobs: answer questions about GDS rules without inventing them, and help a
        worker analyse workplace evidence without overstating it. Both are built to be inspected.
      </p>

      <h2 id="grounding">1. Source-grounded answers</h2>
      <ol>
        <li>
          <strong>Retrieve.</strong> The question is tokenised and scored against a library of
          source passages using a transparent bag-of-words method (keyword matches weigh most, then
          tags, then title, then body). You can see which terms matched.
        </li>
        <li>
          <strong>Decide.</strong> If nothing scores above a threshold, the answer is{' '}
          <strong>UNKNOWN</strong> and no language model is called.
        </li>
        <li>
          <strong>Constrain.</strong> If a model is configured, it is given only the retrieved
          passages and the question, with instructions to use nothing else, to cite every factual
          sentence, and to refuse if the passages are insufficient. In demo mode there is no model —
          the passages are shown directly.
        </li>
        <li>
          <strong>Check.</strong> The generated answer is scanned for factual sentences that cite no
          source; those are surfaced as warnings.
        </li>
        <li>
          <strong>Classify.</strong> <strong>VERIFIED</strong> (all sources maintainer-checked, strong
          retrieval, every claim cited), <strong>INFERENCE</strong> (reasoning across two or more
          sources, all cited), <strong>UNVERIFIED</strong> (sources are project summaries), or{' '}
          <strong>UNKNOWN</strong>.
        </li>
      </ol>
      <p>
        PostalMind never states a GDS rule number, circular number, memo number, order number, date,
        officer name, court decision or interest rate that is not written in a cited passage.
      </p>

      <h2 id="sources">2. Source library</h2>
      <p>
        Each source is a record: title, authority, document type, date, effective date, URL, local
        mirror path, SHA-256, page count, status, tags. Passages carry a <strong>status</strong>:
      </p>
      <ul>
        <li><strong>VERIFIED</strong> — a maintainer checked the passage against the primary document and recorded the document&rsquo;s hash.</li>
        <li><strong>UNVERIFIED</strong> — a project summary; accurate in intent but not yet checked line-by-line.</li>
        <li><strong>DEMO</strong> — illustrative only.</li>
      </ul>
      <p>
        The shipped library is deliberately small and mostly UNVERIFIED. Growing it — and promoting
        passages to VERIFIED — is the main ongoing editorial task. See{' '}
        <Link href="/sources" className="text-accent underline underline-offset-2">the library</Link>.
      </p>

      <h2 id="evidence">3. Evidence classification</h2>
      <p>
        Each message is classified into one or more of eighteen <strong>evidence categories</strong>
        {' '}(administrative instruction, target instruction, performance expectation, repeated
        target pressure, peer comparison, public naming, public shaming, after-hours communication,
        inspection reference, leave-related pressure, threat-like language, explicit threat,
        retaliation reference, abusive language, workload reference, financial pressure, neutral,
        counter-evidence, insufficient context).
      </p>
      <p>The classifier is deterministic and rule-based, not a language model, because it must be:</p>
      <ul>
        <li><strong>explainable</strong> — every category assignment lists the signals that triggered it;</li>
        <li><strong>reproducible</strong> — the same message always classifies the same way;</li>
        <li><strong>conservative</strong> — a target instruction is a target instruction, not &ldquo;harassment&rdquo;. After-hours is a time fact. An inspection reference is not a threat.</li>
      </ul>
      <p>
        Every classification carries a <strong>&ldquo;what this does not establish&rdquo;</strong>{' '}
        statement. That field is mandatory. The system is built to be able to tell you:{' '}
        <em>this evidence does not prove your claim.</em>
      </p>
      <p>It works on English, Tamil and romanised Tamil (Tanglish).</p>

      <h2 id="strength">4. Evidence strength</h2>
      <p>
        Each item is rated <strong>INSUFFICIENT / WEAK / MODERATE / STRONG</strong>. There is no
        numeric &ldquo;harassment score&rdquo;. The rating weighs: directness of language,
        classification confidence, repetition in the window, corroboration by other items,
        independent documents, the speaker&rsquo;s role, time consistency, and counter-evidence in
        the same excerpt. A single item is <strong>never STRONG</strong> without at least one
        independent documentary source — a pile of messages from one export is still one custodian.
        The factors that raised or lowered each rating are shown.
      </p>

      <h2 id="timeline">5. Timeline &amp; patterns</h2>
      <p>
        Evidence items are placed on a timeline, grouped <strong>PRE-EVENT / EVENT-DAY / POST-EVENT</strong>
        around the case&rsquo;s central date, with activity clusters flagged. The pattern view is a
        straight tally of categories, participants and dates — no fabricated statistics, and demo
        data is labelled DEMO.
      </p>

      <h2 id="publication">6. Publication safety check</h2>
      <p>Before any content can be exported as PUBLIC, twelve checks run. Each returns PASS, WARN or BLOCK:</p>
      <ol>
        <li>Phone numbers removed</li>
        <li>Email addresses removed</li>
        <li>Account numbers / customer identifiers removed</li>
        <li>Branch / facility identifiers removed</li>
        <li>Uninvolved employee IDs removed</li>
        <li>Uninvolved third-party names removed</li>
        <li>Context retained (not a stripped one-liner)</li>
        <li>Sources retained for factual claims</li>
        <li>Counter-evidence considered</li>
        <li>Legal / criminal conclusions avoided unless authoritative</li>
        <li>Naming individuals is necessary to the point</li>
        <li>Potentially defamatory claims are evidence-backed</li>
      </ol>
      <p>
        Any BLOCK stops the export. A potentially defamatory factual claim about a named person that
        lacks a source and considered counter-evidence is blocked. The tone options for generated
        content are NEUTRAL, INVESTIGATIVE, PUBLIC-INTEREST and FORMAL REPRESENTATION — there is no
        rage-bait mode.
      </p>

      <h2 id="known-cases">7. Documented cases</h2>
      <p>
        When PostalMind refers to a reported case involving GDS workplace pressure, it classifies the
        source (news report / FIR reported / union allegation / department response / court or
        tribunal record / official document / unverified claim) and uses careful language:
        &ldquo;death reported in connection with allegations of&hellip;&rdquo;, &ldquo;FIR reportedly
        registered&rdquo;, &ldquo;causation not judicially established&rdquo;. It does not assert that
        workplace pressure <em>caused</em> a death unless an authoritative finding says so.
      </p>

      <h2>Limitations</h2>
      <ul>
        <li>Retrieval is lexical, not semantic — phrasing matters.</li>
        <li>The corpus is small; many answers will be UNVERIFIED or UNKNOWN by design.</li>
        <li>OCR of screenshots is not certain and is always shown as editable.</li>
        <li>The classifier uses keyword signals; sarcasm, code words and context outside the window can fool it. It is a drafting aid for a human analyst, not a verdict.</li>
      </ul>
    </article>
  );
}
