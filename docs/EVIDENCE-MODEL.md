# Evidence model

Types: `lib/evidence/types.ts`. Nothing here makes a legal finding.

## Records

### Case
`id · title · description · status · confidentialityLevel · eventDate · tags · isDemo ·
sourceCount · evidenceItemCount · createdAt · updatedAt`

`status`: `DRAFT | ACTIVE | UNDER_REVIEW | ARCHIVED`.
`confidentialityLevel`: `STANDARD | SENSITIVE | HIGH`.

### EvidenceSource
`id · caseId · type · originalFilename · mimeType · sha256 · byteLength · uploadedAt ·
originalStoredPath · derivedStoredPath · redactedStoredPath · isOriginalImmutable · metadata`

`type`: `WHATSAPP_TEXT | SCREENSHOT | IMAGE | PDF | TEXT | NOTE`.
The **original is immutable** — every derived artefact is a new object.

### EvidenceItem
`id · caseId · sourceId · timestamp · speakerLabel · speakerRole · rawExcerpt ·
normalizedExcerpt · category[] · confidence · evidenceStrength · contextBefore ·
contextAfter · corroboration[] · counterEvidence[] · analystNotes ·
publicationSuitability · redactionStatus · createdAt · analysis`

`speakerRole`: `SUPERVISORY | PEER | SUBJECT_EMPLOYEE | CUSTOMER | SYSTEM | UNKNOWN`.
`redactionStatus`: `ORIGINAL | DERIVED | REDACTED | PUBLIC`.
`publicationSuitability`: `NOT_ASSESSED | INTERNAL_ONLY | NEEDS_REDACTION |
PUBLISHABLE_WITH_REDACTION | PUBLISHABLE`.

### EvidenceAnalysis (embedded in each item)
`categories[] · confidence · strength · reasons[] · supports[] · doesNotEstablish[] ·
signals[]`

`doesNotEstablish` is **always populated**.

### AuditLogEntry
`id · caseId · action · at · summary · detail?`

`action`: `SOURCE_IMPORTED | HASH_CALCULATED | ANALYSIS_CREATED | MANUAL_CORRECTION |
REDACTION_MADE | PUBLICATION_EXPORT_GENERATED | CASE_CREATED | CASE_UPDATED`.
Summaries and detail are PII-scrubbed (`lib/evidence/audit.ts`) — the log records that
something happened, never the evidence content.

## The 18 evidence categories

| Category | Neutral by default? |
|---|---|
| `ADMINISTRATIVE_INSTRUCTION` | yes |
| `TARGET_INSTRUCTION` | yes |
| `PERFORMANCE_EXPECTATION` | yes |
| `REPEATED_TARGET_PRESSURE` | no |
| `PEER_COMPARISON` | no |
| `PUBLIC_NAMING` | no |
| `PUBLIC_SHAMING` | no |
| `AFTER_HOURS_COMMUNICATION` | yes (a time fact) |
| `INSPECTION_REFERENCE` | yes |
| `LEAVE_RELATED_PRESSURE` | no |
| `THREAT_LIKE_LANGUAGE` | no |
| `EXPLICIT_THREAT` | no |
| `RETALIATION_REFERENCE` | no |
| `ABUSIVE_LANGUAGE` | no |
| `WORKLOAD_REFERENCE` | yes |
| `FINANCIAL_PRESSURE` | no |
| `NEUTRAL` | yes |
| `COUNTER_EVIDENCE` | yes |
| `INSUFFICIENT_CONTEXT` | yes |

**Explicitly not equated:**
target instruction ≠ harassment · peer comparison ≠ misconduct ·
after-hours message ≠ misconduct · inspection reference ≠ threat.

## Classification (`lib/evidence/classify.ts`)

Deterministic, rule-based, bilingual (English / Tamil / Tanglish). For each excerpt:

1. Normalise (lowercase, strip zero-width, collapse whitespace).
2. Match keyword/regex tables → weighted category scores.
3. Add after-hours from the timestamp (`< workStart`, `>= workEnd`, or Sunday).
4. Add repeated-pressure from a same-speaker window of prior target messages.
5. Nudge pressure categories up if the speaker is `SUPERVISORY`.
6. Damp pressure categories if `COUNTER_EVIDENCE` is also present.
7. Rank; keep top 3 + `COUNTER_EVIDENCE`; derive confidence from the top score.
8. Emit `reasons`, `supports`, and `doesNotEstablish` (per-category caveat + generic).

Same input → same output. Injected instructions in the text are ignored — only real
signals classify.

## Evidence strength (`lib/evidence/strength.ts`)

`INSUFFICIENT | WEAK | MODERATE | STRONG`. **No numeric score is exposed.** Factors:
directness, classification confidence, repetition, corroboration by other items,
independent documents, speaker role, time consistency, counter-evidence.

Two hard caps:
- **Single-source cap** — never `STRONG` without ≥ 1 independent documentary source.
- **Ordinary-communication cap** — if every substantive category is neutral-by-default,
  capped at `WEAK`.

Each rating ships with the list of factors that raised or lowered it and a one-line
explanation ending: *"Strength describes how well this item is supported as evidence —
not whether any rule was broken."*
