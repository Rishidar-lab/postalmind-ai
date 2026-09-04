/**
 * Local case vault — the high-level API the evidence UI uses.
 *
 * Everything here runs in the browser against IndexedDB. No network. The user
 * owns this data and exports backups themselves (lib/storage/backup.ts).
 */

import { sha256Hex } from '@/lib/evidence/hash';
import type {
  Case,
  EvidenceItem,
  EvidenceSource,
} from '@/lib/evidence/types';
import type { LocalAnalysis } from '@/lib/evidence/analyze';
import { buildTimeline, type Timeline } from '@/lib/evidence/timeline';
import { caseStrengthSummary } from '@/lib/evidence/strength';
import { appendAudit, listAudit } from './audit-store';
import {
  deleteCaseCascade,
  getCaseRecord,
  getExtras,
  listCases as _listCases,
  patchCase,
  saveCase,
  saveExtras,
} from './case-store';
import {
  deleteSourceCascade,
  getBlob,
  listBlobs,
  listItems,
  listSources,
  patchItem,
  putBlob,
  putItems,
  putSource,
} from './evidence-store';
import { storageEstimate, vaultAvailable } from './db';
import type { CaseExtras, FullCase, StoredBlob, VaultCaseRecord } from './schema';

export { vaultAvailable } from './db';
export type { FullCase, VaultCaseRecord, CaseExtras } from './schema';

function id(prefix: string): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rnd}`;
}

export async function listCases(): Promise<VaultCaseRecord[]> {
  return _listCases();
}

export async function createCase(
  input: Omit<Case, 'createdAt' | 'updatedAt' | 'sourceCount' | 'evidenceItemCount'>,
): Promise<VaultCaseRecord> {
  const now = new Date().toISOString();
  const record = await saveCase({
    ...input,
    createdAt: now,
    updatedAt: now,
    sourceCount: 0,
    evidenceItemCount: 0,
  });
  await appendAudit('CASE_CREATED', `Case ${input.id} created in local vault`, { caseId: input.id });
  return record;
}

export async function updateCase(caseId: string, patch: Partial<Case>): Promise<VaultCaseRecord | undefined> {
  const r = await patchCase(caseId, patch);
  if (r) await appendAudit('CASE_UPDATED', `Case ${caseId} updated`, { caseId });
  return r;
}

export async function deleteCase(caseId: string): Promise<void> {
  await deleteCaseCascade(caseId);
}

/**
 * Import an already-analysed WhatsApp export into a case. `analysis` comes from
 * `analyzeWhatsAppText` (browser). The raw text is stored as an immutable blob
 * on the device (never uploaded).
 */
export async function addWhatsAppSource(
  caseId: string,
  args: {
    rawText: string;
    filename: string;
    analysis: LocalAnalysis;
    keepRawBlob?: boolean;
    aliasesApplied?: boolean;
  },
): Promise<EvidenceSource> {
  const sourceId = id('src');
  const sha256 = args.analysis.source.sha256;

  const source: EvidenceSource = {
    id: sourceId,
    caseId,
    type: 'WHATSAPP_TEXT',
    originalFilename: args.filename || 'whatsapp.txt',
    mimeType: 'text/plain',
    sha256,
    byteLength: args.analysis.source.byteLength,
    uploadedAt: new Date().toISOString(),
    originalStoredPath: args.keepRawBlob === false ? null : `vault://blob/${sourceId}`,
    derivedStoredPath: null,
    redactedStoredPath: null,
    isOriginalImmutable: true,
    metadata: {
      participants: args.analysis.parse.participants,
      dateRange: args.analysis.parse.dateRange,
      detectedFormat: args.analysis.parse.detectedFormat,
      dateOrder: args.analysis.parse.dateOrder,
      aliasesApplied: !!args.aliasesApplied,
      warnings: args.analysis.parse.warnings,
    },
  };

  // Re-key the analysed items to this case + source.
  const items: EvidenceItem[] = args.analysis.analysis.items.map((it, i) => ({
    ...it,
    id: `${sourceId}_i${i}`,
    caseId,
    sourceId,
    corroboration: it.corroboration.map((c) => remapCorr(c, args.analysis.analysis.items, sourceId)),
  }));

  await putSource(source);
  if (args.keepRawBlob !== false) {
    const blob: StoredBlob = {
      id: sourceId,
      caseId,
      sourceId,
      filename: source.originalFilename,
      mimeType: 'text/plain',
      sha256,
      blob: new Blob([args.rawText], { type: 'text/plain' }),
      storedAt: new Date().toISOString(),
    };
    await putBlob(blob);
  }
  await putItems(items);

  await appendAudit('SOURCE_IMPORTED', 'WhatsApp export imported to vault', {
    caseId,
    detail: { sourceId, sha256, messages: args.analysis.parse.messages.length, keptRaw: args.keepRawBlob !== false },
  });
  await appendAudit('HASH_CALCULATED', 'SHA-256 computed for imported original', {
    caseId,
    detail: { sourceId, sha256 },
  });
  await appendAudit('ANALYSIS_CREATED', 'Classified evidence items from import', {
    caseId,
    detail: { sourceId, items: items.length },
  });

  await recount(caseId);
  return source;
}

function remapCorr(oldId: string, oldItems: EvidenceItem[], sourceId: string): string {
  const idx = oldItems.findIndex((o) => o.id === oldId);
  return idx >= 0 ? `${sourceId}_i${idx}` : oldId;
}

export async function updateItem(
  caseId: string,
  itemId: string,
  patch: Partial<EvidenceItem>,
): Promise<EvidenceItem | undefined> {
  const r = await patchItem(itemId, patch);
  if (r) {
    await appendAudit('MANUAL_CORRECTION', `Analyst edited evidence item ${itemId}`, {
      caseId,
      detail: { itemId, fields: Object.keys(patch).join(',') },
    });
  }
  return r;
}

export async function deleteSource(caseId: string, sourceId: string): Promise<void> {
  await deleteSourceCascade(caseId, sourceId);
  await appendAudit('CASE_UPDATED', `Source ${sourceId} removed`, { caseId, detail: { sourceId } });
  await recount(caseId);
}

export async function saveNotes(caseId: string, notes: string): Promise<void> {
  const extras = await getExtras(caseId);
  await saveExtras({ ...extras, analystNotes: notes });
}

export async function addManualEvent(
  caseId: string,
  ev: { at: string; title: string; note?: string },
): Promise<CaseExtras> {
  const extras = await getExtras(caseId);
  const next: CaseExtras = {
    ...extras,
    manualEvents: [...extras.manualEvents, { id: id('me'), ...ev }],
  };
  await saveExtras(next);
  await appendAudit('CASE_UPDATED', 'Manual timeline event added', { caseId });
  return next;
}

export async function saveRedactionMap(
  caseId: string,
  sourceId: string,
  map: Record<string, string>,
): Promise<void> {
  const extras = await getExtras(caseId);
  await saveExtras({
    ...extras,
    redactionMaps: { ...extras.redactionMaps, [sourceId]: map },
  });
  await appendAudit('REDACTION_MADE', `Redaction map saved for source ${sourceId}`, {
    caseId,
    detail: { sourceId, spans: Object.keys(map).length },
  });
}

export async function getFullCase(caseId: string): Promise<FullCase | null> {
  const rec = await getCaseRecord(caseId);
  if (!rec) return null;
  const [sources, items, extras, audit, blobs] = await Promise.all([
    listSources(caseId),
    listItems(caseId),
    getExtras(caseId),
    listAudit(caseId),
    listBlobs(caseId),
  ]);
  return { case: rec, sources, items, extras, audit, blobs };
}

export interface CaseView extends FullCase {
  timeline: Timeline;
  strength: ReturnType<typeof caseStrengthSummary>;
  categories: Record<string, number>;
}

export async function getCaseView(caseId: string): Promise<CaseView | null> {
  const full = await getFullCase(caseId);
  if (!full) return null;
  const timeline = buildTimeline(full.items, {
    centralEventDate: full.case.eventDate,
    manualEvents: full.extras.manualEvents,
  });
  const categories: Record<string, number> = {};
  for (const it of full.items) for (const c of it.category) categories[c] = (categories[c] ?? 0) + 1;
  return { ...full, timeline, strength: caseStrengthSummary(full.items), categories };
}

async function recount(caseId: string): Promise<void> {
  const [sources, items] = await Promise.all([listSources(caseId), listItems(caseId)]);
  await patchCase(caseId, { sourceCount: sources.length, evidenceItemCount: items.length });
}

export interface VaultStatus {
  available: boolean;
  caseCount: number;
  estimate: { usage: number; quota: number; ratio: number } | null;
  /** true when usage is high enough to nudge an export. */
  exportRecommended: boolean;
}

export async function vaultStatus(): Promise<VaultStatus> {
  if (!vaultAvailable()) {
    return { available: false, caseCount: 0, estimate: null, exportRecommended: false };
  }
  const [cases, estimate] = await Promise.all([_listCases(), storageEstimate()]);
  return {
    available: true,
    caseCount: cases.length,
    estimate,
    exportRecommended: !!estimate && estimate.ratio > 0.7,
  };
}

/** Compute a fresh sha256 of a stored blob for integrity verification. */
export async function verifyBlob(
  sourceId: string,
): Promise<{ ok: boolean; expected: string; actual: string } | null> {
  const rec = await getBlob(sourceId);
  if (!rec) return null;
  const actual = await sha256Hex(await rec.blob.arrayBuffer());
  return { ok: actual === rec.sha256, expected: rec.sha256, actual };
}
