/**
 * Central runtime configuration.
 *
 * Every secret is read from the environment server-side only. Nothing here is
 * exposed to the client bundle (no NEXT_PUBLIC_*). If a capability is not
 * configured, the app runs in a clearly-labelled DEMO mode rather than
 * pretending it works.
 */

export interface AppConfig {
  appEnv: 'development' | 'preview' | 'production';
  ai: {
    /** 'openrouter' when a key is configured, otherwise the deterministic 'demo' provider. */
    provider: 'openrouter' | 'demo';
    configured: boolean;
    model: string;
    /**
     * Optional second model for the quality gate (lib/ask/answer.ts): if the
     * primary model's response is rejected as unusable for grounded QA, this
     * is tried once before degrading to the deterministic source-only
     * answer. Null when OPENROUTER_MODEL_FALLBACK is not set — the gate
     * still rejects a bad response, it just has nothing to retry with.
     */
    fallbackModel: string | null;
    /** Base URL for the OpenRouter chat-completions API. */
    baseUrl: string;
    /** Optional attribution headers OpenRouter uses for free-tier routing/analytics. */
    siteUrl: string | null;
    appName: string;
    requestTimeoutMs: number;
    maxRetries: number;
  };
  database: {
    configured: boolean;
    url: string | null;
  };
  storage: {
    configured: boolean;
    driver: 'memory' | 'filesystem';
  };
  limits: {
    maxUploadBytes: number;
    maxMessages: number;
    maxMessageChars: number;
    maxRequestBytes: number;
  };
  /** Salt for hashing IP addresses / identifiers in logs. */
  hashSalt: string;
  /** True when NO external AI provider is configured — the app answers from the local corpus only. */
  demoMode: boolean;
}

function int(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cached) return cached;

  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim() || '';
  const dbUrl = process.env.DATABASE_URL?.trim() || '';

  const appEnvRaw = (process.env.APP_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV || 'development').toLowerCase();
  const appEnv: AppConfig['appEnv'] =
    appEnvRaw === 'production' ? 'production' : appEnvRaw === 'preview' ? 'preview' : 'development';

  cached = {
    appEnv,
    ai: {
      provider: openRouterKey.length > 0 ? 'openrouter' : 'demo',
      configured: openRouterKey.length > 0,
      // Deliberately NOT hard-coded to one free model: OpenRouter picks among
      // currently-available free models for "openrouter/free", and an explicit
      // "provider/model:free" variant can be set without a code change.
      // OPENROUTER_MODEL_PRIMARY takes precedence over OPENROUTER_MODEL if both
      // are set, so existing deployments keep working unchanged.
      model: process.env.OPENROUTER_MODEL_PRIMARY?.trim() || process.env.OPENROUTER_MODEL?.trim() || 'openrouter/free',
      fallbackModel: process.env.OPENROUTER_MODEL_FALLBACK?.trim() || null,
      baseUrl: process.env.OPENROUTER_BASE_URL?.trim() || 'https://openrouter.ai/api/v1',
      siteUrl: process.env.OPENROUTER_SITE_URL?.trim() || null,
      appName: process.env.OPENROUTER_APP_NAME?.trim() || 'PostalMind AI',
      requestTimeoutMs: int('AI_REQUEST_TIMEOUT_MS', 30_000),
      maxRetries: int('AI_MAX_RETRIES', 1),
    },
    database: {
      configured: dbUrl.length > 0,
      url: dbUrl || null,
    },
    storage: {
      configured: false,
      driver: 'memory',
    },
    limits: {
      maxUploadBytes: int('MAX_UPLOAD_SIZE', 5 * 1024 * 1024),
      maxMessages: int('MAX_MESSAGES', 40),
      maxMessageChars: int('MAX_MESSAGE_CHARS', 6_000),
      maxRequestBytes: int('MAX_REQUEST_BYTES', 512 * 1024),
    },
    hashSalt: process.env.HASH_SALT?.trim() || 'postalmind-dev-salt',
    demoMode: openRouterKey.length === 0,
  };
  return cached;
}

/** For tests: forget the cached config. */
export function resetConfigCache(): void {
  cached = null;
}
