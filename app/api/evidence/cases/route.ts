import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { makeAuditEntry } from '@/lib/evidence/audit';
import { clientId, jsonError, readJsonBounded, securityHeaders } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import type { Case } from '@/lib/evidence/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const store = await getStore();
  const cases = await store.listCases();
  return NextResponse.json({ cases, durable: store.durable }, { headers: securityHeaders() });
}

export async function POST(req: Request) {
  const limit = rateLimit(clientId(req), 20);
  if (!limit.allowed) return jsonError('rate_limited', 'Rate limit exceeded.', 429);

  const parsed = await readJsonBounded<{ title?: string; description?: string; eventDate?: string; tags?: string[] }>(req);
  if (!parsed.ok) return parsed.response;

  const title = String(parsed.data.title ?? '').trim().slice(0, 200);
  if (title.length < 3) return jsonError('bad_request', 'A case title is required.', 400);

  const store = await getStore();
  const id = `case-${Date.now().toString(36)}`;
  const input: Omit<Case, 'createdAt' | 'updatedAt' | 'sourceCount' | 'evidenceItemCount'> = {
    id,
    title,
    description: String(parsed.data.description ?? '').slice(0, 4000),
    status: 'DRAFT',
    confidentialityLevel: 'STANDARD',
    eventDate: parsed.data.eventDate ?? null,
    tags: Array.isArray(parsed.data.tags) ? parsed.data.tags.slice(0, 12).map(String) : [],
    isDemo: false,
  };
  const created = await store.createCase(input);
  await store.appendAudit(makeAuditEntry('CASE_CREATED', `Case ${id} created`, { caseId: id }));

  return NextResponse.json(
    {
      case: created,
      durable: store.durable,
      warning: store.durable ? undefined : 'This store is not durable — the case will be lost on restart. Configure a database for persistence.',
    },
    { status: 201, headers: securityHeaders() },
  );
}
