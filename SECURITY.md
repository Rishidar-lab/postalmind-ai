# Security

## Reporting a vulnerability

Open a **private** security advisory on the GitHub repository
(`Security → Report a vulnerability`), or contact the maintainer directly. Please do not
open a public issue for anything exploitable. Describe the class of problem and impact;
you do not need to include a working exploit.

## Scope

In scope: this repository's application code and its handling of user-supplied evidence,
questions, and uploads. Out of scope: third-party providers (OpenRouter and the free models
routed through it, Vercel), denial-of-service via volumetric traffic, and the content accuracy
of source passages (that is an editorial matter — see `docs/SOURCE-POLICY.md`).

## Threat model summary

Full detail in `docs/THREAT-MODEL.md`. Key positions:

| Threat | Mitigation |
|---|---|
| Malicious upload (huge file, malformed) | Size caps (`MAX_UPLOAD_SIZE`, request-byte cap), content-length check, `.txt` only for the parser, parser never throws |
| Prompt injection inside evidence | Evidence is **never** sent to a model. In `/ask`, retrieved passages are labelled data and the system prompt fixes the rules; the classifier is not an LLM |
| Stored XSS / HTML injection | React escapes by default; evidence is rendered as text, never `dangerouslySetInnerHTML`; CSP set in `next.config.js` |
| PII leakage to logs / providers | IP hashed with salt; questions/evidence never logged; provider errors logged as a kind, not a body |
| Path traversal / unsafe filenames | No filesystem writes from user input in the current build; filenames are display-only |
| Public evidence exposure | Nothing is public without an explicit export that passes the 12-point check |
| API abuse | Per-route in-process rate limiting (soft on serverless — a shared limiter is the production path) |
| Secret exposure | No `NEXT_PUBLIC_*` secrets; key sent as a request header, not a URL; `/api/health` reveals status but never values |

## Dependencies

`npm audit` is expected to be clean. Runtime dependencies are deliberately few
(`next`, `react`, `lucide-react`). `vitest` is dev-only.
