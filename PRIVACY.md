# Privacy

The web version of this policy is at `/privacy`. This file is the canonical copy.

PostalMind is built for material that is often sensitive: WhatsApp threads with phone
numbers, customer account numbers, colleagues' names, branch identifiers. The design goal
is that this material stays under the worker's control.

## What runs locally (no external call)

In your request to PostalMind, on the server:

- WhatsApp `.txt` parsing
- message classification into evidence categories
- evidence-strength assessment
- PII detection (phone, email, Aadhaar, PAN, IFSC, account numbers, facility IDs,
  employee IDs, name cues)
- redaction and the reversible redaction map
- SHA-256 hashing of the original
- timeline construction
- the 12-point publication safety check

The **text of your evidence is not sent to any AI provider.** The "Analyse evidence" flow
(`/api/evidence/parse`, `/api/evidence/publication-check`) does not call a language model.

## What leaves the application

| Action | What is sent | To whom |
|---|---|---|
| Ask (model configured) | Your question + retrieved **source passages** (public documents). Not your evidence. | The configured model provider (e.g. Google Gemini) |
| Ask (demo mode) | Nothing — sources shown directly | — |
| Analyse evidence / publication check | Nothing leaves the server request | — |
| Page loads | Standard web request; fonts from Google Fonts | Your host + Google Fonts |

## What is stored

The current build uses an **in-memory, non-durable** case store. Imported analysis is not
persisted and is lost on restart. Demo mode is the default.

When a database is configured (future), originals are stored immutably with their hash and
an append-only audit log records every action (import, hash, analysis, correction,
redaction, export) **without storing the evidence content in the log**.

## Redaction states

Evidence moves through `ORIGINAL → DERIVED → REDACTED → PUBLIC`. The original is never
altered. Nothing becomes `PUBLIC` automatically — a public export is an explicit action
gated by the publication safety check.

## Repository

The public repository contains only synthetic/demo data. No real evidence, names, phone
numbers or branch identifiers are committed. If you self-host, keep `.data/`, uploads and
`.env*` out of version control (`.gitignore` already lists them).

## Logs

Server logs use a salted hash of the client IP (`HASH_SALT`), never the raw IP, and never
the content of questions or evidence. Provider errors are logged as a short kind, not the
full response body.
