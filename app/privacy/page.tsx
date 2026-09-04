import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How PostalMind AI handles sensitive workplace evidence, and exactly what data leaves the application.',
};

export default function PrivacyPage() {
  return (
    <article className="prose-block">
      <p className="label-strong">Privacy</p>
      <h1 className="text-3xl">How sensitive workplace evidence is handled</h1>
      <p>
        PostalMind is built for material that is often sensitive: WhatsApp threads with phone
        numbers, customer account numbers, colleagues&rsquo; names, branch identifiers. The design
        goal is that this material stays under the worker&rsquo;s control.
      </p>

      <h2>What runs locally</h2>
      <p>In your request to PostalMind, on the server, without any external call:</p>
      <ul>
        <li>WhatsApp <code>.txt</code> parsing</li>
        <li>message classification into evidence categories</li>
        <li>evidence-strength assessment</li>
        <li>PII detection (phone, email, Aadhaar, PAN, IFSC, account numbers, facility IDs, employee IDs, name cues)</li>
        <li>redaction and the reversible redaction map</li>
        <li>SHA-256 hashing of the original</li>
        <li>timeline construction</li>
        <li>the publication safety check</li>
      </ul>
      <p>
        The text of your evidence is <strong>not</strong> sent to any AI provider. The
        &ldquo;Analyse evidence&rdquo; flow does not call a language model at all.
      </p>

      <h2>What leaves the application</h2>
      <table className="data not-prose my-4">
        <thead>
          <tr><th>Action</th><th>What is sent</th><th>To whom</th></tr>
        </thead>
        <tbody>
          <tr><td>Ask PostalMind (with a model configured)</td><td>Your question + the retrieved <em>source passages</em> (public documents). Not your evidence.</td><td>OpenRouter (free-tier model, provider-selected)</td></tr>
          <tr><td>Ask PostalMind (demo mode)</td><td>Nothing leaves — sources are shown directly.</td><td>—</td></tr>
          <tr><td>Analyse evidence / publication check</td><td>Nothing leaves the server request.</td><td>—</td></tr>
          <tr><td>Any page load</td><td>Standard web request. Fonts are loaded from Google Fonts.</td><td>Your host + Google Fonts</td></tr>
        </tbody>
      </table>

      <h2>What is stored</h2>
      <p>
        In the current build the case store is <strong>in-memory and not durable</strong> — imported
        analysis is not persisted and is lost on restart. Demo mode is the default. When a database
        is configured, originals are stored immutably with their hash, and an append-only audit log
        records every action (import, hash, analysis, correction, redaction, export) without storing
        the evidence content in the log.
      </p>

      <h2>Redaction states</h2>
      <p>
        Evidence moves through <strong>ORIGINAL → DERIVED → REDACTED → PUBLIC</strong>. The original
        is never altered. Nothing becomes <strong>PUBLIC</strong> automatically — a public export is
        an explicit action that must first pass the{' '}
        <Link href="/methodology#publication" className="text-accent underline underline-offset-2">
          twelve-point publication safety check
        </Link>
        .
      </p>

      <h2>Repository</h2>
      <p>
        The public source code contains only synthetic / demo data. No real evidence, names, phone
        numbers or branch identifiers are committed. If you self-host, keep your <code>.data</code>,
        uploads and <code>.env</code> out of version control.
      </p>

      <h2>Your control</h2>
      <p>
        This is your material. Export it, delete it, or run PostalMind entirely on your own machine.
        See <Link href="/disclaimer" className="text-accent underline underline-offset-2">the disclaimer</Link> and{' '}
        <a className="text-accent underline underline-offset-2" href="https://github.com/Rishidar-lab/postalmind-ai">the code</a>.
      </p>
    </article>
  );
}
