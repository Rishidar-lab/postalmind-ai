export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateOptions {
  system: string;
  turns: ChatTurn[];
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

export type ProviderErrorKind =
  | 'not_configured'
  | 'timeout'
  | 'rate_limited'
  | 'auth'
  | 'payment_required'
  | 'bad_request'
  | 'upstream'
  | 'network'
  | 'blocked'
  | 'empty';

export class ProviderError extends Error {
  kind: ProviderErrorKind;
  /** HTTP status to surface to the client. */
  status: number;
  retryable: boolean;
  constructor(kind: ProviderErrorKind, message: string, status = 502, retryable = false) {
    super(message);
    this.name = 'ProviderError';
    this.kind = kind;
    this.status = status;
    this.retryable = retryable;
  }
}

export interface GenerateResult {
  text: string;
  provider: string;
  model: string;
  finishReason: string | null;
  /** Rough token accounting if the provider returns it. */
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface Provider {
  readonly name: string;
  readonly model: string;
  readonly configured: boolean;
  generate(opts: GenerateOptions): Promise<GenerateResult>;
  /** Streams text deltas. Falls back to a single chunk if streaming is unavailable. */
  stream?(opts: GenerateOptions): AsyncGenerator<string, void, unknown>;
  /** Lightweight liveness probe; never throws. */
  health(): Promise<{ ok: boolean; detail: string }>;
}
