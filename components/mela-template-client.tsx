'use client';

import { useEffect, useState } from 'react';
import {
  emptyMelaTemplate,
  melaNeutralityCheck,
  summarizeMelaTemplate,
  validateMelaTemplate,
  type MelaTemplate,
} from '@/lib/evidence/mela-template';

const STORAGE_KEY = 'postalmind-mela-template-v1';

/**
 * Structured Mela workflow (template only). PRE-EVENT / EVENT-DAY /
 * POST-EVENT fields, persisted to this device's localStorage. Neutral wording
 * is enforced structurally — there is no field for a legal conclusion.
 */
export function MelaTemplateClient() {
  const [t, setT] = useState<MelaTemplate>(() => emptyMelaTemplate());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MelaTemplate;
        if (parsed.caseId === 'PM-GDS-MELA-2026-09-10') setT(parsed);
      }
    } catch {
      /* start empty */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...t, updatedAt: new Date().toISOString() }));
    } catch {
      /* quota/private mode — form still works for this session */
    }
  }, [t, loaded]);

  const set = (section: 'preEvent' | 'eventDay' | 'postEvent', key: string, value: string) =>
    setT((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));

  const validation = validateMelaTemplate(t);
  const neutrality = melaNeutralityCheck(t);

  return (
    <div className="space-y-4">
      <section className="card">
        <p className="label-strong">Case template · PM-GDS-MELA-2026-09-10 · event 10 September 2026</p>
        <p className="mt-1 text-[13px] text-muted">
          Template only — fill in on this device with aliases, never real names. Saved locally as you
          type. {summarizeMelaTemplate(t)}
        </p>
        {!validation.ok && (
          <p className="mt-2 text-[12.5px]" style={{ color: 'var(--warn)' }}>
            Missing minimum facts: {validation.missing.join(', ')}
          </p>
        )}
        {!neutrality.neutral && (
          <p className="mt-2 text-[12.5px]" style={{ color: 'var(--danger)' }}>
            Avoid legal-conclusion wording in: {neutrality.flagged.join(', ')}. Describe what happened;
            do not state harassment, misconduct or illegality unless an authoritative source supports it.
          </p>
        )}
      </section>

      <Section title="PRE-EVENT — instruction and context">
        <Field label="Instruction date" value={t.preEvent.instructionDate} onChange={(v) => set('preEvent', 'instructionDate', v)} placeholder="2026-09-03" />
        <Field label="Instruction source role" value={t.preEvent.instructionSourceRole} onChange={(v) => set('preEvent', 'instructionSourceRole', v)} placeholder="e.g. Supervising Official" />
        <Field label="Written / verbal" value={t.preEvent.writtenOrVerbal} onChange={(v) => set('preEvent', 'writtenOrVerbal', v)} placeholder="written / verbal / both / unknown" />
        <Field label="Assigned product" value={t.preEvent.assignedProduct} onChange={(v) => set('preEvent', 'assignedProduct', v)} placeholder="e.g. RPLI" />
        <Field label="Assigned target" value={t.preEvent.assignedTarget} onChange={(v) => set('preEvent', 'assignedTarget', v)} placeholder="e.g. 8 proposals for the Mela" />
        <Field label="Target basis" value={t.preEvent.targetBasis} onChange={(v) => set('preEvent', 'targetBasis', v)} placeholder="How the figure was set, if stated" />
        <Field label="Reporting requirement" value={t.preEvent.reportingRequirement} onChange={(v) => set('preEvent', 'reportingRequirement', v)} />
        <Field label="Normal duty hours" value={t.preEvent.normalDutyHours} onChange={(v) => set('preEvent', 'normalDutyHours', v)} placeholder="09:00–17:00" />
        <Area label="Target-related messages" value={t.preEvent.targetRelatedMessages} onChange={(v) => set('preEvent', 'targetRelatedMessages', v)} />
        <Area label="Peer comparison" value={t.preEvent.peerComparison} onChange={(v) => set('preEvent', 'peerComparison', v)} />
        <Area label="Public naming / ranking" value={t.preEvent.publicNamingOrRanking} onChange={(v) => set('preEvent', 'publicNamingOrRanking', v)} />
        <Area label="Inspection reference" value={t.preEvent.inspectionReference} onChange={(v) => set('preEvent', 'inspectionReference', v)} />
        <Area label="Leave reference" value={t.preEvent.leaveReference} onChange={(v) => set('preEvent', 'leaveReference', v)} />
        <Area label="Threat-like wording (exact words)" value={t.preEvent.threatLikeWording} onChange={(v) => set('preEvent', 'threatLikeWording', v)} />
        <Area label="Employee response" value={t.preEvent.employeeResponse} onChange={(v) => set('preEvent', 'employeeResponse', v)} />
        <Area label="Context before / after" value={t.preEvent.contextBeforeAfter} onChange={(v) => set('preEvent', 'contextBeforeAfter', v)} />
      </Section>

      <Section title="EVENT DAY — 10 September 2026">
        <Field label="Start time" value={t.eventDay.startTime} onChange={(v) => set('eventDay', 'startTime', v)} placeholder="10:00" />
        <Field label="Assigned activity" value={t.eventDay.assignedActivity} onChange={(v) => set('eventDay', 'assignedActivity', v)} placeholder="Mela counter duty" />
        <Field label="Customer response" value={t.eventDay.customerResponse} onChange={(v) => set('eventDay', 'customerResponse', v)} />
        <Field label="Actual achievement" value={t.eventDay.actualAchievement} onChange={(v) => set('eventDay', 'actualAchievement', v)} placeholder="e.g. 5 proposals" />
        <Field label="Revised target" value={t.eventDay.revisedTarget} onChange={(v) => set('eventDay', 'revisedTarget', v)} />
        <Area label="Supervisory instructions" value={t.eventDay.supervisoryInstructions} onChange={(v) => set('eventDay', 'supervisoryInstructions', v)} />
        <Area label="Peer comparison" value={t.eventDay.peerComparison} onChange={(v) => set('eventDay', 'peerComparison', v)} />
        <Area label="Comments" value={t.eventDay.comments} onChange={(v) => set('eventDay', 'comments', v)} />
        <Field label="End time" value={t.eventDay.endTime} onChange={(v) => set('eventDay', 'endTime', v)} placeholder="18:00" />
        <Area label="After-hours follow-up" value={t.eventDay.afterHoursFollowUp} onChange={(v) => set('eventDay', 'afterHoursFollowUp', v)} />
      </Section>

      <Section title="POST-EVENT — follow-up">
        <Area label="Performance follow-up" value={t.postEvent.performanceFollowUp} onChange={(v) => set('postEvent', 'performanceFollowUp', v)} />
        <Area label="Explanation demanded" value={t.postEvent.explanationDemanded} onChange={(v) => set('postEvent', 'explanationDemanded', v)} />
        <Area label="Inspection reference" value={t.postEvent.inspectionReference} onChange={(v) => set('postEvent', 'inspectionReference', v)} />
        <Area label="Leave consequence" value={t.postEvent.leaveConsequence} onChange={(v) => set('postEvent', 'leaveConsequence', v)} />
        <Area label="Show-cause reference" value={t.postEvent.showCauseReference} onChange={(v) => set('postEvent', 'showCauseReference', v)} />
        <Area label="Repeated communication" value={t.postEvent.repeatedCommunication} onChange={(v) => set('postEvent', 'repeatedCommunication', v)} />
        <Area label="Subsequent administrative action" value={t.postEvent.subsequentAdministrativeAction} onChange={(v) => set('postEvent', 'subsequentAdministrativeAction', v)} />
      </Section>

      <section className="card">
        <label htmlFor="mela-notes" className="label-strong">
          Analyst notes (kept on this device)
        </label>
        <textarea
          id="mela-notes"
          className="field mt-2 min-h-[88px] text-[13px]"
          value={t.analystNotes}
          onChange={(e) => setT((prev) => ({ ...prev, analystNotes: e.target.value }))}
          placeholder="What this supports / does NOT establish…"
        />
        <p className="mt-2 text-[12px] text-faint">
          TARGET_INSTRUCTION ≠ harassment · PEER_COMPARISON ≠ misconduct · AFTER_HOURS ≠ misconduct ·
          INSPECTION_REFERENCE ≠ threat. A passive-aggressive tone alone is not a legal finding.
        </p>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <p className="label-strong">{title}</p>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block text-[13px]">
      <span className="text-muted">{label}</span>
      <input className="field mt-1" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-[13px]">
      <span className="text-muted">{label}</span>
      <textarea className="field mt-1 min-h-[56px] text-[13px]" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
