/**
 * Turn a parsed WhatsApp export into classified EvidenceItems.
 *
 * Shared by the demo seed and the /api/evidence/parse route so the demo data
 * is real pipeline output, not hand-written.
 */

import { classifyMessage, normalizeForMatch } from './classify';
import { detectPII, summarizePII } from './pii';
import { assessStrength } from './strength';
import type {
  EvidenceItem,
  SpeakerRole,
} from './types';
import type { WhatsAppMessage, WhatsAppParseResult } from './whatsapp';

export interface IngestOptions {
  caseId: string;
  sourceId: string;
  workingHours?: { start: string; end: string };
  /** How far back (hours) to look for same-speaker repetition. */
  repetitionWindowHours?: number;
  /** Central event date of the case, for time-consistency scoring. */
  eventDate?: string | null;
  /** ISO window the case covers, for time-consistency scoring. */
  caseWindow?: { start: string; end: string } | null;
}

function roleFor(label: string | null): SpeakerRole {
  if (!label) return 'SYSTEM';
  const l = label.toLowerCase();
  if (/supervis|overseer|inspector|postmaster general|\bsdi\b|\basp\b|\bsp\b|divisional/.test(l)) return 'SUPERVISORY';
  if (/employee|abpm|\bbpm\b|dak sevak|\bgds\b|subject/.test(l)) return 'SUBJECT_EMPLOYEE';
  if (/customer|public|depositor/.test(l)) return 'CUSTOMER';
  return 'PEER';
}

function hoursBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 3600_000;
}

export interface IngestResult {
  items: EvidenceItem[];
  summary: {
    messagesConsidered: number;
    itemsCreated: number;
    skippedSystem: number;
    piiMatches: number;
    piiBlocking: boolean;
    categories: Record<string, number>;
    strengthDistribution: Record<string, number>;
  };
}

export function ingestWhatsApp(parse: WhatsAppParseResult, opts: IngestOptions): IngestResult {
  const window = opts.repetitionWindowHours ?? 72;
  const content = parse.messages.filter((m) => !m.isSystem);
  const items: EvidenceItem[] = [];
  const categories: Record<string, number> = {};
  const strengthDistribution: Record<string, number> = { INSUFFICIENT: 0, WEAK: 0, MODERATE: 0, STRONG: 0 };
  let piiMatches = 0;
  let piiBlocking = false;

  content.forEach((msg, idx) => {
    const role = roleFor(msg.sender);
    const recentBySameSpeaker = collectRecent(content, idx, msg, window);
    const analysis = classifyMessage({
      text: msg.text,
      timestamp: msg.timestamp,
      speakerRole: role,
      workingHours: opts.workingHours,
      recentBySameSpeaker: recentBySameSpeaker.map((r) => ({ text: r.text, timestamp: r.timestamp })),
    });

    const repetitionCount =
      1 +
      recentBySameSpeaker.filter((r) =>
        /target|இலக்கு|ilakku|pending|shortfall|rpli|pli|proposal/.test(normalizeForMatch(r.text)),
      ).length;

    const timeConsistent = msg.timestamp
      ? opts.caseWindow
        ? msg.timestamp >= opts.caseWindow.start && msg.timestamp <= opts.caseWindow.end
        : true
      : false;

    const corroboratingItems = items.filter((it) =>
      it.category.some((c) => analysis.categories.includes(c) && c !== 'NEUTRAL' && c !== 'INSUFFICIENT_CONTEXT'),
    ).length;

    const strength = assessStrength(analysis, {
      corroboratingItems,
      independentDocuments: 0,
      timeConsistent,
      speakerRole: role,
      repetitionCount,
    });

    const pii = detectPII(msg.text);
    const piiSummary = summarizePII(pii);
    piiMatches += pii.length;
    if (piiSummary.hasBlocking) piiBlocking = true;

    const item: EvidenceItem = {
      id: `it_${opts.sourceId}_${idx}`,
      caseId: opts.caseId,
      sourceId: opts.sourceId,
      timestamp: msg.timestamp,
      speakerLabel: msg.sender,
      speakerRole: role,
      rawExcerpt: msg.text,
      normalizedExcerpt: normalizeForMatch(msg.text).slice(0, 500),
      category: analysis.categories,
      confidence: analysis.confidence,
      evidenceStrength: strength.strength,
      contextBefore: content[idx - 1] ? content[idx - 1].text.slice(0, 200) : null,
      contextAfter: content[idx + 1] ? content[idx + 1].text.slice(0, 200) : null,
      corroboration: [],
      counterEvidence: analysis.categories.includes('COUNTER_EVIDENCE') ? ['self: same excerpt contains supportive content'] : [],
      analystNotes: null,
      publicationSuitability: 'NOT_ASSESSED',
      redactionStatus: 'DERIVED',
      createdAt: new Date().toISOString(),
      analysis: { ...analysis, strength: strength.strength },
    };
    items.push(item);
    for (const c of analysis.categories) categories[c] = (categories[c] ?? 0) + 1;
    strengthDistribution[strength.strength]++;
  });

  // Second pass: fill corroboration references now that all items exist.
  for (const it of items) {
    it.corroboration = items
      .filter(
        (other) =>
          other.id !== it.id &&
          other.category.some(
            (c) => it.category.includes(c) && c !== 'NEUTRAL' && c !== 'INSUFFICIENT_CONTEXT' && c !== 'COUNTER_EVIDENCE',
          ),
      )
      .map((other) => other.id);
  }

  return {
    items,
    summary: {
      messagesConsidered: parse.messages.length,
      itemsCreated: items.length,
      skippedSystem: parse.messages.length - content.length,
      piiMatches,
      piiBlocking,
      categories,
      strengthDistribution,
    },
  };
}

function collectRecent(
  content: WhatsAppMessage[],
  idx: number,
  msg: WhatsAppMessage,
  windowHours: number,
): WhatsAppMessage[] {
  if (!msg.timestamp || !msg.sender) return [];
  const out: WhatsAppMessage[] = [];
  for (let j = idx - 1; j >= 0; j--) {
    const prev = content[j];
    if (prev.sender !== msg.sender || !prev.timestamp) continue;
    if (hoursBetween(prev.timestamp, msg.timestamp) > windowHours) break;
    out.push(prev);
  }
  return out;
}
