/**
 * In-memory case store.
 *
 * This is the DEMO / local driver. It is NOT durable: on a serverless platform
 * it resets on every cold start and is not shared between instances. The app
 * says so plainly wherever it matters. A Postgres/Prisma driver implementing
 * the same CaseStore interface is the production path (see docs/ARCHITECTURE.md).
 */

import type {
  AuditLogEntry,
  Case,
  EvidenceItem,
  EvidenceSource,
} from '@/lib/evidence/types';
import type { CaseStore } from './types';

export class MemoryCaseStore implements CaseStore {
  readonly durable = false;

  private cases = new Map<string, Case>();
  private sources = new Map<string, EvidenceSource>();
  private items = new Map<string, EvidenceItem>();
  private audit: AuditLogEntry[] = [];

  async listCases(): Promise<Case[]> {
    return [...this.cases.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getCase(id: string): Promise<Case | null> {
    return this.cases.get(id) ?? null;
  }

  async createCase(
    input: Omit<Case, 'createdAt' | 'updatedAt' | 'sourceCount' | 'evidenceItemCount'>,
  ): Promise<Case> {
    const now = new Date().toISOString();
    const c: Case = { ...input, createdAt: now, updatedAt: now, sourceCount: 0, evidenceItemCount: 0 };
    this.cases.set(c.id, c);
    return c;
  }

  async updateCase(id: string, patch: Partial<Case>): Promise<Case | null> {
    const c = this.cases.get(id);
    if (!c) return null;
    const next = { ...c, ...patch, id: c.id, updatedAt: new Date().toISOString() };
    this.cases.set(id, next);
    return next;
  }

  async listSources(caseId: string): Promise<EvidenceSource[]> {
    return [...this.sources.values()].filter((s) => s.caseId === caseId);
  }

  async addSource(source: EvidenceSource): Promise<EvidenceSource> {
    this.sources.set(source.id, source);
    await this.recount(source.caseId);
    return source;
  }

  async listItems(caseId: string): Promise<EvidenceItem[]> {
    return [...this.items.values()]
      .filter((i) => i.caseId === caseId)
      .sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? ''));
  }

  async getItem(id: string): Promise<EvidenceItem | null> {
    return this.items.get(id) ?? null;
  }

  async addItems(items: EvidenceItem[]): Promise<EvidenceItem[]> {
    for (const it of items) this.items.set(it.id, it);
    if (items[0]) await this.recount(items[0].caseId);
    return items;
  }

  async updateItem(id: string, patch: Partial<EvidenceItem>): Promise<EvidenceItem | null> {
    const it = this.items.get(id);
    if (!it) return null;
    const next = { ...it, ...patch, id: it.id };
    this.items.set(id, next);
    return next;
  }

  async appendAudit(entry: AuditLogEntry): Promise<AuditLogEntry> {
    this.audit.push(entry);
    return entry;
  }

  async listAudit(caseId: string | null): Promise<AuditLogEntry[]> {
    return this.audit
      .filter((e) => (caseId === null ? true : e.caseId === caseId))
      .slice()
      .reverse();
  }

  private async recount(caseId: string): Promise<void> {
    const c = this.cases.get(caseId);
    if (!c) return;
    c.sourceCount = [...this.sources.values()].filter((s) => s.caseId === caseId).length;
    c.evidenceItemCount = [...this.items.values()].filter((i) => i.caseId === caseId).length;
    c.updatedAt = new Date().toISOString();
  }
}
