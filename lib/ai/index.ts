import { getConfig } from '@/lib/config';
import { createDemoProvider } from './demo';
import { createGeminiProvider } from './gemini';
import type { Provider } from './types';

let provider: Provider | null = null;

/** Returns the configured provider, or the offline demo provider. */
export function getProvider(): Provider {
  if (provider) return provider;
  const { ai } = getConfig();
  provider = ai.configured ? createGeminiProvider() : createDemoProvider();
  return provider;
}

export function resetProviderCache(): void {
  provider = null;
}

export * from './types';
