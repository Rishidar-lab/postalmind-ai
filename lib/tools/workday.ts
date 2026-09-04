/**
 * GDS Workday Log.
 *
 * A personal, local-only work diary — deliberately separate from the case
 * evidence vault (lib/storage/case-store.ts etc.): no chain-of-custody,
 * redaction or publication model is needed for "what time did today's shift
 * start". It lives in the same IndexedDB database (lib/storage/db.ts) in
 * its own object store, never leaves the device, and generates only a
 * factual chronology — never a legal conclusion.
 */

import { del, get, getAll, put, tx } from '@/lib/storage/db';
import { STORES } from '@/lib/storage/schema';

export interface WorkdayEntry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  mailWork: string | null;
  branchWork: string | null;
  financialWork: string | null;
  /** Business/Mela/target-related procurement work. */
  businessWork: string | null;
  travel: string | null;
  /** Free text describing any after-hours work communication that day. Empty/null = none logged. */
  afterHoursCommunication: string | null;
  supervisorInstruction: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function newWorkdayEntry(date: string): WorkdayEntry {
  const now = nowIso();
  return {
    id: `wd_${date}_${Math.random().toString(36).slice(2, 8)}`,
    date,
    scheduledStart: null,
    scheduledEnd: null,
    actualStart: null,
    actualEnd: null,
    mailWork: null,
    branchWork: null,
    financialWork: null,
    businessWork: null,
    travel: null,
    afterHoursCommunication: null,
    supervisorInstruction: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listWorkdayEntries(): Promise<WorkdayEntry[]> {
  return tx([STORES.workday], 'readonly', async (t) => {
    const rows = await getAll<WorkdayEntry>(t.objectStore(STORES.workday));
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  });
}

export async function getWorkdayEntry(id: string): Promise<WorkdayEntry | undefined> {
  return tx([STORES.workday], 'readonly', (t) => get<WorkdayEntry>(t.objectStore(STORES.workday), id));
}

export async function saveWorkdayEntry(entry: WorkdayEntry): Promise<WorkdayEntry> {
  const record: WorkdayEntry = { ...entry, updatedAt: nowIso() };
  await tx([STORES.workday], 'readwrite', (t) => put(t.objectStore(STORES.workday), record));
  return record;
}

export async function deleteWorkdayEntry(id: string): Promise<void> {
  await tx([STORES.workday], 'readwrite', (t) => del(t.objectStore(STORES.workday), id));
}

// --- Chronology (deterministic aggregation — no legal conclusion) ---------

export interface WorkdayPeriodSummary {
  /** "2026-W36" for weekly, "2026-09" for monthly. */
  period: string;
  entries: WorkdayEntry[];
  daysLogged: number;
  daysWithAfterHours: number;
  daysWithBusinessWork: number;
}

function isoWeekKey(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const target = new Date(d.valueOf());
  const dayNr = (d.getUTCDay() + 6) % 7; // Monday = 0
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function nonEmpty(v: string | null): boolean {
  return !!v && v.trim().length > 0;
}

function summarizeBy(entries: WorkdayEntry[], keyFn: (date: string) => string): WorkdayPeriodSummary[] {
  const byPeriod = new Map<string, WorkdayEntry[]>();
  for (const e of entries) {
    const key = keyFn(e.date);
    (byPeriod.get(key) ?? byPeriod.set(key, []).get(key)!).push(e);
  }
  return [...byPeriod.entries()]
    .map(([period, es]) => ({
      period,
      entries: es.sort((a, b) => a.date.localeCompare(b.date)),
      daysLogged: es.length,
      daysWithAfterHours: es.filter((e) => nonEmpty(e.afterHoursCommunication)).length,
      daysWithBusinessWork: es.filter((e) => nonEmpty(e.businessWork)).length,
    }))
    .sort((a, b) => b.period.localeCompare(a.period));
}

export function summarizeByWeek(entries: WorkdayEntry[]): WorkdayPeriodSummary[] {
  return summarizeBy(entries, isoWeekKey);
}

export function summarizeByMonth(entries: WorkdayEntry[]): WorkdayPeriodSummary[] {
  return summarizeBy(entries, (date) => date.slice(0, 7));
}

// --- Export (local only — nothing is uploaded) -----------------------------

export function exportWorkdayLogJson(entries: WorkdayEntry[]): string {
  return JSON.stringify({ exportedAt: nowIso(), entryCount: entries.length, entries }, null, 2);
}

export function exportWorkdayLogText(entries: WorkdayEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const lines = [`GDS Workday Log — exported ${nowIso()}`, `${sorted.length} day(s) logged`, ''];
  for (const e of sorted) {
    lines.push(`## ${e.date}`);
    lines.push(`Scheduled: ${e.scheduledStart ?? '—'}–${e.scheduledEnd ?? '—'}    Actual: ${e.actualStart ?? '—'}–${e.actualEnd ?? '—'}`);
    if (nonEmpty(e.mailWork)) lines.push(`Mail work: ${e.mailWork}`);
    if (nonEmpty(e.branchWork)) lines.push(`Branch work: ${e.branchWork}`);
    if (nonEmpty(e.financialWork)) lines.push(`Financial work: ${e.financialWork}`);
    if (nonEmpty(e.businessWork)) lines.push(`Business/Mela work: ${e.businessWork}`);
    if (nonEmpty(e.travel)) lines.push(`Travel: ${e.travel}`);
    if (nonEmpty(e.afterHoursCommunication)) lines.push(`After-hours communication: ${e.afterHoursCommunication}`);
    if (nonEmpty(e.supervisorInstruction)) lines.push(`Supervisor instruction: ${e.supervisorInstruction}`);
    if (nonEmpty(e.notes)) lines.push(`Notes: ${e.notes}`);
    lines.push('');
  }
  return lines.join('\n');
}
