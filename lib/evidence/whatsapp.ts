/**
 * WhatsApp chat-export (.txt) parser.
 *
 * Goals:
 *  - handle the Android ("DD/MM/YYYY, HH:MM - Name: msg") and iOS
 *    ("[DD/MM/YYYY, HH:MM:SS] Name: msg") export formats
 *  - 12h and 24h clocks, with the narrow-no-break-space WhatsApp puts before AM/PM
 *  - multiline messages, deleted messages, "<Media omitted>", system lines
 *  - Tamil / English / Tanglish content (it is just UTF-8 — no transliteration)
 *  - never throw on malformed input; collect warnings instead
 *
 * It does NOT interpret meaning. Classification is a separate step.
 */

export interface WhatsAppMessage {
  /** 0-based index among parsed (non-continuation) messages. */
  index: number;
  /** ISO-ish local timestamp "YYYY-MM-DDTHH:MM:SS" or null if unparseable. */
  timestamp: string | null;
  /** The raw timestamp text exactly as it appeared. */
  rawTimestamp: string;
  /** Sender display name, or null for system messages. */
  sender: string | null;
  /** Message body (continuation lines joined with "\n"). */
  text: string;
  isSystem: boolean;
  isMedia: boolean;
  isDeleted: boolean;
  /** 1-based line number in the source file where this message started. */
  lineStart: number;
}

export interface WhatsAppParseResult {
  messages: WhatsAppMessage[];
  participants: string[];
  dateRange: { start: string; end: string } | null;
  totalLines: number;
  /** Lines that could not be attached to any message. */
  excludedCount: number;
  counts: { system: number; media: number; deleted: number; content: number };
  warnings: string[];
  detectedFormat: 'android' | 'ios' | 'unknown';
  /** Inferred date field order. */
  dateOrder: 'DMY' | 'MDY' | 'ambiguous' | 'unknown';
}

const NBSP = '[\\s\\u202f\\u00a0\\u200e\\u200f]';

// iOS: [12/03/2026, 9:15:30 PM] Sender: message
const IOS_RE = new RegExp(
  `^\\u200e?\\[(\\d{1,2})[\\/.\\-](\\d{1,2})[\\/.\\-](\\d{2,4}),?${NBSP}+` +
    `(\\d{1,2}):(\\d{2})(?::(\\d{2}))?(?:${NBSP}*([APap][Mm]))?\\]${NBSP}?([\\s\\S]*)$`,
);

// Android: 12/03/2026, 21:15 - Sender: message   (also "12/03/26, 9:15 pm - ")
const ANDROID_RE = new RegExp(
  `^\\u200e?(\\d{1,2})[\\/.\\-](\\d{1,2})[\\/.\\-](\\d{2,4}),?${NBSP}+` +
    `(\\d{1,2}):(\\d{2})(?::(\\d{2}))?(?:${NBSP}*([APap][Mm]))?${NBSP}+-${NBSP}+([\\s\\S]*)$`,
);

const MEDIA_MARKERS = [
  '<media omitted>',
  'image omitted',
  'video omitted',
  'audio omitted',
  'sticker omitted',
  'gif omitted',
  'document omitted',
  'contact card omitted',
  '<attached:',
  'this message was edited',
];

const DELETED_MARKERS = [
  'this message was deleted',
  'you deleted this message',
  'this message was deleted.',
];

function normalizeYear(y: number): number {
  if (y < 100) return y >= 70 ? 1900 + y : 2000 + y;
  return y;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

interface RawHeader {
  a: number; // first date field
  b: number; // second date field
  y: number;
  hh: number;
  mm: number;
  ss: number;
  ampm: string | undefined;
  rawTs: string;
  rest: string;
}

function matchHeader(line: string): { format: 'android' | 'ios'; h: RawHeader } | null {
  const ios = IOS_RE.exec(line);
  if (ios) {
    return {
      format: 'ios',
      h: {
        a: +ios[1],
        b: +ios[2],
        y: normalizeYear(+ios[3]),
        hh: +ios[4],
        mm: +ios[5],
        ss: ios[6] ? +ios[6] : 0,
        ampm: ios[7]?.toLowerCase(),
        rawTs: line.slice(0, line.length - ios[8].length).trim(),
        rest: ios[8],
      },
    };
  }
  const and = ANDROID_RE.exec(line);
  if (and) {
    return {
      format: 'android',
      h: {
        a: +and[1],
        b: +and[2],
        y: normalizeYear(+and[3]),
        hh: +and[4],
        mm: +and[5],
        ss: and[6] ? +and[6] : 0,
        ampm: and[7]?.toLowerCase(),
        rawTs: line.slice(0, line.length - and[8].length).replace(/\s*-\s*$/, '').trim(),
        rest: and[8],
      },
    };
  }
  return null;
}

function to24h(hh: number, ampm: string | undefined): number {
  if (!ampm) return hh;
  if (ampm === 'am') return hh === 12 ? 0 : hh;
  return hh === 12 ? 12 : hh + 12;
}

function splitSender(rest: string): { sender: string | null; text: string; isSystem: boolean } {
  // WhatsApp convention: "Display Name: body". The name part has no newline and
  // is short. Anything else at header level is a system message
  // ("Alice added Bob", "Messages and calls are end-to-end encrypted", …).
  const idx = rest.indexOf(': ');
  if (idx > 0 && idx < 120 && !rest.slice(0, idx).includes('\n')) {
    const sender = rest.slice(0, idx).trim();
    // Guard against a leading "https://…" being read as a sender name.
    if (sender && !/^https?$/i.test(sender)) {
      return { sender, text: rest.slice(idx + 2), isSystem: false };
    }
  }
  return { sender: null, text: rest, isSystem: true };
}

export function parseWhatsAppExport(raw: string): WhatsAppParseResult {
  const warnings: string[] = [];
  // Strip UTF-8 BOM.
  const text = raw.replace(/^﻿/, '');
  const lines = text.split(/\r\n|\r|\n/);
  const totalLines = lines.length;

  const messages: WhatsAppMessage[] = [];
  let current: WhatsAppMessage | null = null;
  let excludedCount = 0;
  let sawDMY = false;
  let sawMDY = false;
  const formats = new Set<'android' | 'ios'>();
  // Raw date/time components per message, resolved to a timestamp after the
  // whole file is read and the field order is known.
  const rawParts: Array<{ a: number; b: number; y: number; h24: number; mm: number; ss: number; line: number } | null> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === '' && !current) continue;

    const m = matchHeader(line);
    if (!m) {
      if (current) {
        current.text += '\n' + line;
      } else if (line.trim() !== '') {
        excludedCount++;
      }
      continue;
    }

    formats.add(m.format);
    const { a, b, y, hh, mm, ss, ampm, rawTs, rest } = m.h;

    // Infer date order.
    if (a > 12 && b <= 12) sawDMY = true;
    else if (b > 12 && a <= 12) sawMDY = true;

    const h24 = to24h(hh, ampm);
    rawParts.push(
      h24 >= 0 && h24 <= 23 && mm <= 59 ? { a, b, y, h24, mm, ss, line: i + 1 } : null,
    );

    const { sender, text: body, isSystem } = splitSender(rest);
    const lower = body.toLowerCase().trim();
    const isMedia = MEDIA_MARKERS.some((mk) => lower.includes(mk));
    const isDeleted = DELETED_MARKERS.some((mk) => lower === mk || lower.startsWith(mk));

    current = {
      index: messages.length,
      timestamp: null,
      rawTimestamp: rawTs,
      sender: isSystem ? null : sender,
      text: body,
      isSystem: isSystem && !sender,
      isMedia,
      isDeleted,
      lineStart: i + 1,
    };
    messages.push(current);
  }

  // Resolve the date field order once, from the whole file.
  let dateOrder: WhatsAppParseResult['dateOrder'] = 'unknown';
  let order: 'DMY' | 'MDY' = 'DMY';
  if (sawDMY && sawMDY) {
    dateOrder = 'ambiguous';
    order = 'DMY';
    warnings.push(
      'Date field order is ambiguous (dates consistent with both DD/MM and MM/DD). Timestamps assume DD/MM — verify against the original.',
    );
  } else if (sawMDY) {
    dateOrder = 'MDY';
    order = 'MDY';
  } else if (sawDMY) {
    dateOrder = 'DMY';
    order = 'DMY';
  } else {
    dateOrder = 'unknown';
    order = 'DMY';
    warnings.push('Could not confirm date field order from the data; assuming DD/MM (Indian format).');
  }

  // Build timestamps now that the order is fixed.
  messages.forEach((msg, idx) => {
    const p = rawParts[idx];
    if (!p) {
      warnings.push(`Line ${msg.lineStart}: could not parse date/time from "${msg.rawTimestamp}"`);
      return;
    }
    const day = order === 'DMY' ? p.a : p.b;
    const month = order === 'DMY' ? p.b : p.a;
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      warnings.push(`Line ${p.line}: date "${msg.rawTimestamp}" is out of range under ${order} order`);
      return;
    }
    msg.timestamp = `${p.y}-${pad(month)}-${pad(day)}T${pad(p.h24)}:${pad(p.mm)}:${pad(p.ss)}`;
  });

  const detectedFormat: WhatsAppParseResult['detectedFormat'] =
    formats.size === 1 ? [...formats][0] : formats.size > 1 ? 'unknown' : 'unknown';
  if (formats.size > 1) warnings.push('Export mixes Android and iOS line formats — unusual; check the file.');
  if (messages.length === 0) warnings.push('No WhatsApp messages were recognised in this file.');

  const participants = [
    ...new Set(messages.filter((m) => m.sender).map((m) => m.sender as string)),
  ].sort();

  const stamped = messages.map((m) => m.timestamp).filter((t): t is string => !!t).sort();
  const dateRange = stamped.length ? { start: stamped[0], end: stamped[stamped.length - 1] } : null;

  const counts = {
    system: messages.filter((m) => m.isSystem).length,
    media: messages.filter((m) => m.isMedia).length,
    deleted: messages.filter((m) => m.isDeleted).length,
    content: messages.filter((m) => !m.isSystem && !m.isMedia && !m.isDeleted).length,
  };

  if (excludedCount > 0) {
    warnings.push(`${excludedCount} line(s) could not be attached to a message and were ignored.`);
  }

  return {
    messages,
    participants,
    dateRange,
    totalLines,
    excludedCount,
    counts,
    warnings,
    detectedFormat,
    dateOrder,
  };
}

/**
 * Apply participant aliases (real name -> label) to a parse result.
 * Returns a new result; does not mutate. Real names never leave with the
 * public export — this is where "Actual contact -> Supervisor A" happens.
 */
export function applyAliases(
  result: WhatsAppParseResult,
  aliases: Record<string, string>,
): WhatsAppParseResult {
  const map = new Map(Object.entries(aliases));
  const messages = result.messages.map((m) => ({
    ...m,
    sender: m.sender && map.has(m.sender) ? (map.get(m.sender) as string) : m.sender,
  }));
  const participants = [
    ...new Set(messages.filter((m) => m.sender).map((m) => m.sender as string)),
  ].sort();
  return { ...result, messages, participants };
}
