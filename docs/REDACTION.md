# Redaction

Code: `lib/evidence/pii.ts`, `lib/evidence/redaction.ts`.

## Principle

The original evidence is never altered. Redaction always produces a **new derived
string**. A reversible map (token → original substring) is kept **inside the workspace**
so an analyst can un-redact while working; that map is never part of a `PUBLIC` export.

## Lifecycle

```
ORIGINAL   the exact imported bytes + SHA-256; immutable
DERIVED    normalised / parsed text for analysis
REDACTED   DERIVED with detected + manual spans replaced by tokens
PUBLIC     REDACTED, instance tokens collapsed to generic form, safety check passed
```

## Detection (`detectPII`)

India-tuned, runs locally, over-flags on purpose. Types and default confidence:

| Type | Confidence | Replacement |
|---|---|---|
| `EMAIL` | high | `[email]` |
| `IFSC` | high | `[ifsc]` |
| `PAN` | high | `[pan]` |
| `URL` | medium | `[link]` |
| `FACILITY_ID` (BO/SO/HO/RMS + digits) | high | `[facility-id]` |
| `AADHAAR` (12 digits, 4-4-4) | medium | `[aadhaar]` |
| `PHONE` (10 digits 6-9, +91/0, 5-5 or 3-3-4 grouping) | high | `[phone]` |
| `EMPLOYEE_ID` (emp/staff/gds id …) | medium | `[employee-id]` |
| `ACCOUNT_NUMBER` (bare 9–18 digit run) | medium | `[account]` |
| `VEHICLE` | low | `[vehicle]` |
| `AMOUNT` (₹ / Rs.) | low | `[amount]` |
| `PIN_CODE` | low | `[pin]` |
| `HANDLE` (@name) | low | `[handle]` |
| `POSSIBLE_NAME` (title/role cue + Capitalised words) | medium | `[name]` |

Overlapping matches are resolved by a fixed priority (email > ifsc > pan > url >
facility-id > aadhaar > phone > employee-id > account > …).

**Blocking types** (block a `PUBLIC` export unless low-confidence and cleared): phone,
email, aadhaar, pan, account number, ifsc, employee id, facility id.

## Application (`applyRedactions`)

- Spans are normalised (overlaps merged; a `manual` span's replacement wins).
- Each replacement token is made unique per instance: `[phone]` → `[phone·1]`, `[phone·2]`.
- `reverseMap['[phone·1]'] = '9876543210'` — workspace-only.
- `publicForm()` collapses `[phone·1]` → `[phone]` for output.
- `hasResidualLongDigits()` is a smell test: any raw 6+ digit run surviving redaction is
  flagged.

## Manual redaction

The import UI lets the analyst toggle any detected match on/off and (in the case
workspace, future) draw a manual span with a chosen label. Manual spans are marked
`origin: 'manual'` and take precedence.

## What redaction does not do

- It does not guarantee de-identification — a human reviews every export.
- It does not understand context (a phone number that is *the point* of the evidence
  still gets flagged; the analyst decides).
- It is not a substitute for the publication safety check.
