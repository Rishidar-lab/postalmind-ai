import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { DB_NAME } from '@/lib/storage/schema';
import { _resetVaultConnection } from '@/lib/storage/db';
import {
  deleteWorkdayEntry,
  exportWorkdayLogJson,
  exportWorkdayLogText,
  listWorkdayEntries,
  newWorkdayEntry,
  saveWorkdayEntry,
  summarizeByMonth,
  summarizeByWeek,
  type WorkdayEntry,
} from '@/lib/tools/workday';

async function freshVault() {
  _resetVaultConnection();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
  _resetVaultConnection();
}

function entry(date: string, patch: Partial<WorkdayEntry> = {}): WorkdayEntry {
  return { ...newWorkdayEntry(date), ...patch };
}

describe('GDS Workday Log — persistence', () => {
  beforeEach(freshVault);

  it('saves and lists entries, newest date first', async () => {
    await saveWorkdayEntry(entry('2026-09-01'));
    await saveWorkdayEntry(entry('2026-09-03'));
    await saveWorkdayEntry(entry('2026-09-02'));
    const all = await listWorkdayEntries();
    expect(all.map((e) => e.date)).toEqual(['2026-09-03', '2026-09-02', '2026-09-01']);
  });

  it('persists across a simulated reload', async () => {
    const saved = await saveWorkdayEntry(entry('2026-09-10', { mailWork: '40 articles delivered' }));
    _resetVaultConnection();
    const all = await listWorkdayEntries();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(saved.id);
    expect(all[0].mailWork).toBe('40 articles delivered');
  });

  it('deletes an entry', async () => {
    const saved = await saveWorkdayEntry(entry('2026-09-11'));
    await deleteWorkdayEntry(saved.id);
    expect(await listWorkdayEntries()).toHaveLength(0);
  });
});

describe('GDS Workday Log — deterministic chronology', () => {
  it('groups entries into ISO weeks and counts after-hours/business-work days', () => {
    const entries = [
      entry('2026-09-01', { afterHoursCommunication: 'message at 9pm' }), // Tue, week 36
      entry('2026-09-02', { businessWork: 'RPLI canvassing' }),
      entry('2026-09-08'), // next week
    ];
    const weeks = summarizeByWeek(entries);
    expect(weeks.length).toBe(2);
    const first = weeks.find((w) => w.entries.some((e) => e.date === '2026-09-01'))!;
    expect(first.daysLogged).toBe(2);
    expect(first.daysWithAfterHours).toBe(1);
    expect(first.daysWithBusinessWork).toBe(1);
  });

  it('groups entries into calendar months', () => {
    const entries = [entry('2026-09-01'), entry('2026-09-30'), entry('2026-10-01')];
    const months = summarizeByMonth(entries);
    expect(months.map((m) => m.period).sort()).toEqual(['2026-09', '2026-10']);
    expect(months.find((m) => m.period === '2026-09')!.daysLogged).toBe(2);
  });

  it('never asserts a legal conclusion — export text stays a factual record', () => {
    const entries = [entry('2026-09-01', { afterHoursCommunication: 'reminder about target' })];
    const text = exportWorkdayLogText(entries);
    expect(text).toContain('2026-09-01');
    expect(text).toContain('reminder about target');
    expect(text).not.toMatch(/harassment|proven|violation/i);
  });

  it('JSON export round-trips entry data losslessly', () => {
    const entries = [entry('2026-09-01', { branchWork: 'counter duty', notes: 'quiet day' })];
    const json = JSON.parse(exportWorkdayLogJson(entries));
    expect(json.entryCount).toBe(1);
    expect(json.entries[0].branchWork).toBe('counter duty');
    expect(json.entries[0].notes).toBe('quiet day');
  });
});
