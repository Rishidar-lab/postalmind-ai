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
    configured: boolean;
    model: string;
    /** Base URL for the Gemini generativelanguage API. */
    baseUrl: string;
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

  const geminiKey = process.env.GEMINI_API_KEY?.trim() || '';
  const dbUrl = process.env.DATABASE_URL?.trim() || '';

  const appEnvRaw = (process.env.APP_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV || 'development').toLowerCase();
  const appEnv: AppConfig['appEnv'] =
    appEnvRaw === 'production' ? 'production' : appEnvRaw === 'preview' ? 'preview' : 'development';

  cached = {
    appEnv,
    ai: {
      configured: geminiKey.length > 0,
      // Configurable; default kept current and overridable without a redeploy of code.
      model: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
      baseUrl:
        process.env.GEMINI_BASE_URL?.trim() ||
        'https://generativelanguage.googleapis.com/v1beta',
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
    demoMode: geminiKey.length === 0,
  };
  return cached;
}

/** For tests: forget the cached config. */
export function resetConfigCache(): void {
  cached = null;
}
