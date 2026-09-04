import { NextResponse } from 'next/server';
import { listPassages, listSources } from '@/lib/sources/registry';
import { securityHeaders } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const sources = listSources();
  const passages = listPassages();
  const byStatus = sources.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});
  return NextResponse.json(
    {
      sources,
      passageCount: passages.length,
      byStatus,
      note: 'VERIFIED = checked against the primary document by a maintainer. UNVERIFIED = project summary. DEMO = illustrative only.',
    },
    { headers: securityHeaders() },
  );
}
