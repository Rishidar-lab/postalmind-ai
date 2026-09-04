/**
 * EvidenceSource metadata, raw blobs, and EvidenceItem persistence (IndexedDB).
 */

import type { EvidenceItem, EvidenceSource } from '@/lib/evidence/types';
import { del, get, getAll, put, tx } from './db';
import { STORES, type StoredBlob } from './schema';

// --- sources -------------------------------------------------------------

export async function listSources(caseId: string): Promise<EvidenceSource[]> {
  return tx([STORES.sources], 'readonly', (t) =>
    getAll<EvidenceSource>(t.objectStore(STORES.sources).index('caseId'), caseId),
  );
}

export async function putSource(source: EvidenceSource): Promise<void> {
  await tx([STORES.sources], 'readwrite', (t) => put(t.objectStore(STORES.sources), source));
}

// --- raw blobs (immutable originals) ------------------------------------

export async function putBlob(record: StoredBlob): Promise<void> {
  await tx([STORES.blobs], 'readwrite', (t) => put(t.objectStore(STORES.blobs), record));
}

export async function getBlob(sourceId: string): Promise<StoredBlob | undefined> {
  return tx([STORES.blobs], 'readonly', (t) => get<StoredBlob>(t.objectStore(STORES.blobs), sourceId));
}

export async function listBlobs(caseId: string): Promise<StoredBlob[]> {
  return tx([STORES.blobs], 'readonly', (t) =>
    getAll<StoredBlob>(t.objectStore(STORES.blobs).index('caseId'), caseId),
  );
}

// --- items -------------------------------------------------------------

export async function listItems(caseId: string): Promise<EvidenceItem[]> {
  return tx([STORES.items], 'readonly', async (t) => {
    const rows = await getAll<EvidenceItem>(t.objectStore(STORES.items).index('caseId'), caseId);
    return rows.sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? ''));
  });
}

export async function putItems(items: EvidenceItem[]): Promise<void> {
  await tx([STORES.items], 'readwrite', async (t) => {
    const store = t.objectStore(STORES.items);
    for (const it of items) await put(store, it);
  });
}

export async function patchItem(id: string, patch: Partial<EvidenceItem>): Promise<EvidenceItem | undefined> {
  return tx([STORES.items], 'readwrite', async (t) => {
    const store = t.objectStore(STORES.items);
    const cur = await get<EvidenceItem>(store, id);
    if (!cur) return undefined;
    const next = { ...cur, ...patch, id: cur.id };
    await put(store, next);
    return next;
  });
}

export async function deleteItem(id: string): Promise<void> {
  await tx([STORES.items], 'readwrite', (t) => del(t.objectStore(STORES.items), id));
}

export async function deleteSourceCascade(caseId: string, sourceId: string): Promise<void> {
  await tx([STORES.sources, STORES.blobs, STORES.items], 'readwrite', async (t) => {
    await del(t.objectStore(STORES.sources), sourceId);
    await del(t.objectStore(STORES.blobs), sourceId);
    const items = await getAll<EvidenceItem>(t.objectStore(STORES.items).index('caseId'), caseId);
    for (const it of items) if (it.sourceId === sourceId) await del(t.objectStore(STORES.items), it.id);
  });
}
