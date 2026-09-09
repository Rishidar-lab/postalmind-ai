# September 10 Operational Checklist — GDS using PostalMind

For the real GDS event scheduled 10 September 2026 (Mela / business-target-pressure scenario). This checklist is for private operational use, not public publication.

## BEFORE — up to 9 September 2026

- [ ] Verify local evidence vault works: open /evidence/quick, enter a test excerpt, confirm "Saved locally" appears.
- [ ] Confirm quick-incident entries persist across page reload (localStorage).
- [ ] Confirm Mela case template works: open /evidence/mela, enter a synthetic PRE-EVENT note, confirm saved locally.
- [ ] Confirm /api/health responds 200 and shows verifiedSources > 0, demoMode status.
- [ ] Confirm /api/ask works in source-only mode (no OPENROUTER_API_KEY needed).
- [ ] Confirm /evidence/quick is usable on mobile layout (test at ~360x800 viewport).
- [ ] Export backup of evidence vault (copy localStorage content to a safe external file, or take a screenshot of saved items).
- [ ] Confirm device battery > 80% and storage > 500 MB.
- [ ] Confirm localStorage quota available (clear old non-essential data if near limit).
- [ ] Record any existing supervisory instructions neutrally (use aliases, never real names; label source role only).
- [ ] Confirm no real PII is committed to repository or public export.
- [ ] Confirm redaction preview works: import synthetic WhatsApp export, check PII detection, toggle manual spans, preview redacted output.

## DURING — 10 September 2026

- [ ] Capture contemporaneous evidence immediately (under 30 seconds): open /evidence/quick, paste/type exact excerpt, choose source type, optionally set speaker alias/role, tap Save locally.
- [ ] Preserve original timestamps: do not edit messages or screenshots; save original file unchanged.
- [ ] Record verbal instructions separately: use note field with clear label: "Contemporaneous user note — not an independent recording."
- [ ] For after-hours messages: note time explicitly in excerpt or context; classification runs locally and will mark AFTER_HOURS_COMMUNICATION.
- [ ] For target instructions: use source type "target" or "individual-target"; classification runs locally and will mark TARGET_INSTRUCTION (not misconduct).
- [ ] For peer-comparison messages: use source type "peer-comparison"; classification will mark PEER_COMPARISON.
- [ ] For follow-up demands: use source type "follow-up"; classification will assess based on content.
- [ ] For explanation demands: use source type "explanation"; note whether it is written or verbal.
- [ ] For threats or consequence statements: use source type "threat"; note exact words.
- [ ] Do NOT edit original screenshots or WhatsApp exports; every derived/redacted export is a new file.
- [ ] Do NOT publish evidence automatically; any PUBLIC export requires passing the 12-point publication safety check first.
- [ ] Avoid publicly posting evidence until redaction complete and context retained.
- [ ] If a supervisor asks why you are recording, respond neutrally: "I am documenting my work for my own records."
- [ ] Do not provoke confrontation; PostalMind is a documentation tool, not an accusation generator.

## AFTER — post 10 September 2026

- [ ] Build chronology: open saved quick incidents, review categories (TARGET_INSTRUCTION, REPEATED_TARGET_PRESSURE, PEER_COMPARISON, AFTER_HOURS_COMMUNICATION, THREAT_LIKE_LANGUAGE, etc.).
- [ ] Build timeline in Mela template: PRE-EVENT / EVENT-DAY / POST-EVENT sections; reference quick-incident IDs in notes.
- [ ] Hash evidence originals: for each original file or screenshot, record SHA-256 (use a local tool like `sha256sum` or the app's hash function if available).
- [ ] Compare any official response (grievance acknowledgment, Collector forwarding, divisional reply, CM Cell registration, departmental explanation) with evidence timeline.
- [ ] For each official claim, compare with evidence using the claim-evidence matrix: mark as SUPPORTED / PARTIALLY_SUPPORTED / POTENTIAL_CONTRADICTION / NOT_ADDRESSED / INSUFFICIENT_EVIDENCE.
- [ ] Redact all PII before any external sharing: emails, phone numbers, Aadhaar, PAN, IFSC, facility IDs, employee IDs, account numbers.
- [ ] Run publication safety check before any PUBLIC export: confirm 12-point checks pass (PII removed, context retained, sources cited, counter-evidence considered, no unsupported legal conclusions, naming necessary, defamation-sensitive claims backed).
- [ ] Preserve originals privately; never share original unredacted files externally.
- [ ] Generate Mela case export only after redaction complete and publication check passed.
- [ ] Update analyst notes with what the evidence supports and what it does NOT establish (mandatory for every classification).
- [ ] If escalation required: use official grievance channels (departmental escalation, CPGRAMS, RTI to CPIO/SPIO), not public accusations.
- [ ] Preserve evidence timeline locally; do not rely solely on server persistence.

## KEY DISTINCTIONS — NEVER CONFUSE

- Target instruction ≠ harassment
- Performance expectation ≠ misconduct
- Peer comparison ≠ misconduct
- After-hours message ≠ misconduct
- Inspection reference ≠ threat
- Repeated target pressure ≠ retaliation (requires evidence of adverse consequence)
- Threat-like language ≠ explicit threat (requires explicit adverse consequence statement)

A single message is never STRONG without an independent document. A single evidence item never establishes a legal finding. PostalMind helps document events; it does not instruct the user to provoke confrontation.
