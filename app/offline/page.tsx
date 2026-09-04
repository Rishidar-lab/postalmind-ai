import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Offline' };
export const dynamic = 'force-static';

export default function OfflinePage() {
  return (
    <div className="max-w-xl space-y-4">
      <p className="label-strong">Offline</p>
      <h1 className="text-3xl">No connection right now</h1>
      <p className="text-muted">
        PostalMind&rsquo;s local-only tools still work without a network connection, because they run
        and store data entirely on this device:
      </p>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li><Link href="/evidence/quick" className="text-accent underline underline-offset-2">Quick Incident</Link></li>
        <li><Link href="/evidence/vault" className="text-accent underline underline-offset-2">Local vault</Link></li>
        <li><Link href="/tools/workday" className="text-accent underline underline-offset-2">Workday log</Link></li>
      </ul>
      <p className="text-[13px] text-faint">
        Ask PostalMind, evidence import/publication checks against the server, and anything else that
        needs a network request will work again once you&rsquo;re back online.
      </p>
    </div>
  );
}
