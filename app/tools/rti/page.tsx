import type { Metadata } from 'next';
import { RtiClient } from '@/components/rti-client';

export const metadata: Metadata = {
  title: 'RTI drafting',
  description: 'Generate a properly formatted RTI application under the RTI Act 2005. Deterministic template — no AI.',
};

export default function RtiToolPage() {
  return (
    <div className="space-y-5">
      <header className="max-w-2xl">
        <p className="label-strong">Tools · RTI drafting</p>
        <h1 className="mt-2 text-3xl">RTI application draft</h1>
        <p className="mt-3 text-muted">
          Fill in what you can. The draft updates live using a fixed template — no language model, so
          the output is predictable. Placeholders in <code>[brackets]</code> are for you to complete.
          Review it against the linked{' '}
          <a
            href="https://rti.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2"
          >
            RTI Act
          </a>{' '}
          before filing.
        </p>
      </header>
      <RtiClient />
    </div>
  );
}
