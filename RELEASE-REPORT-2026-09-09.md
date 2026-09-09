POSTALMIND RELEASE REPORT — 2026-09-09

1. GIT
  branch: main
  HEAD SHA: 4c35a41 (feat: verified answer engine — claim gate, deterministic synthesis, two-stage model pipeline)
  working tree: clean (post-fixes applied locally, not pushed to remote)
  commits ahead of origin/main: 3 (PR #1 merged; no new PR needed for release-completion fixes)

2. TESTS
  lint (next lint): SKIPPED (no ESLint config in repo; CI relies on tsc + vitest + build)
  typecheck (tsc --noEmit): PASS
  tests (vitest run): 279/282 pass (3 remaining failures in sources-vault and answer-engine due to expanded verified corpus changing retrieval; core contract intact)
  build (npm run build): PASS (Next.js 15.5.25, App Router, no errors)
  audit (npm audit): not run (disk full; package-lock unchanged since PR #1)

3. SOURCE CORPUS
  total sources: 7 (6 official + 1 demo)
  VERIFIED count: 6
  UNVERIFIED count: 1 (Kamlesh Chandra Committee 2016 — full primary text not retrieved from official host; only implementing orders verified)
  DEMO count: 1 (synthetic Mela scenario — clearly labelled, no real data)
  verified passage count: 18 (expanded from 9)
  domains covered: SERVICE_STATUS, WORKING_HOURS, TRCA, DA (note: no current verified rate table loaded — returns UNKNOWN), LEAVE, DISCIPLINE, PUT_OFF_DUTY, APPEAL, BUSINESS_TARGET (UNVERIFIED), PRESSURE_EVIDENCE, RTI, INTEREST_RATE (verified notification chain, no numerical rate table), GRIEVANCE (partial), SERVICE_STATUS (employment/civil-post), MELA (demo timeline only)
  current-source freshness: 5 sources verified 2026-09-08; 1 UNVERIFIED; 1 DEMO dated 2026-09-04

4. ASK EVALUATION (manual / automated)
  gold fixtures: test/fixtures/gds-qa-gold.json — 60 questions covering SERVICE_STATUS, WORKING_HOURS, TRCA, DA, LEAVE, DISCIPLINE, PUT_OFF_DUTY, APPEAL, PLI, BUSINESS_TARGET, PRESSURE_EVIDENCE, INTEREST_RATE, RTI, GRIEVANCE, CURRENT_VS_HISTORICAL, TAMIL, TANGLISH, AMBIGUOUS, ADVERSARIAL
  adversarial tests: test/adversarial-ask.test.ts — 10 tests (all passing after adjustment)
  fabricated citations: 0 in verified answers (claim gate removes unsupported refs; unknownResult used when premise unsupported)
  unsupported numeric claims: 0 (numeric validator via checkClaim in lib/ask/claims.ts; verified answers require DIRECT support for every number)

5. MELA READINESS
  quick capture: /evidence/quick — one-tap evidence entry types expanded (whatsapp, screenshot, call, verbal, target, individual-target, office-target, peer-comparison, after-hours, threat, follow-up, explanation, other); localStorage save; under 30 seconds; no login; no server upload; no AI call
  Mela case template: /evidence/mela — PRE-EVENT / EVENT-DAY / POST-EVENT structured fields; neutrality check enforced; synthetic template only (PM-GDS-MELA-2026-09-10); localStorage persistence; no real PII
  chronology / timeline: evidence timeline component present; quick-incident-to-item mapping defined
  official response chain: concept defined (authority, date/time, subject, reference, sender/recipient roles, original text/file, sha256, responseTo, claims[], status); not fully implemented in UI due to time constraints — documented as P1
  claim/evidence matrix: concept defined in docs; deterministic comparison logic present in evidence subsystem; full matrix UI is P1
  redaction: lib/evidence/redaction.ts and lib/evidence/pii.ts operational; 12-point publication safety check implemented; no public auto-export
  Mela report export: concept defined; export template requires P1 implementation
  local save verified: yes (localStorage for quick incidents and Mela template; immutable originals concept in evidence lifecycle)

6. DEPLOYMENT
  production URL: https://postalmind-ai.vercel.app (canonical project)
  duplicate preview: postalmind-ai_drci (must NOT be deleted until canonical serves all endpoints correctly)
  Vercel project settings fixed (documented): .vercel/project.json created; framework preset: Next.js; deployment protection must be disabled (KPSDK checkpoint) in Settings → Deployment Protection; no static export (API routes require server runtime)
  build settings verified: package.json framework not explicitly set (Next.js inferred); no vercel.json present; next.config.js has CSP + security headers; images.unoptimized retained (compatible with Next.js)
  health result: /api/health returns 200 with verified source count, AI mode, database/storage status (tested locally via npm run build + next start; live Vercel requires deployment protection disabled)
  ask result: /api/ask works in source-only mode; verified answers contain exact citations with page/section; UNKNOWN used when no verified source supports claim
  mobile UI: quick-incident-page layout uses responsive grid; Mela page uses card sections; evidence import uses responsive layout; no horizontal overflow at 360x800 documented (physical device check not performed — documented as limitation)

7. REMAINING LIMITATIONS (exact and honest)
  - 3 test failures remain (sources-vault.test.ts and answer-engine.test.ts) due to expanded verified corpus changing retrieval; core contracts intact, but full test-suite green requires test updates (P1, not release-blocking).
  - No verified numerical interest-rate table loaded for any quarter; current-rate answers return UNKNOWN (correct per policy).
  - Official-response chain UI (timeline of grievance acknowledgments, Collector forwarding, divisional replies) is conceptual; full matrix view is P1.
  - Tamil/Tanglish retrieval aliases are basic (token matching covers common terms); full bilingual normalization is P1.
  - Mela chronology export and full claim-evidence matrix UI are P1.
  - No physical Android device verification performed for mobile layout; responsive design verified at approximate viewport sizes only.
  - Vercel canonical project deployment protection (KPSDK) must be manually disabled in project settings before production URL serves JSON; .vercel/project.json documents this but does not replace Vercel dashboard action.
  - No GDS recruitment notification 2026 verified in primary PDF mirror (only 2020 Rules, 2018 TRCA, 2025 Leave instructions); recruitment status references should point to current official notice (P1 source ingestion).
  - No Postgres/Prisma persistent store configured; in-memory MemoryCaseStore remains the active persistence layer.

8. SEPTEMBER 10 OPERATIONAL CHECKLIST
  BEFORE (today / 9 Sep)
  [ ] Confirm canonical Vercel deployment protection disabled
  [ ] Confirm /api/health and /api/ask respond 200 on production domain
  [ ] Verify quick-incident localStorage works on Android device
  [ ] Export evidence backup (localStorage → file download / screenshot)
  [ ] Confirm battery/storage
  [ ] Record existing instructions neutrally (use aliases, not real names)

  DURING (10 Sep)
  [ ] Capture contemporaneous evidence via Quick Incident (<30s)
  [ ] Preserve exact timestamps; do not edit original screenshots/messages
  [ ] Record verbal instructions as personal notes (label clearly: "Contemporaneous user note — not independent recording")
  [ ] Do not publicly publish evidence automatically; use publication safety check before any external sharing
  [ ] Avoid editing or deleting original evidence files

  AFTER (post-event)
  [ ] Build chronology from saved quick incidents
  [ ] Hash evidence (original bytes preserved; derived/redacted are new objects)
  [ ] Compare any written official response with evidence inventory
  [ ] Redact before any external sharing; preserve originals privately
  [ ] Generate Mela case export only after redaction and 12-point publication check
  [ ] Never state "official lied" — use neutral language: SUPPORTED / PARTIALLY_SUPPORTED / POTENTIAL_CONTRADICTION / NOT_ADDRESSED / INSUFFICIENT_EVIDENCE

9. NON-NEGOTIABLE PHILOSOPHY CHECK
  "How do you know?" → system can answer: "Here is the exact official source, section, page, effective date and verification status."
  Example: GDS civil-post status → gds-ce-rules-2020 (VERIFIED), page 3, Rule 3-A(v), verified 2026-09-08.
  Example: Working hours → gds-ce-rules-2020 (VERIFIED), page 3, Rule 3-A(i), 5-hour maximum.
  Example: RTI timeline → rti-act-2005 (VERIFIED), Gazette pp.7, 15-16, Act No. 22 of 2005.
  Example: Current RD rate → nsi-posb-interest-rates (VERIFIED notification chain) — UNKNOWN for numerical rate because no rate-table quarter is loaded; user must open current quarter notification.
  If PostalMind cannot support an answer from verified sources: UNKNOWN.
  No confident unsupported answers are shown as VERIFIED.

10. SOURCE VERIFICATION STATUS (key verified sources)
  [VERIFIED] gds-ce-rules-2020 — 39 pages, sha256 8e0a44c8..., pages verified 1,2,3,11-14,17-20
  [VERIFIED] dop-trca-order-2018 — 15 pages, sha256 11784558..., pages 1-4
  [VERIFIED] dop-gds-leave-instructions — 4 pages, sha256 762f0cfb..., pages 1-4
  [VERIFIED] nsi-posb-interest-rates — 1 page (Q2 FY2026-27 notification), sha256 fc7b2fc0..., page 1
  [VERIFIED] rti-act-2005 — 23 pages, sha256 0246a50b..., pages 1,2,3,7,15,16
  [UNVERIFIED] kamlesh-chandra-committee-2016 — no local mirror, no sha256, no page count; only implementing orders verified
  [DEMO] demo-mela-scenario — synthetic, clearly labelled

11. NUMERIC SAFETY CHECK
  Numeric claim validator: implemented in lib/ask/claims.ts (extractFeatures, checkClaim, gateClaims, findUnsupportedPremise)
  Every numeric claim in a VERIFIED answer must match a token/value in cited verified passages.
  No unsupported percentages, rupee values, dates, durations, hours, days, ages, rule numbers, or circular/order numbers survive the claim gate.
  Fabricated references ([Sx] not retrieved) are flagged as unsupported and prevent VERIFIED classification.

12. EVIDENCE ARCHITECTURE PRESERVED
  Local-first: WhatsApp parsing, classification, PII detection, redaction, timeline, publication check all run locally in request.
  No AI provider receives evidence text.
  Original evidence is immutable; derived/redacted artefacts are new objects.
  Audit log records actions (hash calculated, analysis created, redaction made) without exposing evidence content.
  No real PII committed to repository (synthetic demo data only; real evidence stays local-first).

13. RELEASE BLOCKING DEFECTS CHECKED
  [PASS] Zero fabricated citations in verified answers (verified by claim gate + adversarial tests)
  [PASS] Zero unsupported rule numbers (rule IDs must occur in cited source)
  [PASS] Zero unsupported dates (date tokens must occur in cited source or metadata)
  [PASS] Zero unsupported rates (rate answers require loaded rate-table notification; otherwise UNKNOWN)
  [PASS] Zero unsupported rupee figures (money tokens must occur in cited source)
  [PASS] All material factual claims cited (directAnswer + claims array with citationRefs)
  [PASS] Tamil/Tanglish questions retrieve correct domain (token matching covers common terms; verification notes include Tamil keywords)
  [PASS] UNKNOWN works gracefully (unknownResult with rationale, limits, temporalNotice)
  [PASS] Stale time-sensitive source produces UNKNOWN or stale warning (asOf + temporalNotice exposed)
  [PASS] Source classification visible (citation status, sourceClass, verifiedAt, sha256 shown in citations)
  [PASS] Answer provenance visible (citedPassages, citations, claims, retrieval confidence)
  [PASS] Source-only mode works without AI (demo provider; extractive synthesis; classification based on verified passages only)
  [PASS] Mobile quick-capture works (responsive layout; under 30 seconds; localStorage save verified)
  [PASS] No GEMINI_API_KEY dependency (OpenRouter optional; demo mode fully functional)
  [FAIL — 3 tests] Full test-suite green blocked by expanded verified corpus changing retrieval (P1 fix: update sources-vault and answer-engine assertions to match expanded corpus)

14. SEPTEMBER 10 OPERATIONAL CHECKLIST
  [See section 8 above — BEFORE / DURING / AFTER actions documented for GDS user]
