/**
 * Incident timeline builder.
 *
 * Turns evidence items (+ optional manual events) into an ordered timeline,
 * grouped into PRE-EVENT / EVENT DAY / POST-EVENT relative to a case's central
 * event date. Each entry keeps its source, category, strength and a link back
 * to the underlying evidence.
 */

import type {
  EvidenceCategory,
  EvidenceItem,
  EvidenceStrength,
} from './types';

export interface TimelineEvent {
  id: string;
  /** ISO date or datetime. */
  at: string;
  /** Date-only key "YYYY-MM-DD" for grouping. */
  day: string;
  title: string;
  categories: EvidenceCategory[];
  evidenceStrength: EvidenceStrength;
  /** "evidence" (derived from an item) or "manual" (analyst-added). */
  kind: 'evidence' | 'manual';
  sourceId: string | null;
  evidenceItemId: string | null;
  speakerLabel: string | null;
  excerpt: string | null;
  phase: 'PRE_EVENT' | 'EVENT_DAY' | 'POST_EVENT' | 'UNDATED';
}

export interface ManualTimelineEvent {
  id: string;
  at: string;
  title: string;
  note?: string;
}

export interface Timeline {
  centralEventDate: string | null;
  events: TimelineEvent[];
  phases: {
    PRE_EVENT: TimelineEvent[];
    EVENT_DAY: TimelineEvent[];
    POST_EVENT: TimelineEvent[];
    UNDATED: TimelineEvent[];
  };
  range: { start: string; end: string } | null;
  /** Clusters of activity: >= `minCluster` dated events within `windowHours`. */
  clusters: Array<{ start: string; end: string; count: number; eventIds: string[] }>;
}

function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

function phaseFor(day: string, central: string | null): TimelineEvent['phase'] {
  if (!central) return 'UNDATED';
  const c = central.slice(0, 10);
  if (day < c) return 'PRE_EVENT';
  if (day > c) return 'POST_EVENT';
  return 'EVENT_DAY';
}

function itemTitle(item: EvidenceItem): string {
  const cat = item.category[0];
  const who = item.speakerLabel ? `${item.speakerLabel}: ` : '';
  const snippet = item.normalizedExcerpt.slice(0, 90);
  const label = cat ? cat.replace(/_/g, ' ').toLowerCase() : 'communication';
  return `${who}${snippet}${item.normalizedExcerpt.length > 90 ? '…' : ''}  (${label})`;
}

export function buildTimeline(
  items: EvidenceItem[],
  opts: {
    centralEventDate?: string | null;
    manualEvents?: ManualTimelineEvent[];
    clusterWindowHours?: number;
    minCluster?: number;
  } = {},
): Timeline {
  const central = opts.centralEventDate ?? null;
  const events: TimelineEvent[] = [];

  for (const item of items) {
    const at = item.timestamp;
    events.push({
      id: `ev_${item.id}`,
      at: at ?? '',
      day: at ? dayOf(at) : '',
      title: itemTitle(item),
      categories: item.category,
      evidenceStrength: item.evidenceStrength,
      kind: 'evidence',
      sourceId: item.sourceId,
      evidenceItemId: item.id,
      speakerLabel: item.speakerLabel,
      excerpt: item.normalizedExcerpt,
      phase: at ? phaseFor(dayOf(at), central) : 'UNDATED',
    });
  }

  for (const m of opts.manualEvents ?? []) {
    events.push({
      id: m.id,
      at: m.at,
      day: dayOf(m.at),
      title: m.title,
      categories: [],
      evidenceStrength: 'INSUFFICIENT',
      kind: 'manual',
      sourceId: null,
      evidenceItemId: null,
      speakerLabel: null,
      excerpt: m.note ?? null,
      phase: phaseFor(dayOf(m.at), central),
    });
  }

  // Order: dated events chronologically, undated last (stable by insertion).
  const dated = events.filter((e) => e.at).sort((a, b) => a.at.localeCompare(b.at));
  const undated = events.filter((e) => !e.at);
  const ordered = [...dated, ...undated];

  const phases = {
    PRE_EVENT: ordered.filter((e) => e.phase === 'PRE_EVENT'),
    EVENT_DAY: ordered.filter((e) => e.phase === 'EVENT_DAY'),
    POST_EVENT: ordered.filter((e) => e.phase === 'POST_EVENT'),
    UNDATED: ordered.filter((e) => e.phase === 'UNDATED'),
  };

  const range =
    dated.length > 0 ? { start: dated[0].at, end: dated[dated.length - 1].at } : null;

  // Clustering.
  const windowMs = (opts.clusterWindowHours ?? 48) * 3600_000;
  const minCluster = opts.minCluster ?? 3;
  const clusters: Timeline['clusters'] = [];
  let bucket: TimelineEvent[] = [];
  for (const e of dated) {
    if (bucket.length === 0) {
      bucket = [e];
      continue;
    }
    const spanMs = new Date(e.at).getTime() - new Date(bucket[0].at).getTime();
    if (spanMs <= windowMs) {
      bucket.push(e);
    } else {
      if (bucket.length >= minCluster) {
        clusters.push({
          start: bucket[0].at,
          end: bucket[bucket.length - 1].at,
          count: bucket.length,
          eventIds: bucket.map((b) => b.id),
        });
      }
      bucket = [e];
    }
  }
  if (bucket.length >= minCluster) {
    clusters.push({
      start: bucket[0].at,
      end: bucket[bucket.length - 1].at,
      count: bucket.length,
      eventIds: bucket.map((b) => b.id),
    });
  }

  return { centralEventDate: central, events: ordered, phases, range, clusters };
}
