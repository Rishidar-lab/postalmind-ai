import type {
  AuditLogEntry,
  Case,
  EvidenceItem,
  EvidenceSource,
} from '@/lib/evidence/types';

export interface CaseStore {
  listCases(): Promise<Case[]>;
  getCase(id: string): Promise<Case | null>;
  createCase(input: Omit<Case, 'createdAt' | 'updatedAt' | 'sourceCount' | 'evidenceItemCount'>): Promise<Case>;
  updateCase(id: string, patch: Partial<Case>): Promise<Case | null>;

  listSources(caseId: string): Promise<EvidenceSource[]>;
  addSource(source: EvidenceSource): Promise<EvidenceSource>;

  listItems(caseId: string): Promise<EvidenceItem[]>;
  getItem(id: string): Promise<EvidenceItem | null>;
  addItems(items: EvidenceItem[]): Promise<EvidenceItem[]>;
  updateItem(id: string, patch: Partial<EvidenceItem>): Promise<EvidenceItem | null>;

  appendAudit(entry: AuditLogEntry): Promise<AuditLogEntry>;
  listAudit(caseId: string | null): Promise<AuditLogEntry[]>;

  /** True when writes are durable. In-memory demo returns false. */
  readonly durable: boolean;
}
