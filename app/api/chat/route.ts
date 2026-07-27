import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const SYSTEM_PROMPT = `You are PostalMind AI, an expert assistant built specifically for India Post GDS (Gramin Dak Sevak) officers and Branch Postmasters.

Your knowledge covers:
- GDS CE Rules 2020 (Conduct, Engagement, Leave, Disciplinary rules)
- RTI drafting and filing procedures
- Branch Office (BO) daily workflows and PMA targets
- India Post financial services: IPPB, PLI, RPLI, NSC, SSA, MIS, RD, TD
- DOPT orders and postal circulars
- Service conditions and TRCA matters

Guidelines:
- Always provide accurate, cited information. When citing rules, mention the specific rule number and document name.
- For RTI drafting, include the complete application format with placeholders for personal details.
- For financial products, include current interest rates (approximate if exact is unavailable) and eligibility criteria.
- Respond in Tamil if the user asks in Tamil. Respond in English if the user asks in English.
- Keep responses concise but complete. Use bullet points and numbered lists for clarity.
- If you are uncertain about a specific rule or rate, say so clearly and suggest where the user can verify.
- Be respectful and professional — you are serving government employees who serve rural India.

Current context: The user is a GDS officer or Branch Postmaster seeking assistance with their official duties.`;

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function buildGeminiPayload(messages: ChatMessage[]) {
  const contents = messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));
  return {
    contents,
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
  };
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = rateLimit(ip);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again in a minute.' }, { status: 429, headers: { 'X-RateLimit-Reset': String(limit.resetAt) } });
    }
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: 'Invalid request body. Provide a messages array.' }, { status: 400 });
    }
    const messages: ChatMessage[] = body.messages.map((m: any) => ({
      role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 4000),
    }));
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured. Please set GEMINI_API_KEY environment variable.' }, { status: 503 });
    }
    const payload = buildGeminiPayload(messages);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Gemini API error:', errorData);
      return NextResponse.json({ error: 'AI service temporarily unavailable. Please try again later.' }, { status: 503 });
    }
    if (!res.body) {
      return NextResponse.json({ error: 'No response stream available.' }, { status: 503 });
    }
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Provider': 'gemini',
      'X-RateLimit-Remaining': String(limit.remaining),
    });
    return new Response(res.body, { status: 200, headers });
  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({ error: 'Internal server error. Please try again later.' }, { status: 500 });
  }
}
