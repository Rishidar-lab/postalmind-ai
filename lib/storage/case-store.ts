/**
 * Case + CaseExtras persistence (IndexedDB).
 */

import type { Case } from '@/lib/evidence/types';
import { del, get, getAll, put, tx } from './db';
import {
  CURRENT_SCHEMA_VERSION,
  STORES,
  type CaseExtras,
  type VaultCaseRecord,
} from './schema';

function nowIso(): string {
  return new Date().toISOString();
}

export async function listCases(): Promise<VaultCaseRecord[]> {
  return tx([STORES.cases], 'readonly', async (t) => {
    const rows = await getAll<VaultCaseRecord>(t.objectStore(STORES.cases));
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  });
}

export async function getCaseRecord(id: string): Promise<VaultCaseRecord | undefined> {
  return tx([STORES.cases], 'readonly', (t) => get<VaultCaseRecord>(t.objectStore(STORES.cases), id));
}

export async function saveCase(input: Case): Promise<VaultCaseRecord> {
  const record: VaultCaseRecord = {
    ...input,
    updatedAt: nowIso(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAt: nowIso(),
  };
  await tx([STORES.cases, STORES.extras], 'readwrite', async (t) => {
    await put(t.objectStore(STORES.cases), record);
    const existing = await get<CaseExtras>(t.objectStore(STORES.extras), input.id);
    if (!existing) {
      await put(t.objectStore(STORES.extras), emptyExtras(input.id));
    }
  });
  return record;
}

export async function patchCase(id: string, patch: Partial<Case>): Promise<VaultCaseRecord | undefined> {
  return tx([STORES.cases], 'readwrite', async (t) => {
    const store = t.objectStore(STORES.cases);
    const cur = await get<VaultCaseRecord>(store, id);
    if (!cur) return undefined;
    const next: VaultCaseRecord = {
      ...cur,
      ...patch,
      id: cur.id,
      updatedAt: nowIso(),
      savedAt: nowIso(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
    await put(store, next);
    return next;
  });
}

export async function deleteCaseCascade(id: string): Promise<void> {
  await tx(
    [STORES.cases, STORES.extras, STORES.sources, STORES.blobs, STORES.items, STORES.audit],
    'readwrite',
    async (t) => {
      await del(t.objectStore(STORES.cases), id);
      await del(t.objectStore(STORES.extras), id);
      for (const s of [STORES.sources, STORES.blobs, STORES.items, STORES.audit]) {
        const idx = t.objectStore(s).index('caseId');
        const rows = await getAll<{ id: string }>(idx, id);
        for (const r of rows) await del(t.objectStore(s), r.id);
      }
    },
  );
}

export function emptyExtras(caseId: string): CaseExtras {
  return {
    caseId,
    manualEvents: [],
    redactionMaps: {},
    analystNotes: '',
    updatedAt: nowIso(),
  };
}

export async function getExtras(caseId: string): Promise<CaseExtras> {
  return tx([STORES.extras], 'readonly', async (t) => {
    const e = await get<CaseExtras>(t.objectStore(STORES.extras), caseId);
    return e ?? emptyExtras(caseId);
  });
}

export async function saveExtras(extras: CaseExtras): Promise<void> {
  await tx([STORES.extras], 'readwrite', (t) =>
    put(t.objectStore(STORES.extras), { ...extras, updatedAt: nowIso() }),
  );
}
