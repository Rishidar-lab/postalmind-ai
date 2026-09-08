import { getConfig } from '@/lib/config';
import { MemoryCaseStore } from './memory';
import { seedDemo } from './seed';
import type { CaseStore } from './types';

let storePromise: Promise<CaseStore> | null = null;

/**
 * Returns the case store. Currently always the in-memory demo store (seeded
 * with the demo Mela case). When DATABASE_URL is set, a Postgres/Prisma store
 * implementing the same interface would be returned here instead — see
 * docs/ARCHITECTURE.md. The store exposes `.durable` so the UI can warn.
 */
export function getStore(): Promise<CaseStore> {
  if (storePromise) return storePromise;
  storePromise = (async () => {
    const { database } = getConfig();
    // Placeholder for the real driver switch.
    void database;
    const store = new MemoryCaseStore();
    await seedDemo(store);
    return store;
  })();
  return storePromise;
}

export function resetStoreCache(): void {
  storePromise = null;
}

export type { CaseStore } from './types';
