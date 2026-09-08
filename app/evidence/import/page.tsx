import type { Metadata } from 'next';
import { ImportClient } from '@/components/import-client';

export const metadata: Metadata = {
  title: 'Import evidence',
  description:
    'Analyse a WhatsApp chat export locally: parse, classify each message into evidence categories, rate strength, build a timeline, and preview redaction.',
};

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="label-strong">Evidence · Import</p>
        <h1 className="mt-2 text-3xl">Analyse a WhatsApp export</h1>
        <p className="mt-3 text-muted">
          This runs entirely in your request. The chat text is <strong>not stored</strong> and{' '}
          <strong>not sent to any AI provider</strong>. Parsing, classification, PII detection and
          hashing all happen locally. Classifications are evidence categories — not findings of
          misconduct.
        </p>
      </header>
      <ImportClient />
    </div>
  );
}
