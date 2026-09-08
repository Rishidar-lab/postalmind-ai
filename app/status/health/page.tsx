'use client';

import { useEffect, useState } from 'react';

interface Health {
  status: string;
  time: string;
  app: { env: string; version: string; demoMode: boolean };
  ai: { configured: boolean; provider: string; model: string; mode: string; probe?: { ok: boolean; detail: string } };
  database: { configured: boolean; driver: string };
  storage: { configured: boolean; driver: string; durable: boolean };
  sources: { count: number; corpusPassages: number };
}

export default function HealthPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [probing, setProbing] = useState(false);

  const load = (probe: boolean) => {
    setProbing(probe);
    fetch(`/api/health${probe ? '?probe=ai' : ''}`)
      .then((r) => r.json())
      .then((d) => setHealth(d))
      .catch(() => setErr('Could not load /api/health'))
      .finally(() => setProbing(false));
  };

  useEffect(() => load(false), []);

  return (
    <div className="space-y-5">
      <header>
        <p className="label-strong">System status</p>
        <h1 className="mt-2 text-3xl">Health</h1>
        <p className="mt-2 text-muted">
          Live read of <code>/api/health</code>. No secrets are shown.
        </p>
      </header>

      {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}

      {health && (
        <div className="card">
          <table className="data">
            <tbody>
              <Row k="Status" v={health.status} />
              <Row k="Environment" v={`${health.app.env} · v${health.app.version}`} />
              <Row k="Mode" v={health.app.demoMode ? 'demo (no language model)' : 'model configured'} />
              <Row k="AI provider" v={`${health.ai.provider} · ${health.ai.model} · ${health.ai.mode}`} />
              {health.ai.probe && <Row k="AI probe" v={`${health.ai.probe.ok ? 'ok' : 'FAIL'} — ${health.ai.probe.detail}`} />}
              <Row k="Database" v={health.database.configured ? health.database.driver : 'not configured'} />
              <Row k="Storage" v={`${health.storage.driver} · ${health.storage.durable ? 'durable' : 'NOT durable'}`} />
              <Row k="Sources" v={`${health.sources.count} records · ${health.sources.corpusPassages} passages`} />
              <Row k="Checked" v={health.time} />
            </tbody>
          </table>
          <button type="button" className="btn mt-3" onClick={() => load(true)} disabled={probing}>
            {probing ? 'Probing provider…' : 'Probe AI provider'}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <tr>
      <th style={{ width: 160 }}>{k}</th>
      <td>{v}</td>
    </tr>
  );
}
