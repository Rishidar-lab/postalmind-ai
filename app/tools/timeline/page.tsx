import type { Metadata } from 'next';
import { ImportClient } from '@/components/import-client';

export const metadata: Metadata = { title: 'Incident timeline generator' };

export default function TimelineToolPage() {
  return (
    <div className="space-y-5">
      <header className="max-w-2xl">
        <p className="label-strong">Tools · Incident timeline</p>
        <h1 className="mt-2 text-3xl">Build an incident timeline</h1>
        <p className="mt-3 text-muted">
          Paste a WhatsApp export and set the central event date. PostalMind parses it locally,
          classifies each message, and lays out a PRE-EVENT / EVENT-DAY / POST-EVENT timeline. Nothing
          is stored or sent to an AI provider.
        </p>
      </header>
      <ImportClient />
    </div>
  );
}
