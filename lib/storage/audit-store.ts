/**
 * Append-only audit log persistence (IndexedDB).
 *
 * The audit log records that an action happened — never the evidence content.
 * `makeAuditEntry` already scrubs summaries/detail of anything PII-shaped.
 */

import { makeAuditEntry } from '@/lib/evidence/audit';
import type { AuditAction, AuditLogEntry } from '@/lib/evidence/types';
import { getAll, put, tx } from './db';
import { STORES } from './schema';

export async function appendAudit(
  action: AuditAction,
  summary: string,
  opts: { caseId?: string | null; detail?: Record<string, unknown> } = {},
): Promise<AuditLogEntry> {
  const entry = makeAuditEntry(action, summary, opts);
  await tx([STORES.audit], 'readwrite', (t) => put(t.objectStore(STORES.audit), entry));
  return entry;
}

export async function putAuditEntry(entry: AuditLogEntry): Promise<void> {
  await tx([STORES.audit], 'readwrite', (t) => put(t.objectStore(STORES.audit), entry));
}

export async function listAudit(caseId: string): Promise<AuditLogEntry[]> {
  return tx([STORES.audit], 'readonly', async (t) => {
    const rows = await getAll<AuditLogEntry>(t.objectStore(STORES.audit).index('caseId'), caseId);
    return rows.sort((a, b) => b.at.localeCompare(a.at));
  });
}
