'use client';

import { useState } from 'react';
import { VerdictChip } from './chips';

interface CheckItem {
  id: string;
  question: string;
  result: 'PASS' | 'WARN' | 'BLOCK';
  detail: string;
}
interface Report {
  verdict: 'PASS' | 'WARN' | 'BLOCK';
  canExport: boolean;
  items: CheckItem[];
  blockers: string[];
  warnings: string[];
  pii: { summary: { total: number } };
}

export function PublicationCheck({ initialText = '' }: { initialText?: string }) {
  const [text, setText] = useState(initialText);
  const [namesIndividuals, setNames] = useState(false);
  const [namesNecessary, setNamesNecessary] = useState(false);
  const [counterConsidered, setCounter] = useState(false);
  const [contextRetained, setContext] = useState(true);
  const [sourceCited, setSource] = useState(false);
  const [assertsLegal, setLegal] = useState(false);
  const [legalAuthoritative, setLegalAuth] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/evidence/publication-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          namesIndividuals,
          namesAreNecessary: namesNecessary,
          counterEvidenceConsidered: counterConsidered,
          contextRetained,
          sourceCited,
          assertsLegalConclusion: assertsLegal,
          legalConclusionIsAuthoritative: legalAuthoritative,
        }),
      });
      const json = await res.json();
      setReport(res.ok ? (json as Report) : null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <label htmlFor="pubtext" className="label-strong">
        Text to publish
      </label>
      <textarea
        id="pubtext"
        className="field mt-2 min-h-[120px] resize-y text-[13px]"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <fieldset className="mt-3 grid gap-1.5 text-[13px] sm:grid-cols-2">
        <legend className="label-strong mb-1">Analyst assertions</legend>
        <Toggle label="Names an individual" checked={namesIndividuals} onChange={setNames} />
        <Toggle label="Naming is necessary to the point" checked={namesNecessary} onChange={setNamesNecessary} />
        <Toggle label="Counter-evidence considered" checked={counterConsidered} onChange={setCounter} />
        <Toggle label="Context retained" checked={contextRetained} onChange={setContext} />
        <Toggle label="Source cited for factual claims" checked={sourceCited} onChange={setSource} />
        <Toggle label="Asserts a legal/criminal conclusion" checked={assertsLegal} onChange={setLegal} />
        {assertsLegal && (
          <Toggle label="…backed by a court/tribunal/official finding" checked={legalAuthoritative} onChange={setLegalAuth} />
        )}
      </fieldset>
      <button type="button" className="btn btn-primary mt-3" onClick={run} disabled={loading || !text.trim()}>
        {loading ? 'Checking…' : 'Run safety check'}
      </button>

      {report && (
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <VerdictChip value={report.verdict} />
            <span className="text-[13px] text-muted">
              {report.canExport ? 'Export allowed (address any warnings first).' : 'Export blocked.'}
            </span>
          </div>
          <table className="data mt-3">
            <thead>
              <tr>
                <th>Check</th>
                <th>Result</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {report.items.map((it) => (
                <tr key={it.id}>
                  <td>{it.question}</td>
                  <td>
                    <VerdictChip value={it.result} />
                  </td>
                  <td>{it.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
