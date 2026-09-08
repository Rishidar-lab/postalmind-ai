# 05 — Documenting, Not Ranting

## TITLE
WE ARE NOT PUBLISHING SCREENSHOTS. WE ARE BUILDING EVIDENCE.

## HOOK
A screenshot proves a message existed. It rarely proves what the poster wants it to prove. This is the
difference between a viral post and evidence.

## FULL LINKEDIN POST

WE ARE NOT PUBLISHING SCREENSHOTS. WE ARE BUILDING EVIDENCE.

Here is PostalMind's actual method, not a slogan version of it.

Every piece of evidence moves through four states: **Original → Derived → Redacted → Public.**
The original is never altered. A derived copy is what gets analysed. A redacted copy removes personal
identifiers. Nothing reaches Public without explicitly passing every earlier state — and most evidence
never needs to reach Public at all to be useful to the person who submitted it.

Some specifics:

— **SHA-256 hashing.** The original text is hashed on submission, so its integrity can be checked later
without needing to keep re-exposing the original.
— **Local-first processing.** WhatsApp parsing, classification, PII detection and redaction run on the
request itself — the raw evidence text is not sent to any AI provider.
— **PII redaction.** Phone numbers, Aadhaar/PAN/account numbers, employee IDs and name cues are
detected and can be redacted before anything is shared, with a reversible redaction map kept
separately from the redacted copy.
— **Counter-evidence.** The tool explicitly records what evidence exists *against* a reading, not only
what supports it. A one-sided file is not evidence, it's advocacy wearing evidence's clothes.
— **What it does not prove.** Every classified item carries an explicit note on what it does *not*
establish — a target message is not, by itself, proof of intent, retaliation, or that any rule was
broken.
— **Publication safety gate.** A twelve-point check — PII removed, context retained, source cited,
counter-evidence included, no unsupported legal conclusion, among others — has to pass before anything
becomes Public. Any single failing point blocks the export. There is no override for a compelling
headline.

The point of all of this is not caution for its own sake. It's that a screenshot with the names cropped
out is not evidence — it's an assertion with a picture attached. PostalMind starts from the opposite
end.

We do not begin with a verdict and search for screenshots that support it.

We preserve evidence first, then ask what it actually demonstrates.

This is not a campaign against individual postal employees.

It is a campaign to document the system.

Ground reality. Verified.

Independent project. Not affiliated with or endorsed by India Post or the Department of Posts.

## SHORT VERSION
We don't publish screenshots — we build evidence. Original → Derived → Redacted → Public, with the
original never altered. SHA-256 integrity hashing. Local-first processing — raw evidence never sent to
an AI provider. PII redaction with a separate, reversible map. Explicit counter-evidence and "what
this does not prove" on every item. A twelve-point publication safety gate before anything goes public
— no override for a good headline. We do not start with a verdict and search for supporting
screenshots. We preserve evidence first, then ask what it demonstrates. Ground reality. Verified.

## CAROUSEL COPY
**SLIDE 1** — WE ARE NOT PUBLISHING SCREENSHOTS. WE ARE BUILDING EVIDENCE.
**SLIDE 2** — Original → Derived → Redacted → Public. The original is never altered.
**SLIDE 3** — SHA-256 hashing. Local-first processing — nothing raw sent to an AI provider.
**SLIDE 4** — PII redaction, with a separate, reversible map.
**SLIDE 5** — Counter-evidence and "what this does not prove" — on every item, not just the supportive parts.
**SLIDE 6** — A 12-point safety gate before anything goes Public. No override for a headline. Ground reality. Verified.

## SOURCE NOTES
| Claim | Source | Source class | Date |
|---|---|---|---|
| Original/Derived/Redacted/Public states; local-first; no evidence sent to AI provider | `PRIVACY.md`, `/privacy` page, `docs/ARCHITECTURE.md` (this repository) | PRIMARY OFFICIAL FACT — this project's own documented design, verifiable by reading the cited files | current build |
| SHA-256 integrity hashing | `lib/evidence/hash.ts`, `test/hash.test.ts` (this repository) | PRIMARY OFFICIAL FACT — verifiable in source | current build |
| 12-point publication safety gate | `lib/evidence/publication.ts`, `test/publication.test.ts`, `/methodology#publication` (this repository) | PRIMARY OFFICIAL FACT — verifiable in source | current build |

Full detail: `/methodology`, `/privacy`, `docs/PUBLIC-EVIDENCE-STANDARD.md`. Every claim in this post
describes PostalMind's own tooling, all of it inspectable in this repository — it is the one post in
the series that a technically literate reader can fact-check by reading code, not by trusting the
maintainer's word.

## RISK / QUALIFICATION NOTES
- This post makes claims about PostalMind's *own* system, not about India Post or any third party —
  lowest external-attribution risk in the series, but the highest accuracy bar, since it is the most
  checkable. Do not describe a capability the codebase doesn't actually have.
- "We do not begin with a verdict" is a standing editorial commitment — if a future case is ever
  handled in a way that contradicts it, that itself becomes a corrections-log entry, not something to
  quietly paper over.

## HASHTAGS
#PostalMindAI #GroundReality #EvidenceBased #GDS #DataPrivacy
