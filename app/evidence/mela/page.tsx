import type { Metadata } from 'next';
import Link from 'next/link';
import { MelaTemplateClient } from '@/components/mela-template-client';

export const metadata: Metadata = {
  title: 'Mela case template',
  description: 'Structured template for PM-GDS-MELA-2026-09-10. Template only — no real personal data.',
};

export default function MelaPage() {
  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="label-strong">Evidence · Mela workflow</p>
        <h1 className="mt-2 text-3xl">Mela case template</h1>
        <p className="mt-3 text-muted">
          Structured PRE-EVENT / EVENT-DAY / POST-EVENT capture for{' '}
          <code>PM-GDS-MELA-2026-09-10</code>. Template only — use aliases, never real names. For a
          single message use <Link href="/evidence/quick" className="underline">Quick Incident</Link>;
          for a full export use <Link href="/evidence/import" className="underline">Import</Link>.
        </p>
      </header>
      <MelaTemplateClient />
    </div>
  );
}
