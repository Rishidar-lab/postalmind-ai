# Architecture

## Stack

- **Next.js 14** (App Router), **React 18**, **TypeScript** (`strict`).
- **Tailwind** with a tokenised palette (`app/globals.css`), light/dark via
  `prefers-color-scheme` + `[data-theme]`.
- **Vitest** for unit tests (`test/**`), Node environment.
- **AI provider**: OpenRouter (OpenAI-compatible chat-completions REST API, no SDK), free-tier
  models by default. Optional — the app runs in source-only mode without it. A writing layer
  only: it composes from retrieved passages, it never decides what is true.
- **Persistence**: in-memory demo store today; Postgres/Prisma is the documented path.

## Directory map

```
app/
  layout.tsx, page.tsx, not-found.tsx, globals.css, manifest.ts (PWA manifest)
  icon-192/, icon-512/, icon-maskable/  route handlers generating real PNGs via next/og (no binary asset)
  offline/                 offline-shell fallback page
  dashboard/               real counts only — no vanity stats
  ask/                     source-grounded assistant (client island)
  evidence/                dashboard, import, cases, cases/[id], timeline, patterns (+ observed patterns)
  changes/                 Rule Change Tracker — deterministic old/new text diff + verified-changes log
  corrections/             corrections ledger (severity: typo/clarification/factual/source-upgrade/retraction)
  status/, status/health/  GDS status explorer + live health readout
  ground-reality/          claim-card-based evidence series (individually linkable)
  tools/, tools/rti/, tools/workday/, …  deterministic + local-only tools
  sources/, methodology/, privacy/, disclaimer/
  api/
    health/                GET — app/ai/db/storage status (no secrets)
    ask/                   POST — structured AskResult (citation-grade: rationale + limits)
    chat/                  POST — SSE stream of the grounded answer + meta
    sources/               GET  — source library
    evidence/parse/        POST — stateless parse + classify + PII + timeline (NO AI, NO persistence)
    evidence/publication-check/  POST — 12-point safety check
    evidence/cases/        GET/POST — case list / create
    evidence/cases/[id]/   GET — case + items + timeline + audit

lib/
  config.ts                env parsing, demo-mode detection, OpenRouter primary/fallback model
  http.ts                  bounded body reading, hashed client id, error helpers
  rate-limit.ts            in-process fixed-window limiter
  ai/                      Provider interface, openrouter.ts (+ model-override for the quality-gate
                           fallback), demo.ts, index.ts (getProvider/getFallbackProvider)
  ask/answer.ts            retrieve → constrain → quality-gate → classify → cite → rationale/limits
  sources/                 types.ts (SourceRecord + sourceClass + canIndependentlyVerify),
                           trust.ts (suggestSourceClass, verificationViolations),
                           registry.ts (lexical retrieval; allVerified enforces sourceClass),
                           diff.ts (deterministic word-level LCS diff for /changes)
  evidence/                types, whatsapp, hash, pii, redaction, classify,
                           strength, timeline, publication, audit, ingest,
                           patterns.ts (Target Pressure Analyzer 2.0 — deterministic
                           cross-day pattern detection, never a legal conclusion)
  store/                   CaseStore interface, memory.ts, seed.ts, index.ts
  storage/                 IndexedDB vault (schema.ts/db.ts — v2 adds the `workday` store),
                           case-store, evidence-store, audit-store, backup
  tools/rti.ts             deterministic RTI draft generator
  tools/workday.ts         GDS Workday Log — local IndexedDB diary + weekly/monthly chronology
  demo/                    synthetic Mela WhatsApp export

content/
  sources.ts               SourceRecord[] (metadata → official docs; sourceClass assigned per record)
  corpus.ts                CorpusPassage[] (retrieval text; UNVERIFIED/DEMO)
  changes.ts               RuleChange[] — starts empty, same honest pattern as corrections.ts
  corrections.ts           Correction[] — severity-typed, starts empty
  linkedin/                Ground Reality LinkedIn content pack (manual publish only)

components/                 site chrome + client islands + shared views (claim-card.tsx,
                            rule-diff-client.tsx, workday-client.tsx, sw-register.tsx, …)
docs/                       this folder
test/                       vitest suites
public/sw.js                app-shell service worker (never caches /api/*)
```

## Request flows

### `/ask` → `/api/ask`

```
question
  → retrieve(question)              lib/sources/registry.ts — lexical, transparent
  → 0 passages?  → UNKNOWN (no model call)
  → getProvider()
       demo:       extractive answer from passages
       openrouter: generate() with system prompt = rules + passages only
       → quality gate: isLowQualityCompletion()? → retry once on getFallbackProvider(),
         else degrade to source-only. Never lets model availability decide VERIFIED status.
  → findUncitedClaims(answer) + findFabricatedRefs(answer)   flag/void unsupported [S#] refs
  → classify: VERIFIED | INFERENCE | UNVERIFIED | UNKNOWN
      VERIFIED requires EVERY cited passage: status VERIFIED AND source.sourceClass
      independently-verifiable (PRIMARY_OFFICIAL/PRIMARY_JUDICIAL/PARLIAMENTARY_OFFICIAL).
      A UNION_OR_ASSOCIATION/NEWS_REPORT/SECONDARY_REPUTABLE/DEMO source can never
      independently produce VERIFIED, even if its status is mistakenly set to VERIFIED.
  → AskResult { classification, answer, citations, retrieval, notice, warnings,
                rationale ("why this answer"), limits ("what this does not establish") }
```

### `/evidence/import` → `/api/evidence/parse`

```
.txt text  (multipart or JSON; never persisted; never sent to a model)
  → sha256Hex(text)                 integrity
  → parseWhatsAppExport(text)       Android/iOS, 12h/24h, multiline, media, deleted, system
  → applyAliases(...)               real names → role labels
  → ingestWhatsApp(...)             per message: classify + assessStrength + context + corroboration
  → buildTimeline(items, eventDate) PRE / EVENT / POST + clusters
  → detectPII(text)                 document-wide
  → JSON { source, parse, analysis, timeline, pii, notes }
```

Client then does redaction preview (pure function) and feeds a draft to
`/api/evidence/publication-check`.

## Persistence: current vs. target

**Current** — `MemoryCaseStore` (`lib/store/memory.ts`), `durable: false`. Seeded with
`PM-GDS-MELA-2026-09-10` from synthetic data on first access. Cases created at runtime
live for the process lifetime only. The UI shows a "demo persistence" warning.

**Target** — a `PrismaCaseStore` implementing the same `CaseStore` interface, selected in
`lib/store/index.ts` when `DATABASE_URL` is set. Suggested schema:

```prisma
model Case            { id String @id  title String  description String  status String
                        confidentialityLevel String  eventDate DateTime?  tags String[]
                        isDemo Boolean  createdAt DateTime @default(now())  updatedAt DateTime @updatedAt
                        sources EvidenceSource[]  items EvidenceItem[] }
model EvidenceSource   { id String @id  caseId String  type String  originalFilename String
                        mimeType String  sha256 String  byteLength Int  uploadedAt DateTime
                        originalStoredPath String?  isOriginalImmutable Boolean  metadata Json
                        case Case @relation(fields: [caseId], references: [id]) }
model EvidenceItem     { id String @id  caseId String  sourceId String  timestamp DateTime?
                        speakerLabel String?  speakerRole String  rawExcerpt String
                        normalizedExcerpt String  category String[]  confidence String
                        evidenceStrength String  contextBefore String?  contextAfter String?
                        corroboration String[]  counterEvidence String[]  analystNotes String?
                        publicationSuitability String  redactionStatus String  analysis Json
                        createdAt DateTime @default(now()) }
model AuditLogEntry    { id String @id  caseId String?  action String  at DateTime
                        summary String  detail Json? }
```

Originals themselves belong in object storage (S3-compatible / Vercel Blob), not the DB —
the DB holds the hash and the storage key.

## Deployment

Vercel (App Router + Node runtime for API routes). GitHub Pages cannot host this — the
API routes need a server. `next.config.js` sets CSP and security headers. Health:
`/api/health`, `/api/health?probe=ai`.
