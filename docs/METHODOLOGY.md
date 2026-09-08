# Methodology

## PostalMind evidence verification

### Core principle

**VERIFIED means genuinely verified against a primary document.** It is never
a synonym for "downloaded successfully" or "looks right."

### The verification chain

```
PRIMARY PDF
  → SHA-256 hash of original bytes
  → page-preserving text extraction
  → page-aware passage generation (all start UNVERIFIED)
  → human verification gate (maintainer approves each passage)
  → VERIFIED passage
  → retrieval (VERIFIED only, independently-verifiable source class)
  → VERIFIED answer (with exact document/page citation)
```

Anything less remains UNVERIFIED.

### Source classes

Only these classes can independently establish an official rule:
- `PRIMARY_OFFICIAL` — government circulars, rules, orders, notifications
- `PRIMARY_JUDICIAL` — court/tribunal judgments
- `PARLIAMENTARY_OFFICIAL` — parliamentary replies, statutory records

All other classes (SECONDARY_REPUTABLE, NEWS_REPORT, UNION_OR_ASSOCIATION,
UNVERIFIED_WEB, DEMO) can never independently produce a VERIFIED answer,
even if their status is mistakenly set to VERIFIED.

### Verification invariants

A VERIFIED source record must have:
1. `status: 'VERIFIED'`
2. `sha256` — recorded mirror hash
3. `localPath` — local mirror of the primary document
4. `verifiedAt` — ISO timestamp of verification
5. `verificationMethod` — e.g. "manual-primary-document-check"
6. Source class in `INDEPENDENTLY_VERIFIABLE_CLASSES`

### Never fabricate

- Document numbers are null when unknown — never guessed
- Page counts are null when unknown — never estimated
- Dates are null when unknown — never invented
- Authority names are recorded exactly as printed — never paraphrased

### Change detection

When the same canonical URL returns different bytes:
1. New SHA-256 computed
2. New `SourceVersion` created
3. Old version retained
4. New version starts as UNVERIFIED
5. Verification invalidated until re-reviewed

### Security

- Uploaded PDFs are maintainer content, not public-user uploads
- Magic-byte validation (not extension-based)
- Size limits enforced (50 MB hard cap)
- HTML/script content stripped from extracted text
- Prompt-injection patterns detected and logged
- Document text is treated as DATA, never instructions