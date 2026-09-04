import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Grievance drafting' };

export default function GrievanceToolPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <p className="label-strong">Tools · Grievance / representation</p>
      <h1 className="text-3xl">Grievance / representation drafting</h1>
      <p className="text-muted">
        This tool will build a structured administrative representation from evidence items you
        select in a case — factual chronology, the specific relief sought, and the supporting
        evidence list — with the same publication safety check applied before anything is shared
        outside the department.
      </p>
      <div className="card">
        <span className="chip chip-unknown">Planned</span>
        <p className="mt-2 text-[14px] text-muted">
          Not yet available. In the meantime, use{' '}
          <Link href="/evidence/import" className="text-accent underline underline-offset-2">
            Analyse evidence
          </Link>{' '}
          to build the chronology and{' '}
          <Link href="/tools/rti" className="text-accent underline underline-offset-2">
            RTI drafting
          </Link>{' '}
          if you need the underlying records first.
        </p>
      </div>
    </div>
  );
}
