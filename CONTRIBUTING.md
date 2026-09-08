# Contributing to PostalMind AI

Thank you for wanting to help. This project serves people with little institutional power,
so the bar for correctness and restraint is high.

## Ground rules

1. **Never commit real evidence.** No real names, phone numbers, account numbers, branch
   identifiers, or actual WhatsApp exports. Use synthetic data. `.gitignore` blocks the
   common paths; do not work around it.
2. **Do not weaken the "does not establish" behaviour.** Every classification must keep a
   statement of what it does not prove. The system must be able to tell a user their
   evidence is insufficient.
3. **No fabricated data.** No invented statistics, rule numbers, rates or case facts. If
   you cannot cite it, mark it `UNVERIFIED` or leave it out.
4. **No rage-bait.** Tone options are NEUTRAL, INVESTIGATIVE, PUBLIC-INTEREST, FORMAL
   REPRESENTATION. The platform makes its case through evidence.

## What helps most

- **Verified source passages.** Take an `UNVERIFIED` passage, check it line-by-line
  against the primary document, record the document's SHA-256 and page, and promote it to
  `VERIFIED`. See `docs/SOURCE-POLICY.md`.
- **Parser robustness.** Real WhatsApp exports in Tamil / Tanglish with edge-case
  formatting — add them (redacted, synthetic) as parser test fixtures.
- **Classifier signals.** New Tamil/Tanglish phrasings for existing categories, with a
  test.
- **Accessibility and mobile.**

## Development

```bash
npm install
npm run dev
npm run verify   # lint + typecheck + test + build — must pass before a PR
```

- TypeScript `strict`. No `any` without a comment explaining why.
- Pure logic goes in `lib/**` with a matching `test/*.test.ts`. Keep API routes thin.
- Match the surrounding code's style; no new dependencies without discussion.

## Pull requests

- One change per PR. Describe what you changed and how you tested it.
- If you touch classification, strength, or publication logic, include before/after on the
  demo case and add tests.
- Commits: conventional-ish prefixes (`feat:`, `fix:`, `docs:`, `test:`).
