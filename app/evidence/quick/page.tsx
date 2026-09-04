import type { Metadata } from 'next';
import { QuickIncidentClient } from '@/components/quick-incident-client';

export const metadata: Metadata = {
  title: 'Quick Incident',
  description: 'Record one workplace communication in under 30 seconds. Local-only, no upload.',
};

export default function QuickPage() {
  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="label-strong">Evidence · Quick Incident</p>
        <h1 className="mt-2 text-3xl">Record an incident</h1>
        <p className="mt-3 text-muted">
          One excerpt, a few taps, done. Classification runs on this device — nothing is sent
          anywhere. For a full chat export, use Import instead.
        </p>
      </header>
      <QuickIncidentClient />
    </div>
  );
}
