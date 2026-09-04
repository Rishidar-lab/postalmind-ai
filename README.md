# PostalMind AI

**Ground reality. Verified.**
Tools for GDS. Evidence for accountability.

PostalMind AI is an independent, bilingual (Tamil / English) public-interest technology
project providing **evidence-grounded knowledge**, **workplace-evidence analysis** and
**practical tools** around the working reality of Gramin Dak Sevaks.

Built by a serving Gramin Dak Sevak from direct operational experience.

> **Independent project. Not affiliated with or endorsed by India Post or the Department
> of Posts.**

---

## Why it exists

1. GDS employees struggle to find and understand rules, circulars, duties, service
   conditions, targets, leave and TRCA instructions.
2. General AI chatbots hallucinate rule numbers, circular numbers, rates and
   administrative claims.
3. Workplace pressure — target pressure, public comparison, after-hours instructions,
   threat-like language — often arrives through WhatsApp or verbally, and individual
   screenshots are hard to assess objectively.
4. GDS employees need a **privacy-safe** way to preserve, organise, analyse and present
   evidence **without** turning it into propaganda or unsupported accusation.

So PostalMind is **evidence-first**. It is built to be able to tell you:
*"This evidence does not prove your claim."*

## What it does

| Area | What you get |
|---|---|
| **Ask** (`/ask`) | Source-grounded answers on GDS rules, TRCA, leave, RTI, postal financial services. Every answer labelled **VERIFIED / INFERENCE / UNVERIFIED / UNKNOWN**, with citations. Declines rather than guesses. |
| **Evidence** (`/evidence`) | Import a WhatsApp export → parse locally → classify each message into 18 evidence categories → rate evidence strength → build a PRE/EVENT/POST timeline → detect PII → preview redaction → run a 12-point publication safety check. Nothing is sent to an AI provider. |
| **Know your status** (`/status`) | Short, source-linked takes on GDS status, engagement rules, TRCA and leave. |
| **Ground Reality** (`/ground-reality`) | An evidence-led editorial series — every claim carrying its source, basis and qualification. |
| **Tools** (`/tools`) | Deterministic RTI application drafter; incident timeline generator. |
| **Sources** (`/sources`) | The document library PostalMind cites, with status and links. |

### The current real-world case: `PM-GDS-MELA-2026-09-10`

The evidence workflow is built around a real need — a business/Mela target-pressure
situation. The repository ships a **fully synthetic** version of it (`PM-GDS-MELA-2026-09-10`)
with no real names, numbers or offices, so the whole pipeline is demonstrable without
exposing anyone. Real evidence is never committed.

## Evidence methodology (short version)

- **Answers** are retrieval-first. A language model, if configured, only ever sees the
  retrieved source passages — never its own memory of "the rules". If nothing
  authoritative is retrieved, the answer is `UNKNOWN`.
- **Classification** is deterministic and rule-based (not an LLM) so it is explainable,
  reproducible and conservative. A target instruction is a *target instruction*, not
  "harassment". Every classification carries a mandatory **"what this does not establish"**.
- **Evidence strength** is `INSUFFICIENT / WEAK / MODERATE / STRONG` with written factors.
  There is **no numeric "harassment score"**. A single item is never `STRONG` without an
  independent document.
- **Publication** requires passing 12 checks (PII removal, context retention, source
  citation, counter-evidence, no unsupported legal conclusions, defamation guard…). Any
  BLOCK stops the export. There is no rage-bait tone mode.

Full detail: [`/methodology`](https://postalmind-ai.vercel.app/methodology) ·
[`docs/EVIDENCE-MODEL.md`](docs/EVIDENCE-MODEL.md) ·
[`docs/PUBLISHING-STANDARD.md`](docs/PUBLISHING-STANDARD.md)

## Architecture

```
Browser
  ├─ /ask         → POST /api/ask   → retrieve(corpus) → [model constrained to passages] → classified answer
  ├─ /evidence/*  → POST /api/evidence/parse            → parse + classify + PII + timeline  (LOCAL, not persisted, no AI)
  │                  POST /api/evidence/publication-check → 12-point safety check             (LOCAL)
  │                  GET  /api/evidence/cases[/:id]      → in-memory case store (demo-seeded)
  └─ /api/health  → app / ai / db / storage status (no secrets)

Next.js 14 (App Router) · TypeScript strict · Tailwind · Vitest
AI provider: Google Gemini (configurable model) — optional; app runs in demo mode without it
Persistence: in-memory demo store now; Postgres/Prisma is the documented production path
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Privacy

- WhatsApp parsing, classification, PII detection, redaction, hashing and the publication
  check all run **locally in your request**. Evidence text is **not** sent to any AI
  provider.
- Nothing becomes public automatically — a PUBLIC export is an explicit action gated by
  the safety check.
- The repository contains **only synthetic/demo data**.

See [`PRIVACY.md`](PRIVACY.md) and [`/privacy`](https://postalmind-ai.vercel.app/privacy).

## Local setup

```bash
git clone https://github.com/Rishidar-lab/postalmind-ai.git
cd postalmind-ai
npm install
cp .env.local.example .env.local   # optional — app runs in demo mode without a key
npm run dev                         # http://localhost:3000
```

### Verify

```bash
npm run lint        # eslint (next/core-web-vitals)
npm run typecheck   # tsc --noEmit
npm run test        # vitest — 80+ unit tests
npm run build       # next build
npm run verify      # all of the above
```

### Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GEMINI_API_KEY` | No | — | Enables model-composed answers. Without it, the app runs in demo mode (extractive answers only). |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model id — change without a code deploy. |
| `GEMINI_BASE_URL` | No | Google endpoint | Override the API base URL. |
| `APP_ENV` | No | inferred | `development` / `preview` / `production`. |
| `DATABASE_URL` | No | — | Postgres connection string (future durable store). |
| `MAX_UPLOAD_SIZE` | No | `5242880` | Max bytes for an evidence upload. |
| `HASH_SALT` | No | dev salt | Salt for hashing client identifiers in logs. |
| `NEXT_PUBLIC_SITE_URL` | No | vercel URL | Canonical site URL for metadata. |

No secret is ever exposed to the client bundle.

## Deployment

Target: **Vercel** (Next.js App Router with API routes). GitHub Pages cannot host this
app — the API routes need a server runtime.

1. Import the repo in Vercel.
2. Set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) as environment variables.
3. Deploy. Check `/api/health` and `/api/health?probe=ai`.

> **Note (Sept 2026):** the previously linked live URLs still served the pre-Next.js Vite
> prototype. This build has not yet been deployed to production — see
> [`docs/RECON.md`](docs/RECON.md) §1.

## Project history

PostalMind AI began as a submission to the Novita × Kilo Code Hackathon (July 2026). It is
being rebuilt as a durable public-interest tool. The hackathon origin is recorded for
transparency and confers no endorsement.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`SECURITY.md`](SECURITY.md). The most valuable
contribution is **verified source passages** — see [`docs/SOURCE-POLICY.md`](docs/SOURCE-POLICY.md).

## Licence

MIT © 2026 PostalMind AI contributors. Evidence classifications on this site are evidence
categories, not legal findings. Nothing here is legal advice.
