# Source policy

Code: `content/sources.ts`, `content/corpus.ts`, `lib/sources/`.

## The contract

PostalMind never states a GDS rule number, circular number, memo number, order number,
date, officer name, court decision or interest rate that is not written in a cited
passage in `content/corpus.ts`.

If retrieval finds nothing, the answer is `UNKNOWN`. This is a feature.

## Record shape

`SourceRecord`: `id · title · authority · documentType · date · effectiveDate · sourceUrl ·
localPath · sha256 · pageCount · status · tags · summary · createdAt · updatedAt`

`CorpusPassage`: `id · sourceId · section · page · text · status · tags · keywords`

`documentType`: `RULE | CIRCULAR | DIRECTORATE_ORDER | OFFICE_MEMORANDUM | TRCA_ORDER |
LEAVE_INSTRUCTION | FINANCIAL_PRODUCT_DOC | RTI_RESPONSE | PARLIAMENT_REPLY | JUDGMENT |
GAZETTE_NOTIFICATION | GUIDANCE_NOTE`

## Status

| Status | Meaning | Answer classification it allows |
|---|---|---|
| `VERIFIED` | A maintainer has checked the passage **word-by-word** against the primary document and recorded the document's SHA-256 + page. | `VERIFIED` (if retrieval is strong and every claim is cited) |
| `UNVERIFIED` | Project summary — accurate in intent, not yet checked line-by-line. | `UNVERIFIED` |
| `DEMO` | Illustrative only. | `UNVERIFIED` |

The shipped library is deliberately small and almost entirely `UNVERIFIED`. That is
honest, not a placeholder to paper over.

## Source categories to build out

- GDS (Conduct & Engagement) Rules, 2020 — section by section
- Department of Posts circulars (business, establishment, vigilance)
- Directorate orders
- TRCA / service-condition orders (with each DA revision)
- Leave instructions (the individual OMs, not a summary)
- IPPB / PLI / RPLI / POSB product documents
- RTI responses of general interest
- Official Parliamentary replies on GDS matters
- Court / tribunal judgments where directly relevant

## Promoting a passage to VERIFIED

1. Obtain the **primary document** (gazette / Directorate PDF / court copy). Not a blog,
   not a news summary.
2. Add it as a `localPath` mirror; compute and record its `sha256` and `pageCount`.
3. Check the passage text against the document. Quote or tightly paraphrase; cite the
   `section` and `page`.
4. Set `status: 'VERIFIED'`, bump `updatedAt`.
5. Add or adjust `keywords` so retrieval finds it for the questions it answers.
6. Add a retrieval test in `test/ask.test.ts` if the passage answers a common question.

## Interest rates — special rule

Small-savings rates (RD, TD, MIS, NSC, SSA, SCSS, PPF, POSB) change every quarter and are
notified by the Ministry of Finance. A rate is only ever stated if the **notification for
that quarter** is loaded as a `VERIFIED` passage with the quarter in its `section`. The
default passage tells the reader to open the current notification and read it directly.

## Rot

If a `sourceUrl` breaks, the citation (title + authority + date + section) must still let
a reader find the document. Prefer stable government domains; keep a local mirror for
anything relied on.
