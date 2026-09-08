/**
 * Browser-safe WhatsApp analysis orchestrator.
 *
 * Runs the WHOLE deterministic pipeline with NO network call:
 *   hash → parse → aliases → classify/strength (ingest) → timeline → PII
 *
 * This is what the evidence UI uses for **private** evidence. The identical
 * logic backs `/api/evidence/parse` (kept for demos / non-browser callers),
 * but private workplace evidence is analysed on the device by calling this
 * function directly.
 *
 * Every symbol it imports is pure and isomorphic — no `node:*`, no `fetch`.
 */

import { sha256Hex } from './hash';
import { ingestWhatsApp, type IngestResult } from './ingest';
import { detectPII, summarizePII, type PIIMatch } from './pii';
import { buildTimeline, type Timeline } from './timeline';
import { applyAliases, parseWhatsAppExport, type WhatsAppParseResult } from './whatsapp';

export interface AnalyzeOptions {
  aliases?: Record<string, string>;
  workingHours?: { start: string; end: string };
  eventDate?: string | null;
}

export interface LocalAnalysis {
  source: { byteLength: number; sha256: string };
  parse: WhatsAppParseResult;
  analysis: IngestResult;
  timeline: Timeline;
  pii: { matches: PIIMatch[]; summary: ReturnType<typeof summarizePII> };
  /** True — this ran locally with no network. The UI asserts this. */
  local: true;
}

export async function analyzeWhatsAppText(
  text: string,
  opts: AnalyzeOptions = {},
): Promise<LocalAnalysis> {
  const byteLength = new TextEncoder().encode(text).length;
  const sha256 = await sha256Hex(text);

  const rawParse = parseWhatsAppExport(text);
  const parse = opts.aliases && Object.keys(opts.aliases).length
    ? applyAliases(rawParse, opts.aliases)
    : rawParse;

  const analysis = ingestWhatsApp(parse, {
    caseId: 'local',
    sourceId: 'local',
    workingHours: opts.workingHours ?? { start: '09:00', end: '17:00' },
    eventDate: opts.eventDate ?? null,
    caseWindow: parse.dateRange,
  });

  const timeline = buildTimeline(analysis.items, { centralEventDate: opts.eventDate ?? null });

  const matches = detectPII(text);

  return {
    source: { byteLength, sha256 },
    parse,
    analysis,
    timeline,
    pii: { matches, summary: summarizePII(matches) },
    local: true,
  };
}
