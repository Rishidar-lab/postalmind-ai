'use client';

import { useEffect, useMemo, useState } from 'react';
import { vaultAvailable } from '@/lib/storage/db';
import {
  deleteWorkdayEntry,
  exportWorkdayLogJson,
  exportWorkdayLogText,
  listWorkdayEntries,
  newWorkdayEntry,
  saveWorkdayEntry,
  summarizeByWeek,
  type WorkdayEntry,
} from '@/lib/tools/workday';

const FIELDS: Array<{ key: keyof WorkdayEntry; label: string; placeholder: string }> = [
  { key: 'mailWork', label: 'Mail work', placeholder: 'e.g. delivered 42 articles' },
  { key: 'branchWork', label: 'Branch work', placeholder: 'e.g. counter, cash tallying' },
  { key: 'financialWork', label: 'Financial work', placeholder: 'e.g. POSB deposits, IPPB' },
  { key: 'businessWork', label: 'Business / Mela work', placeholder: 'e.g. RPLI canvassing target' },
  { key: 'travel', label: 'Travel', placeholder: 'e.g. beat 12 km' },
  { key: 'afterHoursCommunication', label: 'After-hours communication', placeholder: 'e.g. message at 9:40 PM about target' },
  { key: 'supervisorInstruction', label: 'Supervisor instruction', placeholder: 'e.g. told to complete X by Friday' },
  { key: 'notes', label: 'Notes', placeholder: 'anything else worth recording' },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function WorkdayClient() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<WorkdayEntry[]>([]);
  const [draft, setDraft] = useState<WorkdayEntry>(() => newWorkdayEntry(today()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ok = vaultAvailable();
    setAvailable(ok);
    if (!ok) {
      setLoading(false);
      return;
    }
    refresh();
  }, []);

  async function refresh() {
    try {
      setEntries(await listWorkdayEntries());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the workday log.');
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setError(null);
    try {
      await saveWorkdayEntry(draft);
      setDraft(newWorkdayEntry(today()));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this entry.');
    }
  }

  async function remove(id: string) {
    await deleteWorkdayEntry(id);
    await refresh();
  }

  const weekly = useMemo(() => summarizeByWeek(entries), [entries]);

  if (available === false) {
    return (
      <div className="card text-[14px] text-muted">
        Local storage (IndexedDB) is not available in this browser context, so the Workday Log cannot
        run here. Try a normal browser tab rather than a restricted/incognito context that blocks
        storage.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-3">
        <p className="label-strong">Log today ({draft.date})</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label-strong" htmlFor="sched-start">Scheduled start</label>
            <input id="sched-start" type="time" className="field mt-1" value={draft.scheduledStart ?? ''} onChange={(e) => setDraft({ ...draft, scheduledStart: e.target.value || null })} />
          </div>
          <div>
            <label className="label-strong" htmlFor="sched-end">Scheduled end</label>
            <input id="sched-end" type="time" className="field mt-1" value={draft.scheduledEnd ?? ''} onChange={(e) => setDraft({ ...draft, scheduledEnd: e.target.value || null })} />
          </div>
          <div>
            <label className="label-strong" htmlFor="actual-start">Actual start</label>
            <input id="actual-start" type="time" className="field mt-1" value={draft.actualStart ?? ''} onChange={(e) => setDraft({ ...draft, actualStart: e.target.value || null })} />
          </div>
          <div>
            <label className="label-strong" htmlFor="actual-end">Actual end</label>
            <input id="actual-end" type="time" className="field mt-1" value={draft.actualEnd ?? ''} onChange={(e) => setDraft({ ...draft, actualEnd: e.target.value || null })} />
          </div>
        </div>
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="label-strong" htmlFor={f.key}>{f.label}</label>
            <input
              id={f.key}
              type="text"
              className="field mt-1"
              value={(draft[f.key] as string | null) ?? ''}
              onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value || null })}
              placeholder={f.placeholder}
            />
          </div>
        ))}
        {error && <p className="text-[13px]" style={{ color: 'var(--danger)' }}>{error}</p>}
        <button type="button" className="btn btn-primary" onClick={save}>
          Save entry
        </button>
        <p className="text-[12px] text-faint">
          Saved only on this device (IndexedDB). This is a factual record of your day — PostalMind draws
          no legal conclusion from it automatically.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={() => downloadFile('workday-log.json', exportWorkdayLogJson(entries), 'application/json')} disabled={entries.length === 0}>
          Export JSON
        </button>
        <button type="button" className="btn" onClick={() => downloadFile('workday-log.txt', exportWorkdayLogText(entries), 'text/plain')} disabled={entries.length === 0}>
          Export text
        </button>
      </div>

      <div className="space-y-3">
        <p className="label-strong">Weekly chronology</p>
        {loading ? (
          <p className="text-[13px] text-muted">Loading…</p>
        ) : weekly.length === 0 ? (
          <p className="text-[13px] text-muted">No entries logged yet.</p>
        ) : (
          weekly.map((w) => (
            <div key={w.period} className="card">
              <p className="font-mono text-[12px] text-faint">{w.period}</p>
              <p className="mt-1 text-[13px] text-muted">
                {w.daysLogged} day(s) logged · {w.daysWithAfterHours} day(s) with after-hours communication ·{' '}
                {w.daysWithBusinessWork} day(s) with business/Mela work
              </p>
              <ul className="mt-2 space-y-2 text-[13px]">
                {w.entries.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-2 border-t border-line pt-2">
                    <div>
                      <p className="font-medium">{e.date}</p>
                      <p className="text-muted">
                        {e.actualStart ?? e.scheduledStart ?? '—'}–{e.actualEnd ?? e.scheduledEnd ?? '—'}
                        {e.afterHoursCommunication ? ' · after-hours communication logged' : ''}
                      </p>
                    </div>
                    <button type="button" className="text-[12px] text-accent underline underline-offset-2" onClick={() => remove(e.id)}>
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
