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

const TAMIL_SAMPLE = `03/09/2026, 09:05 - மேற்பார்வை அலுவலர்: 10/09/2026 அன்று வணிக மேளா நடக்கும்.
04/09/2026, 21:15 - மேற்பார்வை அலுவலர்: எத்தனை முறை சொல்வது? இலக்கு உடனே முடிக்கணும்.
10/09/2026, 19:50 - மேற்பார்வை அலுவலர்: இன்று நன்றாக பணியாற்றினீர்கள், ஓய்வெடுங்கள், பரவாயில்லை.
`;

describe('vault chaos (no silent loss, no destructive crashes)', () => {
  beforeEach(freshVault);

  it('edit → save → reload → reopen keeps the latest edit', async () => {
    const vault = await import('@/lib/storage/vault');
    await vault.createCase({
      id: 'chaos-edit-1', title: 'v1', description: 'd', status: 'DRAFT',
      confidentialityLevel: 'STANDARD', eventDate: null, tags: [], isDemo: false,
    });
    await vault.updateCase('chaos-edit-1', { title: 'v2 edited' });
    _resetVaultConnection();
    const full = await vault.getFullCase('chaos-edit-1');
    expect(full!.case.title).toBe('v2 edited');
  });

  it('a failed import never destroys the existing saved case', async () => {
    const vault = await import('@/lib/storage/vault');
    const { buildCaseBundle, inspectBundleFile, applyBundle, BadPasswordError } = await import('@/lib/storage/backup');
    await vault.createCase({
      id: 'chaos-safe-1', title: 'Keep me', description: 'd', status: 'ACTIVE',
      confidentialityLevel: 'STANDARD', eventDate: null, tags: [], isDemo: false,
    });
    const { blob } = await buildCaseBundle('chaos-safe-1', { password: 'pw' });
    // NB: exporting itself appends an audit entry, so snapshot AFTER the export:
    // the assertion is strictly "the failed import changes nothing".
    const before = await vault.getFullCase('chaos-safe-1');
    const preview = await inspectBundleFile(await blob.text());
    await expect(applyBundle(preview, { password: 'wrong', mode: 'copy' })).rejects.toBeInstanceOf(BadPasswordError);
    const after = await vault.getFullCase('chaos-safe-1');
    expect(after).toEqual(before);
  });

  it('corrupted manifest is refused with a clear error', async () => {
    const { inspectBundleFile } = await import('@/lib/storage/backup');
    await expect(inspectBundleFile('not json at all{{{')).rejects.toThrow(/valid.*case file|invalid JSON/i);
    await expect(
      inspectBundleFile(JSON.stringify({ format: 'other-thing', schemaVersion: 1, manifest: {} })),
    ).rejects.toThrow(/format tag/i);
    await expect(
      inspectBundleFile(JSON.stringify({ format: 'postalmind-case', manifest: {} })),
    ).rejects.toThrow(/schema version/i);
  });

  it('missing blob does not crash import; metadata still restores', async () => {
    const vault = await import('@/lib/storage/vault');
    const { buildCaseBundle, inspectBundleFile, applyBundle } = await import('@/lib/storage/backup');
    await vault.createCase({
      id: 'chaos-blob-1', title: 't', description: 'd', status: 'ACTIVE',
      confidentialityLevel: 'STANDARD', eventDate: '2026-09-10', tags: [], isDemo: false,
    });
    const analysis = await analyzeWhatsAppText('03/09/2026, 09:05 - A: Mela target is 8 proposals.\n', { eventDate: '2026-09-10' });
    await vault.addWhatsAppSource('chaos-blob-1', { rawText: 'x', filename: 'c.txt', analysis, keepRawBlob: false });
    const { bundle } = await buildCaseBundle('chaos-blob-1');
    expect(bundle.payload!.blobs).toHaveLength(0); // nothing stored, nothing exported
    await vault.deleteCase('chaos-blob-1');
    const preview = await inspectBundleFile(JSON.stringify(bundle));
    const r = await applyBundle(preview, { mode: 'overwrite' });
    expect(r.caseId).toBe('chaos-blob-1');
    const restored = await vault.getFullCase('chaos-blob-1');
    expect(restored!.sources).toHaveLength(1);
    expect(restored!.items.length).toBeGreaterThan(0);
  });

  it('empty case exports and imports intact', async () => {
    const vault = await import('@/lib/storage/vault');
    const { buildCaseBundle, inspectBundleFile, applyBundle } = await import('@/lib/storage/backup');
    await vault.createCase({
      id: 'chaos-empty-1', title: 'Empty', description: 'no evidence yet', status: 'DRAFT',
      confidentialityLevel: 'STANDARD', eventDate: null, tags: [], isDemo: false,
    });
    const { bundle, filename } = await buildCaseBundle('chaos-empty-1');
    expect(filename).toMatch(/\.postalmind-case$/);
    expect(bundle.manifest.sourceCount).toBe(0);
    await vault.deleteCase('chaos-empty-1');
    const r = await applyBundle(await inspectBundleFile(JSON.stringify(bundle)), { mode: 'overwrite' });
    expect(r.importedSources).toBe(0);
    expect((await vault.getFullCase('chaos-empty-1'))!.case.title).toBe('Empty');
  });

  it('Tamil/Unicode case round-trips byte-exact with verified hashes', async () => {
    const vault = await import('@/lib/storage/vault');
    const { buildCaseBundle, inspectBundleFile, applyBundle } = await import('@/lib/storage/backup');
    await vault.createCase({
      id: 'chaos-tamil-1', title: 'வணிக மேளா வழக்கு 🎯', description: 'தமிழ் + Tanglish + emoji — இலக்கு 8',
      status: 'ACTIVE', confidentialityLevel: 'SENSITIVE', eventDate: '2026-09-10', tags: ['தமிழ்'], isDemo: false,
    });
    const analysis = await analyzeWhatsAppText(TAMIL_SAMPLE, { eventDate: '2026-09-10' });
    await vault.addWhatsAppSource('chaos-tamil-1', { rawText: TAMIL_SAMPLE, filename: 'மேளா-அரட்டை.txt', analysis });
    // Filenames with non-ASCII must not break the bundle envelope.
    const { blob } = await buildCaseBundle('chaos-tamil-1', { password: 'தமிழ்-கடவுச்சொல்-123' });
    await vault.deleteCase('chaos-tamil-1');
    const r = await applyBundle(await inspectBundleFile(await blob.text()), {
      password: 'தமிழ்-கடவுச்சொல்-123', mode: 'overwrite',
    });
    expect(r.hashChecks.every((h) => h.ok)).toBe(true);
    const restored = await vault.getFullCase('chaos-tamil-1');
    expect(restored!.case.title).toBe('வணிக மேளா வழக்கு 🎯');
    expect(restored!.sources[0].originalFilename).toBe('மேளா-அரட்டை.txt');
  });

  it('large message body (200KB) round-trips with matching hash', async () => {
    const vault = await import('@/lib/storage/vault');
    const { buildCaseBundle, inspectBundleFile, applyBundle } = await import('@/lib/storage/backup');
    await vault.createCase({
      id: 'chaos-large-1', title: 'large', description: 'd', status: 'ACTIVE',
      confidentialityLevel: 'STANDARD', eventDate: null, tags: [], isDemo: false,
    });
    const bigLine = '04/09/2026, 21:15 - Supervising Official: ' + 'Target reminder. '.repeat(12000);
    const text = '03/09/2026, 09:05 - Supervising Official: Mela on 10/09/2026.\n' + bigLine + '\n';
    expect(new TextEncoder().encode(text).length).toBeGreaterThan(200_000);
    const analysis = await analyzeWhatsAppText(text, { eventDate: '2026-09-10' });
    await vault.addWhatsAppSource('chaos-large-1', { rawText: text, filename: 'big.txt', analysis });
    const { blob } = await buildCaseBundle('chaos-large-1');
    await vault.deleteCase('chaos-large-1');
    const r = await applyBundle(await inspectBundleFile(await blob.text()), { mode: 'overwrite' });
    expect(r.hashChecks.every((h) => h.ok)).toBe(true);
    expect((await vault.getFullCase('chaos-large-1'))!.blobs).toHaveLength(1);
  });

  it('unsupported schema version is refused', async () => {
    const { inspectBundleFile } = await import('@/lib/storage/backup');
    await expect(
      inspectBundleFile(
        JSON.stringify({ format: 'postalmind-case', schemaVersion: CURRENT_SCHEMA_VERSION + 1, manifest: { caseId: 'x' } }),
      ),
    ).rejects.toThrow(/newer version/i);
  });
});
