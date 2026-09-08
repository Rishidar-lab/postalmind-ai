# PostalMind AI — Ground Reality LinkedIn Pack

Copy-paste-ready LinkedIn content for the **Ground Reality** campaign. Nothing in this directory is
published automatically — no LinkedIn API is used or connected anywhere in this repository. The
maintainer publishes each post manually, in their own time, in their own judgment.

**Campaign name:** Ground Reality
**Subtitle:** A PostalMind AI evidence project on the working reality of Gramin Dak Sevaks.
**Standing sign-off (every post):** "This is not a campaign against individual postal employees. It
is a campaign to document the system." followed by "Ground reality. Verified." and the independence
disclaimer.

## Suggested publishing order

1. `00-campaign-manifesto.md` — states the series' own rules before any claim is made.
2. `01-who-is-a-gds.md` — who GDS are and why the distinction matters. Has English, Tamil and
   bilingual full versions, plus the 6-slide carousel.
3. `02-responsibility-without-parity.md` — status vs. responsibility.
4. `03-the-target-question.md` — target ≠ harassment; where the two evidence indicators diverge.
5. `04-when-targets-become-pressure.md` — the same question, illustrated as a synthetic timeline.
6. `05-documenting-not-ranting.md` — PostalMind's actual evidence method.
7. `06-human-cost-without-overclaiming.md` — the most sensitive post; read its Risk notes in full
   before publishing, every time, even on a re-read months later.
8. `07-what-should-change.md` — closing reform proposals.

`profile.md` is separate — LinkedIn profile headline/About copy, not a post.

## Before publishing ANY post

- Run `npm run content:check` — it flags missing source status, unsupported absolute language, missing
  qualification, a missing disclaimer, absent source notes, and obvious PII patterns. A clean run is
  necessary, not sufficient — it cannot check that a citation is actually accurate.
- Read that file's own **RISK / QUALIFICATION NOTES** section. They're not boilerplate — several are
  specific to that post (e.g. `06`'s note on why one real case was deliberately excluded).
- If you change a factual claim after this pack was generated, log it per
  `docs/CORRECTIONS-POLICY.md` — including here, before the post goes out, not only after a reader
  catches it.

## Every file follows this template

```
TITLE
HOOK
FULL LINKEDIN POST   (English; 01 also has Tamil and Bilingual versions)
SHORT VERSION
CAROUSEL COPY
SOURCE NOTES         (claim → source → source class → date, per docs/PUBLIC-EVIDENCE-STANDARD.md)
RISK / QUALIFICATION NOTES
HASHTAGS
```

## Source-class labels used throughout this pack

`PRIMARY OFFICIAL FACT` · `PRIMARY JUDICIAL FACT` · `NEWS REPORT` · `UNION ALLEGATION` ·
`EMPLOYEE TESTIMONY` · `POLICE/FIR REPORTED` · `UNVERIFIED CLAIM` · `DEMO` · `STATUS STATEMENT` ·
`EDITORIAL PROPOSAL` — see `docs/PUBLIC-EVIDENCE-STANDARD.md` for what each means and requires.

A blog or secondary summary reporting on an official document is always labelled `NEWS REPORT`, never
elevated to `PRIMARY OFFICIAL FACT`, even when it's the best source currently available — see `03`'s
and `06`'s source notes for a worked example (the Ministry's reported response to an MP
representation on GDS target pressure).

## What this pack deliberately does not contain

No death count, no suicide count, no invented circular/order/rule number, no invented quotation, no
statistic without a cited source, and — in `06` specifically — no real case that PostalMind could not
verify as actually about a GDS (one real, unrelated case was found and explicitly excluded; see `06`'s
source notes for why).
