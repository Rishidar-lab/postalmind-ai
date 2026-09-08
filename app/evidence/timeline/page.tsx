import type { Metadata } from 'next';
import Link from 'next/link';
import { getStore } from '@/lib/store';
import { DEMO_CASE_ID } from '@/lib/store/seed';
import { buildTimeline } from '@/lib/evidence/timeline';
import { TimelineView } from '@/components/evidence-views';

export const metadata: Metadata = { title: 'Timeline analysis' };
export const dynamic = 'force-dynamic';

export default async function TimelinePage() {
  const store = await getStore();
  const c = await store.getCase(DEMO_CASE_ID);
  const items = c ? await store.listItems(DEMO_CASE_ID) : [];
  const timeline = buildTimeline(items, { centralEventDate: c?.eventDate ?? null });

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="label-strong">Evidence · Timeline</p>
        <h1 className="mt-2 text-3xl">Incident timeline</h1>
        <p className="mt-3 text-muted">
          Evidence items placed in order and grouped around the central event date. Activity
          clusters — several items in a short window — are flagged. Showing the seeded demo case{' '}
          <code>{DEMO_CASE_ID}</code>. To build one from your own export, use{' '}
          <Link href="/evidence/import" className="text-accent underline underline-offset-2">
            Import
          </Link>
          .
        </p>
      </header>
      {c ? <TimelineView timeline={timeline} /> : <p className="text-muted">Demo case not available.</p>}
    </div>
  );
}
