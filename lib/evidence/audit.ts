/**
 * Append-only audit log helpers.
 *
 * The audit log records that an action happened — not the evidence content.
 * Summaries and detail objects must never contain message text, names, phone
 * numbers, or other PII. Hashes and counts are fine.
 */

import type { AuditAction, AuditLogEntry } from './types';

let seq = 0;

export function auditId(): string {
  seq += 1;
  return `audit_${Date.now().toString(36)}_${seq.toString(36)}`;
}

export function makeAuditEntry(
  action: AuditAction,
  summary: string,
  opts: { caseId?: string | null; detail?: Record<string, unknown>; at?: string } = {},
): AuditLogEntry {
  return {
    id: auditId(),
    caseId: opts.caseId ?? null,
    action,
    at: opts.at ?? new Date().toISOString(),
    summary: redactSummary(summary),
    detail: opts.detail ? scrubDetail(opts.detail) : undefined,
  };
}

const PII_HINT = /\b\d{6,}\b|@[\w.-]+\.\w+|\+?91[\s-]?\d{5}/;

/** Defensive: strip anything that looks like PII from a summary line. */
export function redactSummary(s: string): string {
  return s.replace(PII_HINT, '[redacted]').slice(0, 240);
}

function scrubDetail(detail: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(detail)) {
    if (typeof v === 'string') {
      // Allow sha256 hex and short tokens; redact anything long & free-text.
      out[k] = /^[a-f0-9]{64}$/i.test(v) || v.length <= 64 ? v.replace(PII_HINT, '[redacted]') : '[omitted]';
    } else if (typeof v === 'number' || typeof v === 'boolean' || v === null) {
      out[k] = v;
    } else if (Array.isArray(v)) {
      out[k] = `[array(${v.length})]`;
    } else {
      out[k] = '[object]';
    }
  }
  return out;
}
