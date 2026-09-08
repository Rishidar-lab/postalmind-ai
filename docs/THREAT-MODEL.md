# Threat model

Assets, in priority order:

1. A worker's sensitive evidence (WhatsApp threads, screenshots) and the identities in it.
2. The integrity of the analysis (a wrong classification presented as certain).
3. The independence and non-defamatory character of anything published.
4. Availability and cost of the service.

## Actors

- **Curious / hostile reader** of the public repo or site.
- **Abusive API client** (scraping, cost inflation, resource exhaustion).
- **A hostile party named in a worker's evidence** who wants the material suppressed,
  altered, or turned against the worker.
- **A well-meaning contributor** who might commit real data or fabricate a source.

## Threats and mitigations

### Malicious / oversized uploads
- `MAX_UPLOAD_SIZE` (default 5 MB) enforced on the form file and the raw body.
- `content-length` checked before reading; body length re-checked after.
- The parser is `.txt`-oriented and **never throws** — malformed input yields warnings.
- No PDF/image *parsing* in this build (screenshots are a planned, sandboxed feature).

### Prompt injection inside evidence
- Evidence text is **never** sent to a language model. `/api/evidence/*` calls no
  provider.
- In `/ask`, the model receives only retrieved *source passages* (public documents) plus
  the question. The system prompt fixes the rules; passages are framed as data.
- The classifier is not an LLM, so "SYSTEM: ignore previous instructions" in a message is
  just text that fails to match any signal (there is a test for this).

### Stored XSS / HTML injection
- React escapes all interpolated text; no `dangerouslySetInnerHTML` anywhere.
- Evidence is rendered inside `<blockquote>` / `<pre>` as text.
- CSP in `next.config.js`: `default-src 'self'`, scripts `'self' 'unsafe-inline'` (Next
  inline bootstrap), styles + fonts limited to Google Fonts, `frame-ancestors 'none'`.

### PII leakage
- To **logs**: client IP is salted-hashed (`HASH_SALT`) to a 16-char id; questions and
  evidence are never logged; provider errors log a `kind`, not a body.
- To **providers**: see prompt-injection above — evidence never leaves.
- To the **public**: nothing is public without an export that passes the 12-point check
  (`docs/PUBLISHING-STANDARD.md`).

### Evidence tampering / repudiation
- Every imported original gets a SHA-256 over its exact bytes, recorded with an
  `HASH_CALCULATED` audit entry.
- Originals are immutable; derived/redacted artefacts are new objects.
- The audit log is append-only.

### Path traversal / unsafe filenames
- No filesystem writes are driven by user input in this build. Uploaded filenames are
  display-only and never used as paths.

### API abuse / cost
- Per-route in-process fixed-window rate limiting. **This is soft on serverless** (per
  instance, resets on cold start). Production should front it with a shared limiter
  (Upstash / Vercel KV) keyed on the hashed client id.
- Request-byte cap (`MAX_REQUEST_BYTES`) and message-count cap (`MAX_MESSAGES`).
- The model is called with a low token ceiling and a short timeout; retries are bounded
  and only for idempotent transient failures.

### Contributor risk
- `.gitignore` blocks `.data/`, `uploads/`, `evidence/`, `*.chat.txt`, `.env*`.
- `CONTRIBUTING.md` forbids real data and fabricated sources.
- Demo content is clearly labelled `DEMO` and lives in `lib/demo/` and `content/`.

## Known residual risk

- The in-process rate limiter is not a real control on serverless.
- Lexical retrieval can miss a relevant source (fails toward `UNKNOWN`, which is safe) or
  surface a weakly-relevant one (labelled `UNVERIFIED`).
- Screenshot/OCR intake is not yet built; when it is, image parsing is a new attack
  surface and must be sandboxed.
- No authentication — the current build is single-user / local. Multi-user durable cases
  need auth before launch.
