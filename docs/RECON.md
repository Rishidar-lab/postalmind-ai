# PostalMind AI — Phase 0 Recon

**Date:** 2026-09-04
**Repo:** `Rishidar-lab/postalmind-ai` @ `main` (`210fdf5`)
**Reviewer:** takeover engineer (evidence-platform rebuild)

This document is the pre-change baseline. Nothing in the application was modified
before it was written. Commands were run against a fresh `npm install`.

---

## 0. TL;DR

- The repo currently contains a **small Next.js 14 App Router app**: one landing
  page + one streaming Gemini chat API route. It builds cleanly.
- **Neither live URL serves this code.** Both `postalmind-ai.vercel.app` and
  `rishidar-lab.github.io/postalmind-ai` still serve the *original Vite SPA*
  (pre-`3dab8b0`), which calls `https://api.anthropic.com/v1/messages` directly
  from the browser **with no key** and has never worked in production.
- The current chat route targets **`gemini-1.5-flash`**, which is retired on the
  `generativelanguage` API. A fresh `GEMINI_API_KEY` would get a 404 from the
  provider on first request.
- There is **no test suite, no typecheck script, no lint config, no CI, no
  database, no source/citation layer, no evidence tooling** — none of the
  platform described in the takeover brief exists yet.
- The homepage carries several **unsupported marketing claims** ("200+ AI
  Models", "1.5L+ GDS Officers" as a product stat, "instant, cited answers")
  and **exposes a real workplace identifier** (Branch Office Facility ID
  `BO29[REDACTED — removed from the app in the redesign]`) plus the builder's PIN-level location.

---

## 1. Current architecture

```
Browser (React client component `components/chat.tsx`)
  │  POST /api/chat  { messages: [{role, content}] }
  ▼
Next.js App Router route  `app/api/chat/route.ts`  (Node/Edge serverless)
  │  - getClientIp() from x-forwarded-for
  │  - rateLimit(ip)  (in-memory Map, 20 req / 60 s)
  │  - validate body.messages is a non-empty array
  │  - clamp each message content to 4000 chars
  │  - build Gemini payload (systemInstruction + contents)
  │  - fetch generativelanguage.googleapis.com …:streamGenerateContent?alt=sse
  ▼
Google Gemini  (model hardcoded: gemini-1.5-flash)
  │  SSE stream
  ▼
route returns the upstream ReadableStream body verbatim to the browser
  │
client parses `data: {…}` lines, extracts candidates[0].content.parts[].text
```

### Stack (as built, not as README claims)

| Layer | Reality |
|---|---|
| Framework | Next.js `14.2.28`, App Router, React `18.3.1` |
| Language | TypeScript `5.7.3`, `strict: true` |
| Styling | Tailwind `3.4.17` + `app/globals.css` (custom glass/orb CSS) |
| Icons | `lucide-react` |
| AI provider | Google Gemini via raw `fetch` (no SDK) |
| Rate limiting | in-process `Map` in `lib/rate-limit.ts` |
| Persistence | none |
| Auth | none |
| Tests | none |
| Package manager | npm (`package-lock.json` committed) |

### File inventory (18 files)

```
app/api/chat/route.ts     Gemini streaming proxy
app/globals.css           glass/orb/animation CSS
app/layout.tsx            metadata (points at vercel.app + missing og-image.png)
app/page.tsx              single marketing landing page + <Chat/>
components/chat.tsx        client chat component, manual SSE parsing
lib/rate-limit.ts          in-memory token bucket
lib/utils.ts               cn() (clsx + tailwind-merge) — unused
next.config.js             images.unoptimized
public/og-image.html       OG card mockup (never rendered to PNG)
+ config: tsconfig, tailwind.config.ts, postcss.config.mjs, next-env.d.ts,
  .env.local.example, .gitignore, package.json, README.md
```

### Git history (11 commits)

```
1d63248  Launch — Vite SPA (src/App.jsx, 375 lines, direct Anthropic call)
907a38a  ci: GitHub Pages workflow
a5f2cd2  docs: README skeleton
3dab8b0  feat: rewrite to Next.js fullstack + Gemini  ← removes Vite, adds /api/chat
b38acc5  fix: remove static export to enable API routes
ae3a2a0  fix: downlevelIteration
3bce073  fix: add vercel.json for API routes
c78f9eb  fix: remove vercel.json  (+ commits package-lock.json, 6341 lines)
d2b432a  fix: forEach instead of for…of
741337d  chore: force rebuild
210fdf5  fix: gemini-2.5-flash → gemini-1.5-flash ("2.5 no longer available")
```

The last four commits are deploy-flailing against Vercel. The GitHub Pages
workflow was deleted in `3dab8b0` but **Pages is still enabled** (`build_type:
workflow`, source `main /`) and still serving the July 4 Vite artifact.

---

## 2. Working functionality

- `npm install` — OK.
- `npm run build` (`next build`) — **OK**, compiles, 5 static pages + 1 dynamic
  route, no type errors.
- `npx tsc --noEmit` — **OK**, exit 0.
- Landing page renders (dark hero, feature grid, about, footer).
- Chat client: message list, quick-prompt chips, streaming render, abort on new
  send, clear-chat, error surface. The manual SSE parsing is reasonable.
- Chat API: rate limiting works; body validation rejects non-array / empty;
  content is length-clamped; API key never reaches the client; 25 s upstream
  timeout via `AbortController`; upstream errors are logged server-side and
  return a generic 503.

**If** a valid key and a supported model were supplied, the chat path would
function.

## 3. Broken functionality

| # | Issue | Evidence |
|---|---|---|
| 3.1 | **Live sites serve stale code.** `curl https://postalmind-ai.vercel.app` and the GH Pages URL both return the Vite `index.html` (`<div id="root">`, `/postalmind-ai/assets/index-*.js`, `type="module"`). `/api/health` and `/api/chat` → Vercel `NOT_FOUND`. The Next.js app has never been the deployed artifact. | HTTP responses 2026-09-04 |
| 3.2 | **Retired model.** `gemini-1.5-flash` is not on the current `generativelanguage` model list (shut-down tier). First real request → provider 404 → app shows generic "temporarily unavailable". | provider docs |
| 3.3 | Original Vite SPA (still live) calls `api.anthropic.com` from the browser with **no `x-api-key` and no `anthropic-version`** → 401 + CORS failure. The live "demo" cannot ever have produced a response. | `git show 3dab8b0^:src/App.jsx` |
| 3.4 | `app/layout.tsx` references `https://postalmind-ai.vercel.app/og-image.png` — **that file does not exist** (only `public/og-image.html`). OG/Twitter cards are broken. | file tree |
| 3.5 | No `metadataBase` set → Next logs a build warning and social image URLs may resolve wrong on preview deploys. | `next build` |
| 3.6 | `lint` script is `next lint` but **no ESLint config exists** → running it drops into an interactive setup prompt (fails in CI / non-TTY). | `npx next lint` |
| 3.7 | `next.config.js` has `images.unoptimized` (a leftover from the static-export attempt) but no other prod config (headers, redirects). | file |

## 4. Missing functionality (vs. takeover brief)

Essentially everything the brief specifies:

- No retrieval / source-grounding. The system prompt just *asks* Gemini to
  "always provide accurate, cited information" — pure hope. No source library,
  no `/sources`, no citations, no VERIFIED/INFERENCE/UNVERIFIED/UNKNOWN labels.
- No evidence subsystem: no cases, no WhatsApp import, no screenshot/OCR intake,
  no SHA-256 integrity, no audit log, no ORIGINAL/DERIVED/REDACTED/PUBLIC
  lifecycle.
- No classification engine, no evidence-strength model, no timeline builder,
  no pattern dashboard, no Mela case template.
- No privacy tooling: no PII detection, no redaction preview, no publication
  safety check, no "what data leaves the app" documentation.
- No Ground Reality editorial section, no known-case research module, no
  content generator, no RTI / grievance drafting tools.
- No database, no migrations, no persistence of any kind.
- No `/methodology`, `/privacy`, `/disclaimer` pages.
- No `/api/health`.
- No tests (`npm test` is not defined), no typecheck script, no CI.
- No `CONTRIBUTING.md`, `SECURITY.md`, `PRIVACY.md`, `DISCLAIMER.md`,
  `METHODOLOGY.md`, or any `docs/*`.

## 5. Security issues

| # | Severity | Issue |
|---|---|---|
| 5.1 | High (historical) | Live Vite SPA is architected to put a model API key in client JS (the Anthropic call). It currently has *no* key so nothing leaks, but the pattern is unsafe and the file is still deployed. |
| 5.2 | Medium | `app/api/chat/route.ts` puts `?key=${apiKey}` in the **request URL**. Gemini supports this, but keys in URLs are more prone to landing in proxy/access logs than an `x-goog-api-key` header. Prefer the header. |
| 5.3 | Medium | No cap on **number of messages** or total payload size — only per-message 4000-char clamp. A client can POST 100k messages (array length unbounded) → large upstream payload, memory pressure, cost. `req.json()` itself is unbounded. |
| 5.4 | Medium | Rate limit keys on `x-forwarded-for` first hop with no allow-list of trusted proxies → trivially spoofed by sending your own `X-Forwarded-For`. On Vercel the platform header would normally be authoritative; the code trusts arbitrary client input. |
| 5.5 | Medium | **Prompt injection is unmitigated.** User content is concatenated straight into `contents`. Once evidence text (WhatsApp exports, OCR) is fed to a model, hostile strings in that data can steer the model. No separation of "instructions" vs "data to analyse". |
| 5.6 | Low | Upstream Gemini error object is `console.error`'d in full — may contain request echoes / key fragments in some error shapes. Should log a redacted summary. |
| 5.7 | Low | No security headers (`Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`). `globals.css` pulls fonts from Google — needs to be in any future CSP. |
| 5.8 | Low | No `robots`/rate protection on the API; no request-id / structured logging for abuse investigation. |
| 5.9 | Informational | In-memory rate limiter resets on every cold start and is per-instance → near-useless on serverless. Not a vuln, but it is not the control the README claims ("20 requests/minute per IP"). |

## 6. Privacy risks

| # | Issue |
|---|---|
| 6.1 | **Real workplace identifier committed to a public repo and rendered on the homepage:** `app/page.tsx` — "Sevveri Branch Office (BO Facility ID: BO29[REDACTED]), Vriddhachalam Sub-Division" + "PIN [REDACTED]". The brief explicitly says not to expose exact Branch Office Facility IDs. This is in git history too. |
| 6.2 | Builder is named in full with employer, university, and security-researcher handle. That is the builder's choice, but it should be a deliberate `/about`, not hero copy, and the BO ID must go. |
| 6.3 | No framework exists for the sensitive data the platform is *designed* to ingest (WhatsApp threads with phone numbers, customer account numbers, colleague names). Nothing stops a future contributor committing a real export. `.gitignore` has no `/.data`, `/evidence`, `/uploads`, `*.txt` guard. |
| 6.4 | Chat messages are sent to Google with no notice to the user about what leaves the device. No `/privacy`. |
| 6.5 | `console.error` of full chat/error context on the server → provider/platform logs contain user questions (which may themselves be sensitive: "my salary is delayed, my supervisor said…"). |

## 7. Hallucination risks

| # | Issue |
|---|---|
| 7.1 | **Design is hallucination-first.** The prompt says "Always provide accurate, cited information. When citing rules, mention the specific rule number and document name" and "include current interest rates (approximate if exact is unavailable)". This actively instructs the model to *produce* rule numbers, memo numbers and rates from parametric memory — the exact failure mode the brief wants eliminated. |
| 7.2 | No retrieval, so every "citation" the model emits is unverifiable and frequently wrong (GDS CE Rule numbering, TRCA slab figures, POSB interest rates, circular numbers). |
| 7.3 | No answer-confidence taxonomy. The user cannot tell a grounded statement from a guess. |
| 7.4 | `temperature: 0.7` for a factual/legal assistant — needlessly raises fabrication rate. |
| 7.5 | No "I don't know / no source found" path. The model is never given permission to decline. |

## 8. Source / citation weaknesses

- There are **no sources**. No corpus, no index, no store, no metadata model,
  no retrieval, no display. "Cited answers" is a claim with nothing behind it.
- No provenance for anything the app says.
- No distinction between primary (a circular PDF) and secondary (a news report)
  material.
- No "last verified" concept.

## 9. Deployment issues

| # | Issue |
|---|---|
| 9.1 | **Two conflicting deploy targets.** GitHub Pages (static-only; cannot run `/api/chat`) is *enabled* and serving old code. Vercel is referenced in README but the linked project serves old code too and no `.vercel` link exists in the repo. There is no single source of truth for "where does this run". |
| 9.2 | No CI. Nothing runs `build` / `lint` / `test` on push. The four "fix: …" deploy commits show this was debugged by pushing to prod. |
| 9.3 | `vercel.json` was added then removed; deployment config is now implicit. |
| 9.4 | No `NEXT_PUBLIC_*` / runtime env documentation beyond `GEMINI_API_KEY`. |
| 9.5 | `README` "Live Demo" link is wrong/misleading (points at a build that doesn't include the current app and doesn't work). |
| 9.6 | Node version not pinned (`.nvmrc` / `engines` absent). |

## 10. API-provider issues

| # | Issue |
|---|---|
| 10.1 | Hardcoded, retired model `gemini-1.5-flash` (no `GEMINI_MODEL` env). |
| 10.2 | Uses undocumented reliance on `:streamGenerateContent?alt=sse` chunk shape; any change to the SSE envelope silently yields empty replies (the client's `catch {}` swallows parse errors). |
| 10.3 | No handling of provider `429` / quota vs `503` — everything collapses to one generic message. No `Retry-After` propagation. |
| 10.4 | No retry with backoff for idempotent transient failures. |
| 10.5 | No health/liveness probe for the provider. |
| 10.6 | Single-provider, no abstraction — swapping or adding a fallback provider means rewriting the route. |
| 10.7 | Key passed as query param (see 5.2). |

## 11. UI / UX weaknesses

| # | Issue |
|---|---|
| 11.1 | **Hackathon-grade visual identity**: four blurred gradient orbs, glassmorphism on every surface, shimmer-animated headline, blinking cursor, `#030308` near-black. The brief explicitly rejects all of these. |
| 11.2 | **Fake / unsupported stat tiles**: "200+ AI Models", "1.5L+ GDS Officers", "24/7". None are true of this product. |
| 11.3 | Single page. No route for anything. No nav that goes anywhere (anchor links only). |
| 11.4 | No disclaimer of independence anywhere. Copy leans on "India Post GDS" branding in a way that could read as official. |
| 11.5 | Chat has no message formatting (markdown rendered as raw `whitespace-pre-wrap`), no copy button, no source panel, no regenerate. |
| 11.6 | No empty/error/offline states beyond a red bubble. No accessibility pass (contrast on `text-white/40` over near-black fails WCAG AA; icon-only buttons lack robust labels; animated background ignores… actually `prefers-reduced-motion` is partially handled for `.shim` only). |
| 11.7 | Not mobile-first in structure (fixed 750px orbs, large clamp headings) though it mostly reflows. |
| 11.8 | Tamil is claimed but there is no font stack for Tamil glyphs (`Inter` only) → Tamil renders in browser fallback, inconsistent. |
| 11.9 | OG image is an HTML file that was never converted to PNG. |

---

## 12. Baseline command results (2026-09-04)

| Command | Result |
|---|---|
| `npm install` | OK (0 vulnerabilities reported at install) |
| `npm run lint` (`next lint`) | **FAILS in non-TTY** — no eslint config, interactive prompt |
| `npm run typecheck` | **not defined** |
| `npx tsc --noEmit` | OK, exit 0 |
| `npm test` | **not defined** |
| `npm run build` | OK — `/` static, `/api/chat` dynamic, no errors |
| `curl https://postalmind-ai.vercel.app/` | 200, **stale Vite SPA** |
| `curl …/api/health` | 404 NOT_FOUND |
| `curl …/api/chat` (GET) | 404 NOT_FOUND |
| `curl https://rishidar-lab.github.io/postalmind-ai/` | 200, **stale Vite SPA** (July 4 artifact) |

---

## 13. Recommended order of work

1. **Phase 1 fixes to the API** (model config, health, hardening) — small, unblocks everything.
2. **Vertical slice**: source-grounded ask + evidence case + WhatsApp import + timeline + classification + redaction + publication check, with real unit tests.
3. Redesign the shell (institutional, remove orbs/fake stats/BO ID, add disclaimer + real nav).
4. Docs (`RECON` ✓, `ARCHITECTURE`, `EVIDENCE-MODEL`, `THREAT-MODEL`, `REDACTION`, `SOURCE-POLICY`, `PUBLISHING-STANDARD`, `PRIVACY`, `METHODOLOGY`).
5. Decide and document a single deploy target; add CI that runs lint+typecheck+test+build.
6. Expand remaining routes (pattern dashboard, ground reality, known-case module, content generator).

### Known blockers requiring the maintainer

- **No `GEMINI_API_KEY`** available in this environment → live AI cannot be
  tested here. Demo mode will be built so the app is fully exercisable offline;
  live path will be code-reviewed and health-checked but not run.
- **No database credentials / Vercel access** → persistence ships as an
  in-memory demo store (explicitly non-durable) plus a documented Postgres
  target. Real deploy + env config is a maintainer action.
- The stale live deployments need the maintainer to either repoint Vercel at
  this branch after merge or hand over deploy access.
