import { getConfig } from '@/lib/config';
import { createDemoProvider } from './demo';
import { createOpenRouterProvider } from './openrouter';
import type { Provider } from './types';

let provider: Provider | null = null;
let fallbackProvider: Provider | null | undefined; // undefined = not computed yet, null = none configured

/**
 * Returns the configured provider, or the offline demo provider.
 *
 * Preferred order: OpenRouter if OPENROUTER_API_KEY is set, otherwise the
 * deterministic source-only fallback. There is no automatic fallback to any
 * other model provider.
 */
export function getProvider(): Provider {
  if (provider) return provider;
  const { ai } = getConfig();
  provider = ai.configured ? createOpenRouterProvider() : createDemoProvider();
  return provider;
}

/**
 * The model-quality-gate's fallback provider (OPENROUTER_MODEL_FALLBACK), or
 * null if none is configured or the primary provider isn't OpenRouter. Used
 * by lib/ask/answer.ts to retry, at most once, when the primary model's
 * response is unusable for grounded QA — never to decide factual
 * verification status.
 */
export function getFallbackProvider(): Provider | null {
  if (fallbackProvider !== undefined) return fallbackProvider;
  const { ai } = getConfig();
  fallbackProvider = ai.configured && ai.fallbackModel ? createOpenRouterProvider(ai.fallbackModel) : null;
  return fallbackProvider;
}

export function resetProviderCache(): void {
  provider = null;
  fallbackProvider = undefined;
}

export * from './types';
