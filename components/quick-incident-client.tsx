'use client';

import { useEffect, useState } from 'react';
import {
  createQuickIncident,
  type QuickIncident,
  type QuickIncidentSource,
} from '@/lib/evidence/quick-incident';
import type { SpeakerRole } from '@/lib/evidence/types';

const STORAGE_KEY = 'postalmind-quick-incidents-v1';

function loadSaved(): QuickIncident[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as QuickIncident[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Mobile-first Quick Incident capture (<30s): one required field (excerpt),
 * everything else tap-to-accept defaults. All classification runs locally —
 * no network, no AI provider.
 */
export function QuickIncidentClient() {
  const [excerpt, setExcerpt] = useState('');
  const [alias, setAlias] = useState('');
  const [role, setRole] = useState<SpeakerRole>('UNKNOWN');
  const [source, setSource] = useState<QuickIncidentSource>('whatsapp');
  const [contextBefore, setContextBefore] = useState('');
  const [contextAfter, setContextAfter] = useState('');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<QuickIncident | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<QuickIncident[]>([]);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  function record() {
    setError(null);
    try {
      const qi = createQuickIncident({
        excerpt,
        speakerAlias: alias || undefined,
        speakerRole: role,
        source,
        contextBefore: contextBefore || undefined,
        contextAfter: contextAfter || undefined,
        notes: notes || undefined,
      });
      setResult(qi);
      const next = [qi, ...loadSaved()].slice(0, 200);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Quota or private mode — the incident is still shown above.
      }
      setSaved(next);
      setExcerpt('');
      setContextBefore('');
      setContextAfter('');
      setNotes('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record the incident.');
    }
  }

  function remove(id: string) {
    const next = saved.filter((s) => s.id !== id);
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-4">
      <section className="card">
        <p className="label-strong">Quick incident — under 30 seconds</p>
        <p className="mt-1 text-[13px] text-muted">
          Type or paste the exact words. Everything is classified{' '}
          <strong>locally on this device</strong> — nothing is uploaded or sent to any AI provider.
          Use a role/alias, never a real name.
        </p>
        <label htmlFor="qi-excerpt" className="label-strong mt-3 block">
          Exact excerpt (required)
        </label>
        <textarea
          id="qi-excerpt"
          className="field mt-1 min-h-[96px] resize-y text-[14px]"
          placeholder="What was said or written, word for word…"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="qi-alias" className="label-strong block">
              Speaker alias
            </label>
            <input
              id="qi-alias"
              className="field mt-1"
              placeholder="e.g. Supervising Official"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="qi-role" className="label-strong block">
              Speaker role
            </label>
            <select id="qi-role" className="field mt-1" value={role} onChange={(e) => setRole(e.target.value as SpeakerRole)}>
              <option value="UNKNOWN">Unknown</option>
              <option value="SUPERVISORY">Supervisory</option>
              <option value="PEER">Peer</option>
              <option value="SUBJECT_EMPLOYEE">Subject employee</option>
              <option value="CUSTOMER">Customer</option>
              <option value="SYSTEM">System</option>
            </select>
          </div>
          <div>
            <label htmlFor="qi-source" className="label-strong block">
              Source
            </label>
            <select id="qi-source" className="field mt-1" value={source} onChange={(e) => setSource(e.target.value as QuickIncidentSource)}>
              <option value="whatsapp">WhatsApp</option>
              <option value="in-person">In person</option>
              <option value="call">Call</option>
              <option value="notice">Notice / order</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="qi-notes" className="label-strong block">
              Notes (optional)
            </label>
            <input
              id="qi-notes"
              className="field mt-1"
              placeholder="Channel, witnesses…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <details className="mt-3 text-[13px]">
          <summary className="cursor-pointer text-muted">Context before / after (optional, helps accuracy)</summary>
          <div className="mt-2 grid gap-2">
            <textarea className="field min-h-[56px] text-[13px]" placeholder="What happened just before…" value={contextBefore} onChange={(e) => setContextBefore(e.target.value)} aria-label="Context before" />
            <textarea className="field min-h-[56px] text-[13px]" placeholder="What happened just after…" value={contextAfter} onChange={(e) => setContextAfter(e.target.value)} aria-label="Context after" />
          </div>
        </details>
        {error && (
          <p className="mt-3 text-[13px]" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
        <button type="button" className="btn btn-primary mt-3 w-full sm:w-auto" onClick={record} disabled={!excerpt.trim()}>
          Record locally
        </button>
      </section>

      {result && (
        <section className="card" data-testid="qi-result">
          <p className="label-strong">Recorded — {new Date(result.timestamp).toLocaleString()}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {result.category.map((c) => (
              <span key={c} className="badge normal-case tracking-normal">
                {c}
              </span>
            ))}
            <span className="badge normal-case tracking-normal">strength: {result.evidenceStrength}</span>
          </div>
          <p className="mt-2 text-[13px]">
            <strong>Supports:</strong> {result.whatItSupports.join(' ')}
          </p>
          <p className="mt-1 text-[13px] text-muted">
            <strong>Does NOT establish:</strong> {result.whatItDoesNotEstablish.join(' ')}
          </p>
          {result.counterEvidence.length > 0 && (
            <p className="mt-1 text-[13px] text-muted">
              <strong>Counter-evidence:</strong> {result.counterEvidence.join(' ')}
            </p>
          )}
        </section>
      )}

      {saved.length > 0 && (
        <section>
          <p className="label-strong">Saved on this device ({saved.length})</p>
          <div className="mt-2 space-y-2">
            {saved.slice(0, 20).map((s) => (
              <div key={s.id} className="card text-[13px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium break-words">{s.speakerAlias} · {s.source}</p>
                  <button type="button" className="text-[12px] text-faint underline" onClick={() => remove(s.id)}>
                    Remove
                  </button>
                </div>
                <p className="mt-1 break-words text-muted">{s.exactExcerpt}</p>
                <p className="mt-1 text-[12px] text-faint">
                  {s.category.join(', ')} · {s.evidenceStrength} · {new Date(s.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
