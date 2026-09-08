# Methodology

The web version is at `/methodology` and is the primary copy. This file points into the
detailed docs.

PostalMind has two jobs: answer questions about GDS rules without inventing them, and help
a worker analyse workplace evidence without overstating it.

## 1. Source-grounded answers

Retrieve → decide → constrain → check → classify. If nothing authoritative is retrieved,
the answer is `UNKNOWN` and no model is called. A configured model only ever sees the
retrieved passages. Answers are labelled `VERIFIED / INFERENCE / UNVERIFIED / UNKNOWN`.

Detail: `docs/SOURCE-POLICY.md`, `lib/ask/answer.ts`, `lib/sources/registry.ts`.

## 2. Evidence classification

Deterministic, rule-based, bilingual. 18 evidence categories. Every classification carries
a mandatory statement of **what it does not establish**. A target instruction is a target
instruction, not "harassment".

Detail: `docs/EVIDENCE-MODEL.md`, `lib/evidence/classify.ts`.

## 3. Evidence strength

`INSUFFICIENT / WEAK / MODERATE / STRONG` with written factors. No numeric score. Never
`STRONG` without an independent document; capped at `WEAK` when every category is an
ordinary management communication.

Detail: `docs/EVIDENCE-MODEL.md`, `lib/evidence/strength.ts`.

## 4. Timeline & patterns

`PRE-EVENT / EVENT-DAY / POST-EVENT` around the case's central date, with activity
clusters. Pattern view is a straight tally — no fabricated statistics; demo data labelled.

Detail: `lib/evidence/timeline.ts`.

## 5. Privacy & redaction

All evidence handling runs locally; evidence is never sent to a model. Redaction produces
a new derived string and never touches the original.

Detail: `PRIVACY.md`, `docs/REDACTION.md`.

## 6. Publication safety

12 checks, `PASS / WARN / BLOCK`, any `BLOCK` stops the export. Careful language on
causation. No rage-bait tone.

Detail: `docs/PUBLISHING-STANDARD.md`.

## Limitations

- Retrieval is lexical, not semantic.
- The corpus is small; expect many `UNVERIFIED` / `UNKNOWN` answers by design.
- The classifier uses keyword signals — sarcasm, code words and out-of-window context can
  fool it. It is a drafting aid for a human analyst, not a verdict.
- Persistence is not durable in the current build.
