import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { getFallbackProvider, getProvider, probeModelUsability } from '@/lib/ai';
import { getStore } from '@/lib/store';
import { securityHeaders } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/health
 * Reports application status without revealing any secret. `?probe=ai` also
 * pings the AI provider AND runs the model-usability probe (slower, spends
 * one tiny completion): the answer engine only trusts a model as composer
 * after it demonstrates chat output + JSON + citation-following.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cfg = getConfig();
  const store = await getStore();
  const { SOURCES } = await import('@/content/sources');
  const { CORPUS } = await import('@/content/corpus');

  let aiProbe: { ok: boolean; detail: string } | undefined;
  let primaryUsable: { usable: boolean; detail: string; model: string | null } | undefined;
  let fallbackUsable: { usable: boolean; detail: string; model: string | null } | undefined;
  if (searchParams.get('probe') === 'ai') {
    aiProbe = await getProvider().health();
    primaryUsable = await probeModelUsability(getProvider());
    const fallback = getFallbackProvider();
    fallbackUsable = fallback ? await probeModelUsability(fallback) : { usable: false, detail: 'no fallback model configured', model: null };
  }

  const verifiedSources = SOURCES.filter((s) => s.status === 'VERIFIED');
  const verifiedPassages = CORPUS.filter((p) => p.status === 'VERIFIED');

  const body = {
    status: 'ok' as const,
    time: new Date().toISOString(),
    app: {
      env: cfg.appEnv,
      version: process.env.npm_package_version ?? '2.0.0',
      demoMode: cfg.demoMode,
    },
    ai: {
      provider: cfg.ai.provider,
      configured: cfg.ai.configured,
      model: cfg.ai.configured ? cfg.ai.model : 'demo-extractive',
      primaryModel: cfg.ai.configured ? cfg.ai.model : null,
      fallbackModel: cfg.ai.fallbackModel,
      mode: cfg.ai.configured ? 'model-assisted' : 'source-only',
      ...(aiProbe ? { probe: aiProbe } : {}),
      ...(primaryUsable ? { primaryUsable } : {}),
      ...(fallbackUsable ? { fallbackUsable } : {}),
    },
    answerEngine: {
      verifiedSources: verifiedSources.length,
      verifiedPassages: verifiedPassages.length,
      composer: cfg.ai.configured ? 'openrouter-json+deterministic-gate' : 'disabled (source-only)',
      verifier: cfg.ai.configured ? 'advisory-batched-downgrade-only' : 'disabled (source-only)',
      deterministicFallback: 'intent+sentence-extraction+claim-gate',
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
      count: SOURCES.length,
      corpusPassages: CORPUS.length,
    },
  };

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'no-store', ...securityHeaders() },
  });
}
