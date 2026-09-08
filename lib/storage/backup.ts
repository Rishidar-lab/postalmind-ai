/**
 * Portable case backup — export / import.
 *
 * A backup is a single `.postalmind-case` file (JSON envelope). It can be
 * plaintext or password-protected with **AES-256-GCM**, key derived with
 * **PBKDF2-SHA-256** (210,000 iterations, per OWASP guidance). No custom
 * cryptography — only Web Crypto primitives.
 *
 * The envelope always carries the source SHA-256 hashes in the (cleartext)
 * manifest so integrity can be checked on import even before decryption.
 */

import { sha256Hex } from '@/lib/evidence/hash';
import type {
  AuditLogEntry,
  Case,
  EvidenceItem,
  EvidenceSource,
} from '@/lib/evidence/types';
import { appendAudit, putAuditEntry } from './audit-store';
import { getCaseRecord, saveCase, saveExtras } from './case-store';
import { getFullCase } from './vault';
import { putBlob, putItems, putSource } from './evidence-store';
import { CURRENT_SCHEMA_VERSION, type CaseExtras, type StoredBlob, type VaultCaseRecord } from './schema';

const FORMAT = 'postalmind-case' as const;
const KDF_ITERATIONS = 210_000;

export interface BundleManifest {
  caseId: string;
  caseTitle: string;
  exportedAt: string;
  schemaVersion: number;
  sourceCount: number;
  evidenceItemCount: number;
  auditEntryCount: number;
  sourceHashes: Array<{ sourceId: string; filename: string; sha256: string }>;
  encrypted: boolean;
}

interface BundlePayload {
  case: Case;
  sources: EvidenceSource[];
  items: EvidenceItem[];
  extras: CaseExtras;
  audit: AuditLogEntry[];
  blobs: Array<{
    id: string;
    sourceId: string;
    filename: string;
    mimeType: string;
    sha256: string;
    dataB64: string;
  }>;
}

interface EncryptedBlock {
  alg: 'AES-GCM';
  kdf: 'PBKDF2-SHA-256';
  iterations: number;
  saltB64: string;
  ivB64: string;
  ciphertextB64: string;
}

export interface CaseBundle {
  format: typeof FORMAT;
  schemaVersion: number;
  manifest: BundleManifest;
  payload?: BundlePayload;
  encrypted?: EncryptedBlock;
}

// --- base64 helpers (browser) -----------------------------------------

function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// --- crypto ----------------------------------------------------------

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as unknown as ArrayBuffer, iterations: KDF_ITERATIONS, hash: 'SHA-256' },
    km,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptPayload(payload: BundlePayload, password: string): Promise<EncryptedBlock> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
    key,
    plaintext as unknown as ArrayBuffer,
  );
  return {
    alg: 'AES-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: KDF_ITERATIONS,
    saltB64: bytesToB64(salt),
    ivB64: bytesToB64(iv),
    ciphertextB64: bytesToB64(new Uint8Array(ct)),
  };
}

export class BadPasswordError extends Error {
  constructor() {
    super('Wrong password, or the backup file is corrupt.');
    this.name = 'BadPasswordError';
  }
}

async function decryptPayload(block: EncryptedBlock, password: string): Promise<BundlePayload> {
  const salt = b64ToBytes(block.saltB64);
  const iv = b64ToBytes(block.ivB64);
  const key = await deriveKey(password, salt);
  try {
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
      key,
      b64ToBytes(block.ciphertextB64) as unknown as ArrayBuffer,
    );
    return JSON.parse(new TextDecoder().decode(pt)) as BundlePayload;
  } catch {
    throw new BadPasswordError();
  }
}

// --- export --------------------------------------------------------

export async function buildCaseBundle(
  caseId: string,
  opts: { password?: string } = {},
): Promise<{ bundle: CaseBundle; filename: string; blob: Blob }> {
  const full = await getFullCase(caseId);
  if (!full) throw new Error(`Case ${caseId} not found in the vault.`);

  const blobs: BundlePayload['blobs'] = [];
  for (const b of full.blobs) {
    const bytes = new Uint8Array(await b.blob.arrayBuffer());
    blobs.push({
      id: b.id,
      sourceId: b.sourceId,
      filename: b.filename,
      mimeType: b.mimeType,
      sha256: b.sha256,
      dataB64: bytesToB64(bytes),
    });
  }

  const payload: BundlePayload = {
    case: stripLocalFields(full.case),
    sources: full.sources,
    items: full.items,
    extras: full.extras,
    audit: full.audit,
    blobs,
  };

  const manifest: BundleManifest = {
    caseId: full.case.id,
    caseTitle: full.case.title,
    exportedAt: new Date().toISOString(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    sourceCount: full.sources.length,
    evidenceItemCount: full.items.length,
    auditEntryCount: full.audit.length,
    sourceHashes: full.sources.map((s) => ({
      sourceId: s.id,
      filename: s.originalFilename,
      sha256: s.sha256,
    })),
    encrypted: !!opts.password,
  };

  const bundle: CaseBundle = {
    format: FORMAT,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    manifest,
    ...(opts.password
      ? { encrypted: await encryptPayload(payload, opts.password) }
      : { payload }),
  };

  await appendAudit('PUBLICATION_EXPORT_GENERATED', 'Case backup bundle generated', {
    caseId,
    detail: { encrypted: !!opts.password, sources: manifest.sourceCount, items: manifest.evidenceItemCount },
  });

  const json = JSON.stringify(bundle, null, opts.password ? 0 : 2);
  const safeTitle = full.case.id.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 60);
  return {
    bundle,
    filename: `${safeTitle}.postalmind-case`,
    blob: new Blob([json], { type: 'application/json' }),
  };
}

function stripLocalFields(rec: VaultCaseRecord): Case {
  const { schemaVersion: _s, savedAt: _sa, ...rest } = rec;
  return rest as Case;
}

// --- import -------------------------------------------------------

export interface ImportPreview {
  manifest: BundleManifest;
  encrypted: boolean;
  /** true if a case with this id already exists in the vault. */
  collision: boolean;
  bundle: CaseBundle;
}

export async function inspectBundleFile(file: File | string): Promise<ImportPreview> {
  const text = typeof file === 'string' ? file : await file.text();
  let bundle: CaseBundle;
  try {
    bundle = JSON.parse(text) as CaseBundle;
  } catch {
    throw new Error('Not a valid PostalMind case file (invalid JSON).');
  }
  if (bundle.format !== FORMAT) throw new Error('Not a PostalMind case file (wrong format tag).');
  if (typeof bundle.schemaVersion !== 'number') throw new Error('Case file is missing a schema version.');
  if (bundle.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `This backup was made by a newer version of PostalMind (schema v${bundle.schemaVersion}). Update before importing.`,
    );
  }
  const existing = await getCaseRecord(bundle.manifest.caseId);
  return {
    manifest: bundle.manifest,
    encrypted: !!bundle.encrypted,
    collision: !!existing,
    bundle,
  };
}

export interface ImportResult {
  caseId: string;
  renamedFrom?: string;
  hashChecks: Array<{ sourceId: string; filename: string; expected: string; actual: string; ok: boolean }>;
  importedSources: number;
  importedItems: number;
}

/**
 * Apply an inspected bundle to the vault.
 * `mode: 'copy'` (default) imports under a fresh case id, never overwriting.
 * `mode: 'overwrite'` requires the caller to have confirmed the collision.
 */
export async function applyBundle(
  preview: ImportPreview,
  opts: { password?: string; mode?: 'copy' | 'overwrite' } = {},
): Promise<ImportResult> {
  const { bundle } = preview;
  const payload: BundlePayload = bundle.payload
    ? bundle.payload
    : await decryptPayload(bundle.encrypted!, opts.password ?? '');

  const mode = opts.mode ?? (preview.collision ? 'copy' : 'overwrite');
  const originalId = payload.case.id;
  const targetId =
    mode === 'copy' && preview.collision
      ? `${originalId}-import-${Date.now().toString(36)}`
      : originalId;

  // Verify blob hashes.
  const hashChecks: ImportResult['hashChecks'] = [];
  for (const b of payload.blobs) {
    const actual = await sha256Hex(b64ToBytes(b.dataB64));
    hashChecks.push({
      sourceId: b.sourceId,
      filename: b.filename,
      expected: b.sha256,
      actual,
      ok: actual === b.sha256,
    });
  }
  // Also check source metadata hashes against manifest.
  for (const mh of bundle.manifest.sourceHashes) {
    const src = payload.sources.find((s) => s.id === mh.sourceId);
    if (src && src.sha256 !== mh.sha256) {
      hashChecks.push({
        sourceId: mh.sourceId,
        filename: mh.filename,
        expected: mh.sha256,
        actual: src.sha256,
        ok: false,
      });
    }
  }

  const remap = (v: string) => (v === originalId ? targetId : v);

  const now = new Date().toISOString();
  await saveCase({
    ...payload.case,
    id: targetId,
    updatedAt: now,
    ...(mode === 'copy' && preview.collision
      ? { title: `${payload.case.title} (imported ${now.slice(0, 10)})` }
      : {}),
  });
  await saveExtras({ ...payload.extras, caseId: targetId });

  for (const s of payload.sources) await putSource({ ...s, caseId: remap(s.caseId) });
  await putItems(payload.items.map((it) => ({ ...it, caseId: remap(it.caseId) })));
  for (const b of payload.blobs) {
    const record: StoredBlob = {
      id: b.id,
      caseId: targetId,
      sourceId: b.sourceId,
      filename: b.filename,
      mimeType: b.mimeType,
      sha256: b.sha256,
      blob: new Blob([b64ToBytes(b.dataB64)], { type: b.mimeType }),
      storedAt: now,
    };
    await putBlob(record);
  }
  for (const a of payload.audit) await putAuditEntry({ ...a, caseId: a.caseId ? targetId : null });
  await appendAudit('CASE_CREATED', `Case imported from backup (${originalId} → ${targetId})`, {
    caseId: targetId,
    detail: {
      encrypted: preview.encrypted,
      hashMismatches: hashChecks.filter((h) => !h.ok).length,
    },
  });

  return {
    caseId: targetId,
    renamedFrom: targetId !== originalId ? originalId : undefined,
    hashChecks,
    importedSources: payload.sources.length,
    importedItems: payload.items.length,
  };
}
