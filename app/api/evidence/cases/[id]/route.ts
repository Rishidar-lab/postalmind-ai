import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { buildTimeline } from '@/lib/evidence/timeline';
import { caseStrengthSummary } from '@/lib/evidence/strength';
import { jsonError, securityHeaders } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const store = await getStore();
  const caseRecord = await store.getCase(params.id);
  if (!caseRecord) return jsonError('not_found', 'Case not found.', 404);

  const [sources, items, audit] = await Promise.all([
    store.listSources(params.id),
    store.listItems(params.id),
    store.listAudit(params.id),
  ]);

  const timeline = buildTimeline(items, { centralEventDate: caseRecord.eventDate });
  const strength = caseStrengthSummary(items);

  // Category tally for the pattern view.
  const categories: Record<string, number> = {};
  for (const it of items) for (const c of it.category) categories[c] = (categories[c] ?? 0) + 1;

  return NextResponse.json(
    {
      case: caseRecord,
      sources,
      items,
      timeline,
      strength,
      categories,
      audit,
      durable: store.durable,
    },
    { headers: securityHeaders() },
  );
}
