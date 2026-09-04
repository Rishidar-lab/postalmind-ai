/**
 * Demo seed: builds case PM-GDS-MELA-2026-09-10 from the synthetic WhatsApp
 * export by running the real ingest pipeline, so the demo data is genuine
 * classifier output.
 */

import { makeAuditEntry } from '@/lib/evidence/audit';
import { sha256HexSync } from '@/lib/evidence/hash-sync';
import { ingestWhatsApp } from '@/lib/evidence/ingest';
import type { Case, EvidenceSource } from '@/lib/evidence/types';
import { applyAliases, parseWhatsAppExport } from '@/lib/evidence/whatsapp';
import { DEMO_ALIASES, DEMO_WHATSAPP_EXPORT } from '@/lib/demo/whatsapp-sample';
import type { CaseStore } from './types';

export const DEMO_CASE_ID = 'PM-GDS-MELA-2026-09-10';

export async function seedDemo(store: CaseStore): Promise<void> {
  if (await store.getCase(DEMO_CASE_ID)) return;

  const now = '2026-09-11T10:00:00Z';
  const caseRecord: Case = {
    id: DEMO_CASE_ID,
    title: 'Business / Mela target pressure (DEMO)',
    description:
      'DEMO case built from a synthetic WhatsApp export. A branch had a sub-division business Mela on 10 September 2026. The week before, a supervising official sent repeated messages about the same individual RPLI target, including a public ranking comparison, after-hours and Sunday messages, an inspection reference, and — after the Mela — a demand for a written explanation. One clearly supportive message is included as counter-evidence. No real names, numbers or offices appear.',
    createdAt: now,
    updatedAt: now,
    status: 'ACTIVE',
    sourceCount: 0,
    evidenceItemCount: 0,
    confidentialityLevel: 'STANDARD',
    eventDate: '2026-09-10',
    tags: ['demo', 'mela', 'target-pressure', 'rpli', 'PM-GDS-MELA-2026-09-10'],
    isDemo: true,
  };
  await store.createCase(caseRecord);
  await store.appendAudit(makeAuditEntry('CASE_CREATED', `Demo case ${DEMO_CASE_ID} seeded`, { caseId: DEMO_CASE_ID }));

  const parsed = applyAliases(parseWhatsAppExport(DEMO_WHATSAPP_EXPORT), DEMO_ALIASES);
  const bytes = Buffer.from(DEMO_WHATSAPP_EXPORT, 'utf8');
  const hash = sha256HexSync(bytes);

  const source: EvidenceSource = {
    id: 'src-demo-whatsapp',
    caseId: DEMO_CASE_ID,
    type: 'WHATSAPP_TEXT',
    originalFilename: 'demo-mela-chat.txt',
    mimeType: 'text/plain',
    sha256: hash,
    byteLength: bytes.length,
    uploadedAt: now,
    originalStoredPath: 'demo://synthetic',
    derivedStoredPath: null,
    redactedStoredPath: null,
    isOriginalImmutable: true,
    metadata: {
      synthetic: true,
      participants: parsed.participants,
      dateRange: parsed.dateRange,
      detectedFormat: parsed.detectedFormat,
    },
  };
  await store.addSource(source);
  await store.appendAudit(
    makeAuditEntry('SOURCE_IMPORTED', 'Synthetic WhatsApp export imported', {
      caseId: DEMO_CASE_ID,
      detail: { sourceId: source.id, sha256: hash, messages: parsed.messages.length },
    }),
  );
  await store.appendAudit(
    makeAuditEntry('HASH_CALCULATED', 'SHA-256 computed for imported original', {
      caseId: DEMO_CASE_ID,
      detail: { sourceId: source.id, sha256: hash },
    }),
  );

  const { items } = ingestWhatsApp(parsed, {
    caseId: DEMO_CASE_ID,
    sourceId: source.id,
    workingHours: { start: '09:00', end: '17:00' },
    eventDate: '2026-09-10',
    caseWindow: { start: '2026-09-01T00:00:00', end: '2026-09-30T23:59:59' },
  });
  await store.addItems(items);
  await store.appendAudit(
    makeAuditEntry('ANALYSIS_CREATED', 'Classified evidence items from synthetic export', {
      caseId: DEMO_CASE_ID,
      detail: { sourceId: source.id, items: items.length },
    }),
  );
}
