import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { analyzeWhatsAppText } from '@/lib/evidence/analyze';
import { DB_NAME, CURRENT_SCHEMA_VERSION } from '@/lib/storage/schema';
import { _resetVaultConnection } from '@/lib/storage/db';

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

const SAMPLE = `03/09/2026, 09:05 - Supervising Official: Mela is on 10/09/2026 at the block office.
04/09/2026, 21:15 - Supervising Official: Complete 3 more proposals by tomorrow without fail.
`;

async function seedCase(caseId: string) {
  const vault = await import('@/lib/storage/vault');
  await vault.createCase({
    id: caseId,
    title: `Backup case ${caseId}`,
    description: 'synthetic backup fixture',
    status: 'ACTIVE',
    confidentialityLevel: 'STANDARD',
    eventDate: '2026-09-10',
    tags: [],
    isDemo: false,
  });
  const analysis = await analyzeWhatsAppText(SAMPLE, { eventDate: '2026-09-10' });
  await vault.addWhatsAppSource(caseId, { rawText: SAMPLE, filename: 'chat.txt', analysis });
}

describe('portable case backup (.postalmind-case)', () => {
  beforeEach(freshVault);

  it('plain export/import round-trips with verified hashes', async () => {
    const { buildCaseBundle, inspectBundleFile, applyBundle } = await import('@/lib/storage/backup');
    const { deleteCase, getFullCase } = await import('@/lib/storage/vault');
    await seedCase('backup-plain-1');

    const { bundle, filename, blob } = await buildCaseBundle('backup-plain-1');
    expect(filename).toMatch(/\.postalmind-case$/);
    expect(bundle.format).toBe('postalmind-case');
    expect(bundle.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(bundle.manifest.caseId).toBe('backup-plain-1');
    expect(bundle.manifest.exportedAt).toBeTruthy();
    expect(bundle.manifest.sourceHashes).toHaveLength(1);
    expect(bundle.payload).toBeDefined();
    expect(blob.size).toBeGreaterThan(0);

    // Remove the original, re-import from the file text.
    await deleteCase('backup-plain-1');
    expect(await getFullCase('backup-plain-1')).toBeNull();

    const preview = await inspectBundleFile(await blob.text());
    expect(preview.encrypted).toBe(false);
    expect(preview.collision).toBe(false);
    const result = await applyBundle(preview, { mode: 'overwrite' });
    expect(result.caseId).toBe('backup-plain-1');
    expect(result.hashChecks.length).toBeGreaterThan(0);
    expect(result.hashChecks.every((h) => h.ok)).toBe(true);

    const restored = await getFullCase('backup-plain-1');
    expect(restored!.sources).toHaveLength(1);
    expect(restored!.items.length).toBeGreaterThan(0);
  });

  it('encrypted export/import works with the correct password', async () => {
    const { buildCaseBundle, inspectBundleFile, applyBundle } = await import('@/lib/storage/backup');
    const { deleteCase, getFullCase } = await import('@/lib/storage/vault');
    await seedCase('backup-enc-1');

    const { bundle, blob } = await buildCaseBundle('backup-enc-1', { password: 'correct-horse-123' });
    expect(bundle.manifest.encrypted).toBe(true);
    expect(bundle.encrypted?.alg).toBe('AES-GCM');
    expect(bundle.encrypted?.kdf).toBe('PBKDF2-SHA-256');
    expect(bundle.payload).toBeUndefined();

    await deleteCase('backup-enc-1');
    const preview = await inspectBundleFile(await blob.text());
    expect(preview.encrypted).toBe(true);
    const result = await applyBundle(preview, { password: 'correct-horse-123', mode: 'overwrite' });
    expect(result.hashChecks.every((h) => h.ok)).toBe(true);
    expect((await getFullCase('backup-enc-1'))!.sources).toHaveLength(1);
  });

  it('wrong password fails without leaking plaintext', async () => {
    const { buildCaseBundle, inspectBundleFile, applyBundle, BadPasswordError } = await import(
      '@/lib/storage/backup'
    );
    await seedCase('backup-wrongpw-1');
    const { blob } = await buildCaseBundle('backup-wrongpw-1', { password: 'right-password' });
    const preview = await inspectBundleFile(await blob.text());
    await expect(applyBundle(preview, { password: 'wrong-password', mode: 'copy' })).rejects.toBeInstanceOf(
      BadPasswordError,
    );
  });

  it('tampered ciphertext fails authentication', async () => {
    const { buildCaseBundle, inspectBundleFile, applyBundle, BadPasswordError } = await import(
      '@/lib/storage/backup'
    );
    await seedCase('backup-tamper-1');
    const { blob } = await buildCaseBundle('backup-tamper-1', { password: 's3cret' });
    const raw = JSON.parse(await blob.text()) as { encrypted: { ciphertextB64: string } };
    // Flip characters at the tail of the ciphertext (still valid base64).
    const ct = raw.encrypted.ciphertextB64;
    raw.encrypted.ciphertextB64 = ct.slice(0, -4) + (ct.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    const preview = await inspectBundleFile(JSON.stringify(raw));
    await expect(applyBundle(preview, { password: 's3cret', mode: 'copy' })).rejects.toBeInstanceOf(
      BadPasswordError,
    );
  });

  it('hash mismatch is reported, not hidden', async () => {
    const { buildCaseBundle, inspectBundleFile, applyBundle } = await import('@/lib/storage/backup');
    const { deleteCase } = await import('@/lib/storage/vault');
    await seedCase('backup-hash-1');
    const { bundle } = await buildCaseBundle('backup-hash-1');
    // Corrupt one blob's bytes without updating its recorded sha256.
    const b64 = bundle.payload!.blobs[0].dataB64;
    bundle.payload!.blobs[0].dataB64 = (b64[0] === 'A' ? 'B' : 'A') + b64.slice(1);
    await deleteCase('backup-hash-1');
    const preview = await inspectBundleFile(JSON.stringify(bundle));
    const result = await applyBundle(preview, { mode: 'overwrite' });
    expect(result.hashChecks.some((h) => !h.ok)).toBe(true);
  });

  it('unsupported (future) schema is refused', async () => {
    const { buildCaseBundle, inspectBundleFile } = await import('@/lib/storage/backup');
    await seedCase('backup-schema-1');
    const { blob } = await buildCaseBundle('backup-schema-1');
    const raw = JSON.parse(await blob.text()) as { schemaVersion: number };
    raw.schemaVersion = CURRENT_SCHEMA_VERSION + 99;
    await expect(inspectBundleFile(JSON.stringify(raw))).rejects.toThrow(/newer version/i);
  });

  it('duplicate import never overwrites: defaults to a renamed copy', async () => {
    const { buildCaseBundle, inspectBundleFile, applyBundle } = await import('@/lib/storage/backup');
    await seedCase('backup-dup-1');
    const { blob } = await buildCaseBundle('backup-dup-1');
    const preview = await inspectBundleFile(await blob.text());
    expect(preview.collision).toBe(true);
    const result = await applyBundle(preview); // default mode with collision -> copy
    expect(result.renamedFrom).toBe('backup-dup-1');
    expect(result.caseId).not.toBe('backup-dup-1');
  });
});
