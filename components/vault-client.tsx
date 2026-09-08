'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  applyBundle,
  buildCaseBundle,
  inspectBundleFile,
  type ImportPreview,
} from '@/lib/storage/backup';
import { VaultQuotaError, VaultUnavailableError, vaultAvailable } from '@/lib/storage/db';
import { createCase, deleteCase, listCases } from '@/lib/storage/vault';
import type { VaultCaseRecord } from '@/lib/storage/schema';
import { vaultStatus, type VaultStatus } from '@/lib/storage/vault';

type SaveState = 'SAVED LOCALLY' | 'UNSAVED' | 'EXPORT RECOMMENDED' | 'UNAVAILABLE';

/**
 * Local case vault UI. All persistence is IndexedDB on this device via the
 * storage abstraction — no direct IDB calls in components. Export produces a
 * `.postalmind-case` bundle; import verifies hashes before applying.
 */
export function VaultClient() {
  const [cases, setCases] = useState<VaultCaseRecord[]>([]);
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('UNSAVED');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [password, setPassword] = useState('');
  const [exportPassword, setExportPassword] = useState('');

  const refresh = useCallback(async () => {
    if (!vaultAvailable()) {
      setSaveState('UNAVAILABLE');
      return;
    }
    try {
      const [rows, st] = await Promise.all([listCases(), vaultStatus()]);
      setCases(rows);
      setStatus(st);
      if (rows.length === 0) setSaveState('UNSAVED');
      else if (st.exportRecommended) setSaveState('EXPORT RECOMMENDED');
      else setSaveState('SAVED LOCALLY');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the local vault.');
      setSaveState('UNAVAILABLE');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onCreate() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const id = `PM-LOCAL-${Date.now().toString(36).toUpperCase()}`;
      await createCase({
        id,
        title: 'New local case',
        description: 'Created on this device. Rename and add evidence.',
        status: 'DRAFT',
        confidentialityLevel: 'STANDARD',
        eventDate: null,
        tags: [],
        isDemo: false,
      });
      setMessage(`Case ${id} saved locally.`);
      await refresh();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function onExport(caseId: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { filename, blob } = await buildCaseBundle(caseId, {
        password: exportPassword || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage(
        exportPassword
          ? `Encrypted backup exported (${filename}). Store the password separately — it cannot be recovered.`
          : `Backup exported (${filename}). WARNING: this file contains private evidence — store it securely and do not share it.`,
      );
      await refresh();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function onPickFile(file: File) {
    setBusy(true);
    setError(null);
    setMessage(null);
    setPreview(null);
    try {
      const text = await file.text();
      setPreview(await inspectBundleFile(text));
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function onImport(mode: 'copy' | 'overwrite') {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const r = await applyBundle(preview, { password: password || undefined, mode });
      const bad = r.hashChecks.filter((h) => !h.ok);
      setMessage(
        bad.length > 0
          ? `Imported as ${r.caseId} with ${bad.length} HASH MISMATCH(ES) — treat this backup as suspect.`
          : `Imported as ${r.caseId} (${r.importedSources} sources, ${r.importedItems} items, hashes verified).`,
      );
      setPreview(null);
      setPassword('');
      await refresh();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(caseId: string) {
    if (!window.confirm(`Delete local case ${caseId}? Export a backup first if you need it.`)) return;
    setBusy(true);
    try {
      await deleteCase(caseId);
      await refresh();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="label-strong">Local vault (IndexedDB — this device only)</p>
          <span className="badge normal-case tracking-normal" data-testid="vault-state">
            {saveState}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-muted">
          Cases persist across refresh and reload. Nothing is uploaded. Export a{' '}
          <code>.postalmind-case</code> backup before clearing browser data.
          {status?.estimate
            ? ` Storage: ${Math.round(status.estimate.usage / 1024)} KB of ${Math.round(status.estimate.quota / 1024 / 1024)} MB.`
            : ''}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={onCreate} disabled={busy}>
            New local case
          </button>
          <label className="btn cursor-pointer">
            Import case
            <input
              type="file"
              accept=".postalmind-case,application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onPickFile(e.target.files[0])}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
          <label htmlFor="expw">Export password (optional, AES-256-GCM)</label>
          <input
            id="expw"
            type="password"
            className="field w-auto"
            autoComplete="new-password"
            value={exportPassword}
            onChange={(e) => setExportPassword(e.target.value)}
            placeholder="Leave empty for plaintext + warning"
          />
        </div>
        {message && <p className="mt-3 text-[13px]">{message}</p>}
        {error && (
          <p className="mt-3 text-[13px]" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
      </section>

      {preview && (
        <section className="card">
          <p className="label-strong">Import preview</p>
          <dl className="mt-2 text-[13px]">
            <dt className="text-faint">Case</dt>
            <dd className="break-words">
              {preview.manifest.caseTitle} ({preview.manifest.caseId})
            </dd>
            <dt className="mt-2 text-faint">Contents</dt>
            <dd>
              {preview.manifest.sourceCount} sources · {preview.manifest.evidenceItemCount} items · exported{' '}
              {preview.manifest.exportedAt.slice(0, 10)} · {preview.encrypted ? 'encrypted' : 'plaintext'}
            </dd>
            {preview.collision && (
              <dd className="mt-1" style={{ color: 'var(--warn)' }}>
                A case with this id already exists — import will create a renamed copy unless you choose
                overwrite.
              </dd>
            )}
          </dl>
          {preview.encrypted && (
            <input
              type="password"
              className="field mt-3"
              autoComplete="current-password"
              placeholder="Backup password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={() => onImport('copy')} disabled={busy}>
              Import as copy
            </button>
            {preview.collision && (
              <button type="button" className="btn" onClick={() => onImport('overwrite')} disabled={busy}>
                Overwrite existing
              </button>
            )}
            <button type="button" className="btn" onClick={() => setPreview(null)}>
              Cancel
            </button>
          </div>
        </section>
      )}

      <section>
        <p className="label-strong">Cases on this device ({cases.length})</p>
        <div className="mt-2 space-y-2">
          {cases.map((c) => (
            <div key={c.id} className="card text-[13px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium break-words">{c.title}</p>
                <span className="badge normal-case tracking-normal">SAVED LOCALLY</span>
              </div>
              <p className="mt-1 font-mono text-[11.5px] text-faint break-words">{c.id}</p>
              <p className="mt-1 text-muted">
                {c.sourceCount} sources · {c.evidenceItemCount} items · saved{' '}
                {c.savedAt ? c.savedAt.slice(0, 10) : '—'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="btn" onClick={() => onExport(c.id)} disabled={busy}>
                  Export case
                </button>
                <button type="button" className="btn" onClick={() => onDelete(c.id)} disabled={busy}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {cases.length === 0 && <p className="text-[13px] text-faint">No local cases yet.</p>}
        </div>
      </section>
    </div>
  );
}

function friendly(e: unknown): string {
  if (e instanceof VaultQuotaError) return e.message;
  if (e instanceof VaultUnavailableError) return e.message;
  if (e instanceof Error) {
    if (e.name === 'BadPasswordError') return 'Wrong password, or the backup file is corrupt.';
    return e.message;
  }
  return 'Something went wrong with the local vault.';
}
