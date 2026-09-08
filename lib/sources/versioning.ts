/**
 * Source versioning and change detection.
 *
 * A source document can have multiple versions (e.g. a gazette
 * notification revised quarterly). This module:
 *
 * 1. Detects when the same canonical URL returns different bytes
 *    (new SHA-256 → new version, old version retained).
 * 2. Invalidates verification of the new version until re-reviewed.
 * 3. Enables the Rule Change Tracker to compare verified versions.
 *
 * Immutability rules:
 *  - Never overwrite an existing source record silently.
 *  - When bytes change, create a new SourceVersion and keep the old one.
 *  - A new version starts as UNVERIFIED regardless of the previous version's status.
 *  - The old version remains accessible for the Rule Change Tracker.
 */

import type { SourceRecord, SourceVersion, SourceStatus } from './types';

export interface ChangeDetectionResult {
  sourceId: string;
  previousSha256: string | null;
  newSha256: string;
  changed: boolean;
  newVersionId: string | null;
  message: string;
}

/**
 * Detect whether new bytes differ from the stored SHA-256.
 * Returns a ChangeDetectionResult describing the outcome.
 */
export function detectChange(
  source: SourceRecord,
  newSha256: string,
): ChangeDetectionResult {
  const previousSha256 = source.sha256;

  if (!previousSha256) {
    return {
      sourceId: source.id,
      previousSha256: null,
      newSha256,
      changed: true,
      newVersionId: null,
      message: 'No previous hash recorded — first ingestion.',
    };
  }

  if (previousSha256 === newSha256) {
    return {
      sourceId: source.id,
      previousSha256,
      newSha256,
      changed: false,
      newVersionId: null,
      message: 'Bytes unchanged — same document.',
    };
  }

  // Bytes changed — create a new version
  const newVersionId = `v${source.versions.length + 1}_${newSha256.slice(0, 8)}`;
  return {
    sourceId: source.id,
    previousSha256,
    newSha256,
    changed: true,
    newVersionId,
    message: `Bytes changed — old hash ${previousSha256.slice(0, 12)}… → new hash ${newSha256.slice(0, 12)}… New version ${newVersionId} requires re-verification.`,
  };
}

/**
 * Create a new SourceVersion from a source record and ingestion result.
 */
export function createVersion(
  source: SourceRecord,
  sha256: string,
  byteLength: number,
  pageCount: number | null,
  filename: string,
  mimeType: string,
): SourceVersion {
  const previousVersion = source.versions.length > 0 ? source.versions[source.versions.length - 1] : null;
  return {
    versionId: `v${source.versions.length + 1}_${sha256.slice(0, 8)}`,
    sourceId: source.id,
    sha256,
    localFilename: filename,
    mimeType,
    byteLength,
    pages: pageCount,
    retrievedAt: new Date().toISOString(),
    supersedesVersionId: previousVersion?.versionId ?? null,
    ingestedAt: new Date().toISOString(),
  };
}

/**
 * Apply a change detection result to a source record.
 * Returns the updated source with the new version appended.
 * The source status is reset to UNVERIFIED if bytes changed.
 */
export function applyVersion(
  source: SourceRecord,
  newSha256: string,
  byteLength: number,
  pageCount: number | null,
  filename: string,
  mimeType: string,
): SourceRecord {
  const version = createVersion(source, newSha256, byteLength, pageCount, filename, mimeType);
  const newVersions = [...source.versions, version];

  // If the source was VERIFIED and bytes changed, downgrade to UNVERIFIED
  let newStatus = source.status;
  if (source.status === 'VERIFIED' && source.sha256 && source.sha256 !== newSha256) {
    newStatus = 'UNVERIFIED';
  }

  return {
    ...source,
    sha256: newSha256,
    pageCount,
    localFilename: filename,
    mimeType,
    status: newStatus,
    verifiedAt: newStatus === 'UNVERIFIED' ? null : source.verifiedAt,
    verificationMethod: newStatus === 'UNVERIFIED' ? null : source.verificationMethod,
    verifiedPages: newStatus === 'UNVERIFIED' ? [] : source.verifiedPages,
    versions: newVersions,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get the latest version of a source.
 */
export function latestVersion(source: SourceRecord): SourceVersion | null {
  return source.versions.length > 0 ? source.versions[source.versions.length - 1] : null;
}

/**
 * Compare two versions of a source by their version IDs.
 * Returns the versions that differ, or null if both are the same.
 */
export function compareVersions(
  source: SourceRecord,
  versionAId: string,
  versionBId: string,
): { a: SourceVersion | null; b: SourceVersion | null; sameBytes: boolean } | null {
  const a = source.versions.find((v) => v.versionId === versionAId) ?? null;
  const b = source.versions.find((v) => v.versionId === versionBId) ?? null;
  if (!a || !b) return null;
  return { a, b, sameBytes: a.sha256 === b.sha256 };
}

/**
 * Check whether a source can be cited as VERIFIED.
 * A source must have:
 *  - status VERIFIED
 *  - a recorded sha256
 *  - verificationMethod set
 *  - verifiedAt set
 */
export function isGenuinelyVerified(source: SourceRecord): boolean {
  return (
    source.status === 'VERIFIED' &&
    source.sha256 != null &&
    source.sha256.length > 0 &&
    source.verificationMethod != null &&
    source.verificationMethod.length > 0 &&
    source.verifiedAt != null
  );
}