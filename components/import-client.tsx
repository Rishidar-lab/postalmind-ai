'use client';

import { useMemo, useState } from 'react';
import type { EvidenceItem } from '@/lib/evidence/types';
import type { Timeline } from '@/lib/evidence/timeline';
import { EvidenceItemCard, TimelineView } from './evidence-views';
import { PublicationCheck } from './publication-check-client';

interface PIIMatch {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: string;
  label: string;
  suggestedReplacement: string;
}

interface ParseResponse {
  source: { filename: string; byteLength: number; sha256: string };
  parse: {
    detectedFormat: string;
    dateOrder: string;
    participants: string[];
    dateRange: { start: string; end: string } | null;
    totalLines: number;
    excludedCount: number;
    counts: { system: number; media: number; deleted: number; content: number };
    warnings: string[];
    messages: Array<{ sender: string | null; timestamp: string | null; text: string; isSystem: boolean }>;
  };
  analysis: { items: EvidenceItem[]; summary: Record<string, unknown> & { categories: Record<string, number> } };
  timeline: Timeline;
  pii: { matches: PIIMatch[]; summary: { total: number; hasBlocking: boolean; highConfidence: number } };
  notes: string[];
}

const DEMO_TEXT = `03/09/2026, 09:05 - Mail Overseer: Sub-division business Mela is on 10/09/2026 at the block office.
03/09/2026, 09:06 - Mail Overseer: This BO target is 8 RPLI proposals for the Mela.
04/09/2026, 21:15 - Mail Overseer: Only 1 proposal from your BO. Complete 3 more by tomorrow without fail.
05/09/2026, 08:56 - Mail Overseer: Sevveri BO is at the bottom of the ranking. Only you are pulling the section down.
06/09/2026, 19:30 - Mail Overseer: எத்தனை முறை சொல்வது? இலக்கு உடனே முடிக்கணும்.
08/09/2026, 20:05 - Mail Overseer: Sunday also visit 4-5 houses for RPLI.
10/09/2026, 18:20 - Mail Overseer: How many RPLI did Sevveri close at the Mela? Send figure now.
10/09/2026, 19:50 - Mail Overseer: You did well at the counter today, take rest, no problem.
11/09/2026, 09:15 - Mail Overseer: Submit a written explanation for not achieving the full target.`;

function redact(text: string, matches: PIIMatch[], enabled: Set<number>): string {
  const spans = matches
    .map((m, i) => ({ ...m, i }))
    .filter((m) => enabled.has(m.i))
    .sort((a, b) => a.start - b.start);
  let out = '';
  let cursor = 0;
  for (const s of spans) {
    if (s.start < cursor) continue;
    out += text.slice(cursor, s.start) + s.suggestedReplacement;
    cursor = s.end;
  }
  return out + text.slice(cursor);
}

export function ImportClient() {
  const [text, setText] = useState('');
  const [eventDate, setEventDate] = useState('2026-09-10');
  const [whStart, setWhStart] = useState('09:00');
  const [whEnd, setWhEnd] = useState('17:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ParseResponse | null>(null);
  const [enabledPII, setEnabledPII] = useState<Set<number>>(new Set());

  async function analyse() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch('/api/evidence/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          eventDate,
          workingHours: { start: whStart, end: whEnd },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);
      setData(json as ParseResponse);
      setEnabledPII(new Set((json.pii.matches as PIIMatch[]).map((_: PIIMatch, i: number) => i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function onFile(file: File) {
    const t = await file.text();
    setText(t);
  }

  const redactedText = useMemo(
    () => (data ? redact(text, data.pii.matches, enabledPII) : ''),
    [data, text, enabledPII],
  );

  return (
    <div className="space-y-6">
      <section className="card">
        <p className="label-strong">1 · Import</p>
        <p className="mt-1 text-[13px] text-muted">
          Paste a WhatsApp chat export, or upload the <code>.txt</code>. It is analysed locally and{' '}
          <strong>not saved</strong> and <strong>not sent to any AI provider</strong>.
        </p>
        <textarea
          className="field mt-3 min-h-[160px] resize-y font-mono text-[12px]"
          placeholder="12/03/2026, 21:15 - Name: message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="btn cursor-pointer">
            Upload .txt
            <input
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </label>
          <button type="button" className="btn" onClick={() => setText(DEMO_TEXT)}>
            Load demo text
          </button>
          <div className="flex items-center gap-2 text-[13px]">
            <label htmlFor="ed">Event date</label>
            <input id="ed" type="date" className="field w-auto" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <label htmlFor="whs">Working hours</label>
            <input id="whs" type="time" className="field w-auto" value={whStart} onChange={(e) => setWhStart(e.target.value)} />
            <span>–</span>
            <input aria-label="Working hours end" type="time" className="field w-auto" value={whEnd} onChange={(e) => setWhEnd(e.target.value)} />
          </div>
          <button type="button" className="btn btn-primary" onClick={analyse} disabled={loading || !text.trim()}>
            {loading ? 'Analysing…' : 'Analyse'}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-[13px]" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
      </section>

      {data && (
        <>
          <section className="card">
            <p className="label-strong">2 · What was detected</p>
            <dl className="mt-3 grid gap-3 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Messages" value={`${data.parse.counts.content} content`} sub={`${data.parse.counts.system} system · ${data.parse.counts.media} media · ${data.parse.counts.deleted} deleted`} />
              <Stat label="Date range" value={data.parse.dateRange ? `${data.parse.dateRange.start.slice(0, 10)} → ${data.parse.dateRange.end.slice(0, 10)}` : 'unknown'} sub={`format: ${data.parse.detectedFormat} · order: ${data.parse.dateOrder}`} />
              <Stat label="Participants" value={String(data.parse.participants.length)} sub={data.parse.participants.join(', ') || '—'} />
              <Stat label="Integrity" value={`sha256 ${data.source.sha256.slice(0, 10)}…`} sub={`${data.source.byteLength} bytes · ${data.parse.excludedCount} lines excluded`} />
            </dl>
            {data.parse.warnings.length > 0 && (
              <div className="mt-3 rounded border border-line bg-accent-soft p-3 text-[12.5px]">
                <p className="font-semibold" style={{ color: 'var(--warn)' }}>Parser warnings</p>
                <ul className="mt-1 list-disc pl-5">
                  {data.parse.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section>
            <p className="label-strong">3 · Classified evidence ({data.analysis.items.length})</p>
            <p className="mt-1 text-[13px] text-muted">
              Each message classified into evidence categories with a strength rating. Categories are
              not legal findings.
            </p>
            <div className="mt-3 space-y-3">
              {data.analysis.items.map((it) => (
                <EvidenceItemCard key={it.id} item={it} />
              ))}
            </div>
          </section>

          <section>
            <p className="label-strong">4 · Timeline</p>
            <div className="mt-3">
              <TimelineView timeline={data.timeline} />
            </div>
          </section>

          <section className="card">
            <p className="label-strong">5 · Privacy — redaction preview</p>
            <p className="mt-1 text-[13px] text-muted">
              {data.pii.summary.total} potential identifiers detected
              {data.pii.summary.hasBlocking ? ' — includes items that block a public export.' : '.'}
              {' '}Toggle any you want to keep.
            </p>
            {data.pii.matches.length > 0 ? (
              <ul className="mt-3 space-y-1.5 text-[13px]">
                {data.pii.matches.map((m, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enabledPII.has(i)}
                      onChange={(e) => {
                        const next = new Set(enabledPII);
                        if (e.target.checked) next.add(i);
                        else next.delete(i);
                        setEnabledPII(next);
                      }}
                    />
                    <span className="badge normal-case tracking-normal">{m.label}</span>
                    <code className="text-faint">{m.value.length > 24 ? m.value.slice(0, 24) + '…' : m.value}</code>
                    <span className="text-faint">→ {m.suggestedReplacement}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[13px] text-faint">No obvious identifiers detected. Still review manually.</p>
            )}
            <p className="label-strong mt-4">Redacted text</p>
            <pre className="mt-2 max-h-64 overflow-auto rounded border border-line bg-paper p-3 font-mono text-[12px] whitespace-pre-wrap">
              {redactedText}
            </pre>
          </section>

          <section>
            <p className="label-strong">6 · Publication safety check</p>
            <p className="mt-1 text-[13px] text-muted">
              Draft the public summary you want to publish. The check runs locally.
            </p>
            <div className="mt-3">
              <PublicationCheck key={redactedText.slice(0, 64)} initialText={redactedText} />
            </div>
          </section>

          <p className="text-[12px] text-faint">
            {data.notes.join(' ')}
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded border border-line p-2.5">
      <p className="text-[11px] uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
      {sub && <p className="text-[11.5px] text-faint">{sub}</p>}
    </div>
  );
}
