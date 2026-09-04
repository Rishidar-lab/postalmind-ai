# Architecture

## Stack

- **Next.js 14** (App Router), **React 18**, **TypeScript** (`strict`).
- **Tailwind** with a tokenised palette (`app/globals.css`), light/dark via
  `prefers-color-scheme` + `[data-theme]`.
- **Vitest** for unit tests (`test/**`), Node environment.
- **AI provider**: Google Gemini via REST (no SDK). Optional — the app runs without it.
- **Persistence**: in-memory demo store today; Postgres/Prisma is the documented path.

## Directory map

```
app/
  layout.tsx, page.tsx, not-found.tsx, globals.css
  ask/                     source-grounded assistant (client island)
  evidence/                dashboard, import, cases, cases/[id], timeline, patterns
  status/, status/health/  GDS status explorer + live health readout
  ground-reality/          editorial index
  tools/, tools/rti/, …    deterministic tools
  sources/, methodology/, privacy/, disclaimer/
  api/
    health/                GET — app/ai/db/storage status (no secrets)
    ask/                   POST — structured AskResult
    chat/                  POST — SSE stream of the grounded answer + meta
    sources/               GET  — source library
    evidence/parse/        POST — stateless parse + classify + PII + timeline (NO AI, NO persistence)
    evidence/publication-check/  POST — 12-point safety check
    evidence/cases/        GET/POST — case list / create
    evidence/cases/[id]/   GET — case + items + timeline + audit

lib/
  config.ts                env parsing, demo-mode detection
  http.ts                  bounded body reading, hashed client id, error helpers
  rate-limit.ts            in-process fixed-window limiter
  ai/                      Provider interface, gemini.ts, demo.ts, index.ts
  ask/answer.ts            retrieve → constrain → classify → cite
  sources/                 types.ts, registry.ts (lexical retrieval)
  evidence/                types, whatsapp, hash, pii, redaction, classify,
                           strength, timeline, publication, audit, ingest
  store/                   CaseStore interface, memory.ts, seed.ts, index.ts
  tools/rti.ts             deterministic RTI draft generator
  demo/                    synthetic Mela WhatsApp export

content/
  sources.ts               SourceRecord[] (metadata → official docs)
  corpus.ts                CorpusPassage[] (retrieval text; UNVERIFIED/DEMO)

components/                 site chrome + client islands + shared views
docs/                       this folder
test/                       vitest suites
```

## Request flows

### `/ask` → `/api/ask`

```
question
  → retrieve(question)              lib/sources/registry.ts — lexical, transparent
  → 0 passages?  → UNKNOWN (no model call)
  → getProvider()
       demo:   extractive answer from passages
       gemini: generate() with system prompt = rules + passages only
  → findUncitedClaims(answer)       flag factual sentences with no [S#]
  → classify: VERIFIED | INFERENCE | UNVERIFIED | UNKNOWN
  → AskResult { classification, answer, citations, retrieval, notice, warnings }
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
