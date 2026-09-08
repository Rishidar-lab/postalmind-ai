import type { Metadata } from 'next';
import { WorkdayClient } from '@/components/workday-client';

export const metadata: Metadata = {
  title: 'Workday log',
  description: 'A local, factual day-by-day work record — scheduled vs actual hours, duties, and after-hours communication.',
};

export default function WorkdayPage() {
  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="label-strong">Tools · Workday log</p>
        <h1 className="mt-2 text-3xl">What happened today?</h1>
        <p className="mt-3 text-muted">
          A day-by-day record of scheduled vs. actual hours, duties across mail, branch, financial and
          business/Mela work, travel, and any after-hours communication. Stored only on this device.
          PostalMind generates a factual weekly chronology from it — it draws no legal conclusion
          automatically.
        </p>
      </header>
      <WorkdayClient />
    </div>
  );
}
