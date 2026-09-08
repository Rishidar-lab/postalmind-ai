import { SourceStatusChip } from './chips';

/**
 * A reusable, individually-linkable claim card for Ground Reality (and any
 * future public claim). Every field here is deliberately visible — nothing
 * is established or hidden by omission.
 */
export interface ClaimCardData {
  /** Anchor id — the card is linkable at #<id>. */
  id: string;
  n?: string;
  title: string;
  summary?: string;
  claim: string;
  status: 'VERIFIED' | 'UNVERIFIED' | 'DEMO';
  sourceClass: string;
  source: string;
  sourceUrl: string | null;
  date: string | null;
  qualification: string;
  /** The Department's, a union's, or any other counter/clarifying position, if one is on record. Null = none recorded (not "none exists"). */
  counterPosition: string | null;
  establishes: string;
  doesNotEstablish: string;
  /** When a maintainer last checked this against the primary document. Null = not yet verified. */
  lastVerified: string | null;
}

export function ClaimCard({ data }: { data: ClaimCardData }) {
  return (
    <li id={data.id} className="card scroll-mt-20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {data.n && <p className="font-mono text-[12px] text-faint">{data.n}</p>}
          <h2 className="mt-0.5 text-lg">
            <a href={`#${data.id}`} className="hover:underline">
              {data.title}
            </a>
          </h2>
          {data.summary && <p className="mt-1 text-[14px] text-muted">{data.summary}</p>}
        </div>
        <SourceStatusChip value={data.status} />
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="label-strong">Claim</dt>
          <dd className="mt-1 text-ink">{data.claim}</dd>
        </div>
        <div>
          <dt className="label-strong">Source class</dt>
          <dd className="mt-1 text-muted">{data.sourceClass}</dd>
        </div>
        <div>
          <dt className="label-strong">Source</dt>
          <dd className="mt-1 text-muted">
            {data.sourceUrl ? (
              <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
                {data.source}
              </a>
            ) : (
              data.source
            )}
          </dd>
        </div>
        <div>
          <dt className="label-strong">Date</dt>
          <dd className="mt-1 text-muted">{data.date ?? 'not dated in source'}</dd>
        </div>
        <div>
          <dt className="label-strong">Last verified</dt>
          <dd className="mt-1 text-muted">{data.lastVerified ?? 'Not yet verified against the primary document'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="label-strong">Qualification</dt>
          <dd className="mt-1 text-muted">{data.qualification}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="label-strong">Department / counter position</dt>
          <dd className="mt-1 text-muted">{data.counterPosition ?? 'None recorded.'}</dd>
        </div>
        <div>
          <dt className="label-strong text-[var(--ok)]">What is established</dt>
          <dd className="mt-1 text-muted">{data.establishes}</dd>
        </div>
        <div>
          <dt className="label-strong text-[var(--warn)]">What is NOT established</dt>
          <dd className="mt-1 text-muted">{data.doesNotEstablish}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] text-faint">
        <a href={`#${data.id}`} className="underline underline-offset-2">
          Permalink to this claim
        </a>
      </p>
    </li>
  );
}
