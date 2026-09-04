/**
 * Low-level IndexedDB access + migrations.
 *
 * A thin promise wrapper over IDB. Higher layers (case-store, evidence-store,
 * audit-store, vault) never touch IDB directly.
 */

import { DB_NAME, DB_VERSION, STORES } from './schema';

export class VaultUnavailableError extends Error {
  constructor(msg = 'Local storage (IndexedDB) is not available in this browser context.') {
    super(msg);
    this.name = 'VaultUnavailableError';
  }
}

export class VaultQuotaError extends Error {
  constructor(msg = 'The device is out of storage space for the local vault. Export a backup and free space.') {
    super(msg);
    this.name = 'VaultQuotaError';
  }
}

export function vaultAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openVault(): Promise<IDBDatabase> {
  if (!vaultAvailable()) return Promise.reject(new VaultUnavailableError());
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = req.result;
      const tx = req.transaction!;
      migrate(db, tx, event.oldVersion, event.newVersion ?? DB_VERSION);
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error ?? new Error('Failed to open the local vault.'));
    req.onblocked = () => reject(new Error('The local vault is open in another tab; close it and retry.'));
  });

  return dbPromise;
}

/**
 * Schema migrations. Each `if (oldVersion < N)` block upgrades to version N.
 * Never drop a store that could hold user evidence without an explicit,
 * data-preserving migration.
 */
function migrate(db: IDBDatabase, _tx: IDBTransaction, oldVersion: number, _newVersion: number): void {
  if (oldVersion < 1) {
    db.createObjectStore(STORES.cases, { keyPath: 'id' });

    const sources = db.createObjectStore(STORES.sources, { keyPath: 'id' });
    sources.createIndex('caseId', 'caseId', { unique: false });

    const blobs = db.createObjectStore(STORES.blobs, { keyPath: 'id' });
    blobs.createIndex('caseId', 'caseId', { unique: false });

    const items = db.createObjectStore(STORES.items, { keyPath: 'id' });
    items.createIndex('caseId', 'caseId', { unique: false });

    db.createObjectStore(STORES.extras, { keyPath: 'caseId' });

    const audit = db.createObjectStore(STORES.audit, { keyPath: 'id' });
    audit.createIndex('caseId', 'caseId', { unique: false });

    db.createObjectStore(STORES.meta, { keyPath: 'key' });
  }
  // future: if (oldVersion < 2) { … }
}

// --- promisified operations ------------------------------------------------

type Mode = 'readonly' | 'readwrite';

function wrapRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      const err = req.error;
      if (err && (err.name === 'QuotaExceededError' || err.name === 'QuotaExceededError'.toLowerCase())) {
        reject(new VaultQuotaError());
      } else {
        reject(err ?? new Error('Vault operation failed.'));
      }
    };
  });
}

export async function tx<T>(
  stores: string[],
  mode: Mode,
  fn: (t: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  const db = await openVault();
  return new Promise<T>((resolve, reject) => {
    let result: T;
    let settled = false;
    const t = db.transaction(stores, mode);
    t.oncomplete = () => {
      if (!settled) resolve(result);
    };
    t.onerror = () => {
      settled = true;
      const err = t.error;
      reject(err?.name === 'QuotaExceededError' ? new VaultQuotaError() : (err ?? new Error('Vault transaction failed.')));
    };
    t.onabort = () => {
      settled = true;
      reject(t.error?.name === 'QuotaExceededError' ? new VaultQuotaError() : new Error('Vault transaction aborted.'));
    };
    Promise.resolve(fn(t))
      .then((r) => {
        result = r;
      })
      .catch((e) => {
        settled = true;
        try {
          t.abort();
        } catch {
          /* already done */
        }
        reject(e instanceof Error ? e : new Error(String(e)));
      });
  });
}

export function put<T>(store: IDBObjectStore, value: T): Promise<IDBValidKey> {
  return wrapRequest(store.put(value as unknown as Record<string, unknown>));
}
export function get<T>(store: IDBObjectStore, key: IDBValidKey): Promise<T | undefined> {
  return wrapRequest(store.get(key) as IDBRequest<T | undefined>);
}
export function getAll<T>(store: IDBObjectStore | IDBIndex, query?: IDBKeyRange | IDBValidKey): Promise<T[]> {
  return wrapRequest(store.getAll(query) as IDBRequest<T[]>);
}
export function del(store: IDBObjectStore, key: IDBValidKey): Promise<undefined> {
  return wrapRequest(store.delete(key) as IDBRequest<undefined>);
}

/** Storage usage estimate for the "export recommended" nudge. */
export async function storageEstimate(): Promise<{ usage: number; quota: number; ratio: number } | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
    const e = await navigator.storage.estimate();
    const usage = e.usage ?? 0;
    const quota = e.quota ?? 0;
    return { usage, quota, ratio: quota > 0 ? usage / quota : 0 };
  } catch {
    return null;
  }
}

/** For tests: forget the cached connection. */
export function _resetVaultConnection(): void {
  dbPromise = null;
}
