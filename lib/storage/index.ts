export * from './vault';
export {
  buildCaseBundle,
  inspectBundleFile,
  applyBundle,
  BadPasswordError,
  type CaseBundle,
  type BundleManifest,
  type ImportPreview,
  type ImportResult,
} from './backup';
export { vaultAvailable, storageEstimate, VaultQuotaError, VaultUnavailableError } from './db';
export type { FullCase, VaultCaseRecord, CaseExtras, StoredBlob } from './schema';
