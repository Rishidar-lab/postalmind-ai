import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { getProvider } from '@/lib/ai';
import { getStore } from '@/lib/store';
import { securityHeaders } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/health
 * Reports application status without revealing any secret. `?probe=ai` also
 * pings the AI provider (slower).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cfg = getConfig();
  const store = await getStore();

  let aiProbe: { ok: boolean; detail: string } | undefined;
  if (searchParams.get('probe') === 'ai') {
    aiProbe = await getProvider().health();
  }

  const body = {
    status: 'ok' as const,
    time: new Date().toISOString(),
    app: {
      env: cfg.appEnv,
      version: process.env.npm_package_version ?? '2.0.0',
      demoMode: cfg.demoMode,
    },
    ai: {
      configured: cfg.ai.configured,
      provider: cfg.ai.configured ? 'gemini' : 'demo',
      model: cfg.ai.configured ? cfg.ai.model : 'demo-extractive',
      ...(aiProbe ? { probe: aiProbe } : {}),
    },
    database: {
      configured: cfg.database.configured,
      driver: cfg.database.configured ? 'external' : 'none',
    },
    storage: {
      configured: cfg.storage.configured,
      driver: cfg.storage.driver,
      durable: store.durable,
    },
    sources: {
      count: (await import('@/content/sources')).SOURCES.length,
      corpusPassages: (await import('@/content/corpus')).CORPUS.length,
    },
  };

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'no-store', ...securityHeaders() },
  });
}
