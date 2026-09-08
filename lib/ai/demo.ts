/**
 * Offline demo provider.
 *
 * Used when no external AI provider is configured. It does NOT generate free
 * text about GDS rules — that is exactly the hallucination risk we are removing.
 * Instead it returns a deterministic, extractive response built from whatever
 * grounded context the caller supplied in the system prompt, plus an explicit
 * note that the app is running without a language model.
 *
 * The source-grounded ASK path (lib/ask) does its own extractive answer; this
 * provider is the fallback for the plain chat endpoint.
 */

import { type GenerateOptions, type GenerateResult, type Provider } from './types';

const NOTE =
  'PostalMind is running in demo mode (no language model configured). ' +
  'It can only show you the source material it retrieved — it will not compose new claims about rules, ' +
  'circulars or rates. Configure OPENROUTER_API_KEY to enable drafting and explanation.';

export function createDemoProvider(): Provider {
  const generate = async (opts: GenerateOptions): Promise<GenerateResult> => {
    const lastUser = [...opts.turns].reverse().find((t) => t.role === 'user')?.content ?? '';
    // Pull any "SOURCE" blocks the caller embedded in the system prompt.
    const sourceBlock = /SOURCES?:\s*([\s\S]+)$/i.exec(opts.system)?.[1]?.trim();
    const body = sourceBlock
      ? `Here is the source material retrieved for: "${lastUser.slice(0, 200)}"\n\n${sourceBlock}`
      : `You asked: "${lastUser.slice(0, 200)}"\n\nNo source material was retrieved for this question.`;
    return {
      text: `${body}\n\n---\n${NOTE}`,
      provider: 'demo',
      model: 'demo-extractive',
      finishReason: 'STOP',
    };
  };

  async function* stream(opts: GenerateOptions): AsyncGenerator<string, void, unknown> {
    const { text } = await generate(opts);
    for (const chunk of text.match(/[\s\S]{1,48}/g) ?? [text]) {
      yield chunk;
      await new Promise((r) => setTimeout(r, 8));
    }
  }

  return {
    name: 'demo',
    model: 'demo-extractive',
    configured: true,
    generate,
    stream,
    health: async () => ({ ok: true, detail: 'demo provider (no external model)' }),
  };
}
