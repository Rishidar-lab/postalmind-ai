'use client';

import { useMemo, useState } from 'react';
import { generateRTIDraft, type RTIInput } from '@/lib/tools/rti';

export function RtiClient() {
  const [f, setF] = useState<RTIInput>({
    applicantName: '',
    address: '',
    pioDesignation: 'The Public Information Officer',
    publicAuthority: '',
    subject: '',
    queries: [''],
    preferredDelivery: 'post',
    place: '',
  });
  const [copied, setCopied] = useState(false);

  const draft = useMemo(
    () => generateRTIDraft({ ...f, queries: f.queries.filter((q) => q.trim()) }),
    [f],
  );

  const set = <K extends keyof RTIInput>(k: K, v: RTIInput[K]) => setF((s) => ({ ...s, [k]: v }));
  const setQuery = (i: number, v: string) =>
    setF((s) => ({ ...s, queries: s.queries.map((q, idx) => (idx === i ? v : q)) }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
        <Field label="Your full name" v={f.applicantName} onChange={(v) => set('applicantName', v)} />
        <Field label="Your postal address" v={f.address} onChange={(v) => set('address', v)} textarea />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone (optional)" v={f.phone ?? ''} onChange={(v) => set('phone', v)} />
          <Field label="Email (optional)" v={f.email ?? ''} onChange={(v) => set('email', v)} />
        </div>
        <Field
          label="Public authority / office (that holds the records)"
          v={f.publicAuthority}
          onChange={(v) => set('publicAuthority', v)}
          placeholder="O/o the Supdt. of Post Offices, __ Division"
        />
        <Field label="Office address (optional)" v={f.authorityAddress ?? ''} onChange={(v) => set('authorityAddress', v)} />
        <Field label="Subject (brief)" v={f.subject} onChange={(v) => set('subject', v)} placeholder="Delay in disbursement of revised TRCA arrears" />

        <div>
          <label className="label-strong">Specific questions</label>
          {f.queries.map((q, i) => (
            <input
              key={i}
              className="field mt-1.5"
              value={q}
              placeholder={`Question ${i + 1} — ask for a record, not a reason`}
              onChange={(e) => setQuery(i, e.target.value)}
            />
          ))}
          <button
            type="button"
            className="btn mt-2"
            onClick={() => setF((s) => ({ ...s, queries: [...s.queries, ''] }))}
          >
            Add question
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Period from" v={f.periodFrom ?? ''} onChange={(v) => set('periodFrom', v)} type="date" />
          <Field label="Period to" v={f.periodTo ?? ''} onChange={(v) => set('periodTo', v)} type="date" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Place" v={f.place ?? ''} onChange={(v) => set('place', v)} />
          <label className="text-[13px]">
            <span className="label-strong block">Delivery</span>
            <select
              className="field mt-1.5"
              value={f.preferredDelivery}
              onChange={(e) => set('preferredDelivery', e.target.value as RTIInput['preferredDelivery'])}
            >
              <option value="post">By post</option>
              <option value="email">By email</option>
              <option value="certified copies">Certified copies</option>
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={!!f.isBPL} onChange={(e) => set('isBPL', e.target.checked)} />
          I am below the poverty line (no fee, proof enclosed)
        </label>
      </form>

      <div>
        <div className="flex items-center justify-between">
          <p className="label-strong">Draft</p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              navigator.clipboard?.writeText(draft.text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="mt-2 max-h-[520px] overflow-auto rounded border border-line bg-paper p-3 font-mono text-[12px] whitespace-pre-wrap">
          {draft.text}
        </pre>
        {draft.warnings.length > 0 && (
          <div className="mt-3 rounded border p-3 text-[12.5px]" style={{ borderColor: 'var(--warn)' }}>
            <p className="font-semibold" style={{ color: 'var(--warn)' }}>Before you file</p>
            <ul className="mt-1 list-disc pl-5">
              {draft.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-3 rounded border border-line p-3 text-[12.5px] text-muted">
          <p className="label-strong">Checklist</p>
          <ul className="mt-1 list-disc pl-5">
            {draft.checklist.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  v,
  onChange,
  placeholder,
  textarea,
  type,
}: {
  label: string;
  v: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-[13px]">
      <span className="label-strong block">{label}</span>
      {textarea ? (
        <textarea className="field mt-1.5 min-h-[64px]" value={v} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="field mt-1.5" type={type ?? 'text'} value={v} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
