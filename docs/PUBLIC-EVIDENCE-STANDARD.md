# Public Evidence Standard

This is the standard every piece of evidence-derived content — a `/ground-reality` section, a
`content/linkedin/*.md` post, a published case in `/evidence` — must meet before it is published or
publicly shared. It applies regardless of how sympathetic the underlying allegation is, and regardless
of which "side" it happens to support in a given week.

## The ten rules

1. **Original preserved.** The source material is never altered. Analysis, redaction and publication
   all work on a derived copy — the original stays intact and hashed (SHA-256) for integrity checking.
   See `lib/evidence/hash.ts`.

2. **Context preserved.** A quoted or paraphrased excerpt is never stripped of the surrounding context
   that would change its meaning. If context is trimmed for length, the trim must not change what the
   excerpt is evidence *of*.

3. **PII removed.** Phone numbers, Aadhaar/PAN/account numbers, employee IDs, and name cues are
   detected and redacted before anything reaches Public status, with a reversible redaction map kept
   separately from the redacted copy. See `lib/evidence/pii.ts`, `lib/evidence/redaction.ts`.

4. **Third parties protected.** A person who is not the subject of the claim, and did not consent to
   being named, is not named. Role labels (Supervisor, Colleague, MO) are used instead unless naming is
   necessary to the specific point being made and has been separately reviewed.

5. **Allegations labelled.** Every claim carries a source class: `PRIMARY OFFICIAL FACT`,
   `PRIMARY JUDICIAL FACT`, `NEWS REPORT`, `UNION ALLEGATION`, `EMPLOYEE TESTIMONY`,
   `POLICE/FIR REPORTED`, `UNVERIFIED CLAIM`, or `DEMO`. An allegation is presented as an allegation —
   "employees alleged...", "an FIR was reportedly registered concerning allegations of..." — never
   flattened into a bare statement of fact.

6. **Response / counter-evidence included.** Where a Department, officer, or other named party has
   responded to an allegation, that response is included, not omitted because it complicates the
   narrative. Evidence that cuts against the working reading is recorded explicitly, not discarded.

7. **Causal claims require strong authority.** A statement that X *caused* Y (e.g. "target pressure
   caused a death") requires an authoritative finding — a court, tribunal, or official inquiry — that
   makes that exact causal claim. Short of that, use: "reported death amid allegations of workplace
   pressure", "causation has not been judicially established", or equivalent. This rule has no
   exception for how serious or plausible the allegation looks.

8. **No arbitrary harassment score.** PostalMind does not reduce a case to a single "harassment score"
   or severity number. Evidence indicators (repeated demands, peer comparison, public naming, leave
   linkage, inspection threats, after-hours follow-up, retaliation references, etc.) are classified
   separately, each with its own basis, so a reader can weigh them rather than trust a number.

9. **Publication requires explicit review.** Nothing reaches Public status without passing the
   publication safety check (`lib/evidence/publication.ts`, twelve points: PII removal, context
   retention, source citation, counter-evidence, no unsupported legal conclusion, among others). Any
   single failing point blocks the export — there is no override for urgency or a compelling headline.

10. **Corrections logged publicly.** A factual error, once identified, is corrected openly — original
    claim, corrected claim, reason, date and source, all preserved — not silently edited or deleted.
    See `docs/CORRECTIONS-POLICY.md` and `/corrections`.

## Scope

This standard applies to:
- every `/ground-reality` section
- every file in `content/linkedin/`
- every case published via `/evidence` to Public status
- any other public-facing claim PostalMind AI makes about a real event, institution, or individual

It does **not** relax any rule for content that is popular, urgent, or aligned with the campaign's own
hypothesis. Ground Reality is designed to remain credible even when the evidence contradicts what the
campaign expected to find — see `content/linkedin/00-campaign-manifesto.md`.

## Enforcement

`npm run content:check` performs an automated, best-effort scan of campaign content for the mechanical
parts of this standard (missing source status, missing qualification language, missing disclaimer,
absent source notes, obvious PII patterns, unsupported absolute language). It is a floor, not a
substitute for a human reading every post against these ten rules before publishing.
