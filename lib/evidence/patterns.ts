/**
 * Target Pressure Analyzer 2.0 — pattern detection across time.
 *
 * The classifier (classify.ts) already labels individual messages into
 * factual evidence categories. This module looks at the SEQUENCE of those
 * categories across days and reports an observed pattern — e.g. a target
 * instruction, followed later by repeated individual pressure, followed
 * later still by peer comparison or public naming.
 *
 * This is deterministic (day-bucketed category lookups), not AI-based, and
 * it never concludes "harassment proven" or any other legal finding. Every
 * pattern carries PATTERN_DISCLAIMER, which the UI must always render next
 * to it.
 */

import type { EvidenceCategory, EvidenceItem } from './types';

export const PATTERN_DISCLAIMER =
  'This describes a pattern PostalMind observed in the sequence and timing of evidence items. It is not a legal conclusion, and it does not by itself establish harassment, misconduct or any rule violation. See /methodology.';

export interface ObservedPattern {
  id: string;
  label: string;
  /** Always starts with "OBSERVED PATTERN:" — never a conclusion like "Harassment proven". */
  description: string;
  dayCount: number;
  itemIds: string[];
  categoriesInvolved: EvidenceCategory[];
}

interface DayBucket {
  day: string; // YYYY-MM-DD
  categories: Set<EvidenceCategory>;
  itemIds: string[];
}

function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

function bucketsByDay(items: EvidenceItem[]): DayBucket[] {
  const map = new Map<string, DayBucket>();
  for (const item of items) {
    if (!item.timestamp) continue;
    const day = dayOf(item.timestamp);
    let b = map.get(day);
    if (!b) {
      b = { day, categories: new Set(), itemIds: [] };
      map.set(day, b);
    }
    for (const c of item.category) b.categories.add(c);
    b.itemIds.push(item.id);
  }
  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
}

function firstDayWith(buckets: DayBucket[], categories: EvidenceCategory[], after: string | null = null): DayBucket | null {
  return buckets.find((b) => (after === null || b.day > after) && categories.some((c) => b.categories.has(c))) ?? null;
}

function itemsForDays(buckets: DayBucket[], days: Set<string>): string[] {
  const ids: string[] = [];
  for (const b of buckets) if (days.has(b.day)) ids.push(...b.itemIds);
  return [...new Set(ids)];
}

/**
 * Deterministic pattern detection across the day-level sequence of
 * categories in `items`. Undated items are ignored — a pattern is
 * specifically about sequence and timing, which an undated item can't
 * contribute to.
 */
export function detectPatterns(items: EvidenceItem[]): ObservedPattern[] {
  const buckets = bucketsByDay(items);
  const patterns: ObservedPattern[] = [];
  if (buckets.length === 0) return patterns;

  // Rule 1 — escalating target pressure: target/performance communication,
  // later repeated individually, later still made comparative or public.
  // This is the mission's own worked example: Day1 target, Day2 reminder
  // (repeated pressure), Day3 peer comparison, Day4 public naming.
  {
    const stage1 = firstDayWith(buckets, ['TARGET_INSTRUCTION', 'PERFORMANCE_EXPECTATION']);
    const stage2 = stage1 && firstDayWith(buckets, ['REPEATED_TARGET_PRESSURE'], stage1.day);
    const stage3 = stage2 && firstDayWith(buckets, ['PEER_COMPARISON', 'PUBLIC_NAMING', 'PUBLIC_SHAMING'], stage2.day);
    if (stage1 && stage2 && stage3) {
      const days = new Set([stage1.day, stage2.day, stage3.day]);
      patterns.push({
        id: 'escalating-target-pressure',
        label: 'Repeated individual performance pressure',
        description:
          'OBSERVED PATTERN: Repeated individual performance pressure. A target or performance communication ' +
          `recurred as individually-directed pressure, then was followed by peer comparison or public naming, ` +
          `across ${days.size} separate days (${[...days].join(', ')}).`,
        dayCount: days.size,
        itemIds: itemsForDays(buckets, days),
        categoriesInvolved: ['TARGET_INSTRUCTION', 'PERFORMANCE_EXPECTATION', 'REPEATED_TARGET_PRESSURE', 'PEER_COMPARISON', 'PUBLIC_NAMING', 'PUBLIC_SHAMING'].filter(
          (c) => [stage1, stage2, stage3].some((s) => s!.categories.has(c as EvidenceCategory)),
        ) as EvidenceCategory[],
      });
    }
  }

  // Rule 2 — sustained after-hours contact: 3+ distinct days.
  {
    const days = buckets.filter((b) => b.categories.has('AFTER_HOURS_COMMUNICATION'));
    if (days.length >= 3) {
      const daySet = new Set(days.map((d) => d.day));
      patterns.push({
        id: 'sustained-after-hours',
        label: 'Repeated after-hours contact',
        description: `OBSERVED PATTERN: Repeated after-hours contact — work-related communication outside working hours occurred on ${daySet.size} separate days.`,
        dayCount: daySet.size,
        itemIds: itemsForDays(buckets, daySet),
        categoriesInvolved: ['AFTER_HOURS_COMMUNICATION'],
      });
    }
  }

  // Rule 3 — leave-related pressure co-occurring with target pressure within
  // a short (5-day) window either direction.
  {
    const leaveDays = buckets.filter((b) => b.categories.has('LEAVE_RELATED_PRESSURE'));
    const targetDays = buckets.filter((b) => b.categories.has('TARGET_INSTRUCTION') || b.categories.has('REPEATED_TARGET_PRESSURE'));
    const WINDOW_DAYS = 5;
    const linked = new Set<string>();
    for (const l of leaveDays) {
      for (const t of targetDays) {
        const diffDays = Math.abs((Date.parse(t.day) - Date.parse(l.day)) / 86_400_000);
        if (diffDays <= WINDOW_DAYS) {
          linked.add(l.day);
          linked.add(t.day);
        }
      }
    }
    if (linked.size > 0) {
      patterns.push({
        id: 'leave-linked-pressure',
        label: 'Target pressure linked to leave',
        description: `OBSERVED PATTERN: Target pressure linked to leave — leave-related pressure and target-related communication occurred within ${WINDOW_DAYS} days of each other, across ${linked.size} day(s).`,
        dayCount: linked.size,
        itemIds: itemsForDays(buckets, linked),
        categoriesInvolved: ['LEAVE_RELATED_PRESSURE', 'TARGET_INSTRUCTION', 'REPEATED_TARGET_PRESSURE'],
      });
    }
  }

  // Rule 4 — escalating threat-like language to an explicit threat or
  // retaliation reference.
  {
    const stage1 = firstDayWith(buckets, ['THREAT_LIKE_LANGUAGE']);
    const stage2 = stage1 && firstDayWith(buckets, ['EXPLICIT_THREAT', 'RETALIATION_REFERENCE'], stage1.day);
    if (stage1 && stage2) {
      const days = new Set([stage1.day, stage2.day]);
      patterns.push({
        id: 'escalating-threat-language',
        label: 'Escalating threat-like language',
        description: `OBSERVED PATTERN: Escalating threat-like language — language a reasonable reader could take as implying a consequence was followed by an explicit threat or a retaliation reference, across ${days.size} separate days.`,
        dayCount: days.size,
        itemIds: itemsForDays(buckets, days),
        categoriesInvolved: ['THREAT_LIKE_LANGUAGE', 'EXPLICIT_THREAT', 'RETALIATION_REFERENCE'],
      });
    }
  }

  // Rule 5 — generic recurrence fallback for any other non-neutral category
  // (abusive language, financial pressure, ...) not already covered above,
  // appearing on 3+ distinct days.
  {
    const covered = new Set(patterns.flatMap((p) => p.categoriesInvolved));
    const candidates: EvidenceCategory[] = ['ABUSIVE_LANGUAGE', 'FINANCIAL_PRESSURE', 'RETALIATION_REFERENCE', 'INSPECTION_REFERENCE'];
    for (const cat of candidates) {
      if (covered.has(cat)) continue;
      const days = buckets.filter((b) => b.categories.has(cat));
      if (days.length >= 3) {
        const daySet = new Set(days.map((d) => d.day));
        patterns.push({
          id: `recurring-${cat.toLowerCase()}`,
          label: `Repeated ${cat.replace(/_/g, ' ').toLowerCase()}`,
          description: `OBSERVED PATTERN: Repeated ${cat.replace(/_/g, ' ').toLowerCase()} — this category recurred across ${daySet.size} separate days.`,
          dayCount: daySet.size,
          itemIds: itemsForDays(buckets, daySet),
          categoriesInvolved: [cat],
        });
      }
    }
  }

  return patterns;
}
