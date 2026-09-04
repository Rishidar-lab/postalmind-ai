import { getConfig } from '@/lib/config';
import { createDemoProvider } from './demo';
import { createOpenRouterProvider } from './openrouter';
import type { Provider } from './types';

let provider: Provider | null = null;

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

export function resetProviderCache(): void {
  provider = null;
}

export * from './types';
