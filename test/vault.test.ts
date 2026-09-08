import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { analyzeWhatsAppText } from '@/lib/evidence/analyze';
import { DB_NAME } from '@/lib/storage/schema';
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
10/09/2026, 19:50 - Supervising Official: You did well at the counter today, take rest, no problem.
`;

describe('IndexedDB case vault (durable local persistence)', () => {
  beforeEach(freshVault);

  it('persists a case + WhatsApp source across a simulated reload', async () => {
    const { createCase, addWhatsAppSource, getFullCase, verifyBlob } = await import('@/lib/storage/vault');
    const rec = await createCase({
      id: 'vault-reload-1',
      title: 'Reload test',
      description: 'synthetic',
      status: 'ACTIVE',
      confidentialityLevel: 'STANDARD',
      eventDate: '2026-09-10',
      tags: [],
      isDemo: false,
    });
    expect(rec.id).toBe('vault-reload-1');

    const analysis = await analyzeWhatsAppText(SAMPLE, { eventDate: '2026-09-10' });
    expect(analysis.local).toBe(true);
    const src = await addWhatsAppSource(rec.id, {
      rawText: SAMPLE,
      filename: 'chat.txt',
      analysis,
    });
    expect(src.sha256).toBe(analysis.source.sha256);

    // Simulate refresh/reload: drop the cached connection, reopen.
    _resetVaultConnection();
    const full = await getFullCase(rec.id);
    expect(full).not.toBeNull();
    expect(full!.sources).toHaveLength(1);
    expect(full!.items.length).toBeGreaterThan(0);
    expect(full!.blobs).toHaveLength(1);
    expect(full!.audit.length).toBeGreaterThan(0);

    const check = await verifyBlob(src.id);
    expect(check?.ok).toBe(true);
  });

  it('stores notes, manual events and redaction maps without loss', async () => {
    const vault = await import('@/lib/storage/vault');
    await vault.createCase({
      id: 'vault-extras-1',
      title: 'Extras',
      description: 'synthetic',
      status: 'DRAFT',
      confidentialityLevel: 'SENSITIVE',
      eventDate: null,
      tags: [],
      isDemo: false,
    });
    await vault.saveNotes('vault-extras-1', 'Analyst note: follow up after Mela.');
    await vault.addManualEvent('vault-extras-1', { at: '2026-09-10T10:00:00', title: 'Mela day' });
    await vault.saveRedactionMap('vault-extras-1', 'src-1', { '[PERSON-1]': 'ALIAS' });

    _resetVaultConnection();
    const full = await vault.getFullCase('vault-extras-1');
    expect(full!.extras.analystNotes).toContain('follow up');
    expect(full!.extras.manualEvents).toHaveLength(1);
    expect(full!.extras.redactionMaps['src-1']).toEqual({ '[PERSON-1]': 'ALIAS' });
  });

  it('reports vault status without throwing when storage estimate is unavailable', async () => {
    const { vaultStatus, createCase } = await import('@/lib/storage/vault');
    await createCase({
      id: 'vault-status-1',
      title: 'Status',
      description: 'synthetic',
      status: 'DRAFT',
      confidentialityLevel: 'STANDARD',
      eventDate: null,
      tags: [],
      isDemo: false,
    });
    const st = await vaultStatus();
    expect(st.available).toBe(true);
    expect(st.caseCount).toBeGreaterThanOrEqual(1);
  });
});
