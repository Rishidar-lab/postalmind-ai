# Publishing standard

Code: `lib/evidence/publication.ts`. Web summary: `/methodology#publication`.

Nothing becomes public automatically. Before content can be exported as `PUBLIC`, the
twelve-point check runs. Each item returns `PASS`, `WARN` or `BLOCK`. **Any `BLOCK` stops
the export.** The check warns or blocks — it never silently allows.

## The twelve checks

| # | Check | BLOCK when | WARN when |
|---|---|---|---|
| 1 | Phone numbers removed | any phone (≥ medium conf) present | — |
| 2 | Email addresses removed | any email present | — |
| 3 | Account / identity numbers removed | account / Aadhaar / PAN / IFSC present | a bare 6+ digit run survived |
| 4 | Branch / facility identifiers removed | a BO/SO/HO/RMS facility id present | — |
| 5 | Uninvolved employee IDs removed | a possible employee id present | — |
| 6 | Uninvolved third-party names removed | — | a title/role + name cue present |
| 7 | Context retained | — | analyst marked context not retained, or text < 40 chars |
| 8 | Sources retained for factual claims | analyst marked "no source cited" | source citation not confirmed |
| 9 | Counter-evidence considered | — | not confirmed as considered |
| 10 | Legal / criminal conclusions avoided unless authoritative | asserts a legal conclusion not backed by a court/tribunal/official finding | — |
| 11 | Naming individuals is necessary | — | an individual is named but naming not marked necessary |
| 12 | Potentially defamatory claim is evidence-backed | defamation-sensitive category + weak backing + an individual named | defamation-sensitive category + weak backing (no name) |

"Defamation-sensitive categories": `EXPLICIT_THREAT`, `ABUSIVE_LANGUAGE`,
`RETALIATION_REFERENCE`, `PUBLIC_SHAMING`, `FINANCIAL_PRESSURE`.
"Weak backing" = source not cited **or** counter-evidence not considered.

## Language rules for documented cases

When referring to a reported incident:

- Classify the source: `NEWS REPORT` · `POLICE FIR REPORTED` · `UNION ALLEGATION` ·
  `DEPARTMENT RESPONSE` · `COURT/TRIBUNAL RECORD` · `OFFICIAL DOCUMENT` ·
  `UNVERIFIED CLAIM`.
- Never assert that workplace pressure **caused** a death or other outcome unless an
  authoritative finding says so.
- Use: "death reported in connection with allegations of…", "family/union alleged…",
  "FIR reportedly registered…", "causation not judicially established".

## Tone

Generated content offers four tones: `NEUTRAL`, `INVESTIGATIVE`, `PUBLIC-INTEREST`,
`FORMAL REPRESENTATION`. There is **no rage-bait mode**. The platform makes its case
through evidence, not abuse.

## Output formats (planned generator)

LinkedIn post / article (English, Tamil, bilingual), press brief, union representation,
administrative representation, RTI draft, incident summary, journalist briefing note —
each generated only from selected `VERIFIED` material and each run through this check
before it can be marked `PUBLIC`.
