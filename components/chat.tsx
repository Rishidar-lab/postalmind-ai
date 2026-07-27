'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, AlertCircle, RotateCcw, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
  error?: boolean;
}

const QUICK_PROMPTS = [
  'What is my annual leave as GDS ABPM?',
  'How do I file RTI for delayed TRCA?',
  'PMA monthly target for Branch Office?',
  'Explain Rule 6 GDS CE Rules 2020',
  'How to open IPPB account at BO?',
  'என் சம்பளம் தாமதம் — என்ன செய்வது?',
];

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Vanakkam! I am PostalMind AI, your assistant for India Post GDS matters. Ask me about CE Rules, RTI, BO workflows, or financial services. I can reply in Tamil or English.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { id: generateId(), role: 'user', content: text.trim() };
    const assistantMsg: Message = { id: generateId(), role: 'assistant', content: '', isLoading: true };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const apiMessages = [
        ...messages.filter((m) => !m.isLoading && !m.error).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: text.trim() },
      ];
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error (${res.status})`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream available');
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const chunk = JSON.parse(trimmed.slice(6));
              const delta = chunk.candidates?.[0]?.content?.parts?.[0]?.text || chunk.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
              if (delta) {
                fullContent += delta;
                setMessages((prev) => prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: fullContent, isLoading: true } : m)));
              }
            } catch {}
          }
        }
      }
      setMessages((prev) => prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: fullContent, isLoading: false } : m)));
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      const errMsg = err.message || 'Failed to get response. Please try again.';
      setError(errMsg);
      setMessages((prev) => prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: 'Sorry, I encountered an error. Please try again or rephrase your question.', isLoading: false, error: true } : m)));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); handleSend(input); };
  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([{ id: 'welcome-' + Date.now(), role: 'assistant', content: 'Vanakkam! I am PostalMind AI, your assistant for India Post GDS matters. Ask me about CE Rules, RTI, BO workflows, or financial services. I can reply in Tamil or English.' }]);
    setError(null); setInput('');
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <p className="text-[10px] font-bold tracking-[2px] text-violet-600 mb-2.5">LIVE DEMO</p>
        <h2 className="text-[clamp(22px,4vw,38px)] font-extrabold tracking-tight mb-2.5 font-display">Ask PostalMind anything</h2>
        <p className="text-white/40 text-sm leading-relaxed mb-4">Powered by Google Gemini — GDS rules, RTI help, BO procedures, financial services</p>
      </div>
      <div className="glass rounded-[18px] overflow-hidden border border-white/[0.075] flex flex-col max-h-[700px]">
        <div className="px-5 pt-5 pb-0">
          <p className="text-[11px] text-white/30 mb-2.5">💡 Try a question:</p>
          <div className="flex flex-wrap gap-[7px]">
            {QUICK_PROMPTS.map((prompt) => (
              <button key={prompt} onClick={() => handleSend(prompt)} disabled={isLoading} className="chip glass rounded-[18px] px-3 py-1.5 text-xs text-white/55 border border-white/[0.09] bg-transparent transition-all duration-200 text-left leading-snug cursor-pointer hover:text-white/75">{prompt}</button>
            ))}
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 min-h-[100px] max-h-[340px] flex flex-col gap-3.5">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-enter flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${msg.role === 'user' ? 'bg-violet-600/20 border border-violet-500/25 text-white/90' : msg.error ? 'bg-red-500/10 border border-red-500/20 text-red-300/80' : 'bg-white/[0.04] border border-white/[0.07] text-white/75'}`}>
                {msg.isLoading && msg.content === '' ? (
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="typing-dot w-1.5 h-1.5 rounded-full bg-violet-400/60" />
                    <span className="typing-dot w-1.5 h-1.5 rounded-full bg-violet-400/60" />
                    <span className="typing-dot w-1.5 h-1.5 rounded-full bg-violet-400/60" />
                  </div>
                ) : (<div className="whitespace-pre-wrap">{msg.content}</div>)}
                {msg.isLoading && msg.content !== '' && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="typing-dot w-1 h-1 rounded-full bg-violet-400/50" />
                    <span className="typing-dot w-1 h-1 rounded-full bg-violet-400/50" />
                    <span className="typing-dot w-1 h-1 rounded-full bg-violet-400/50" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {error && (
          <div className="px-5 pb-2">
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-300/80">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /><span>{error}</span>
            </div>
          </div>
        )}
        <div className="glass flex items-center gap-2 px-3.5 py-3 border-t border-white/[0.06]">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit(e)} placeholder="Ask about GDS leave rules, RTI, PMA targets, IPPB…" disabled={isLoading} className="chat-input flex-1 bg-transparent border-none text-slate-200 text-[13px] py-1.5 px-1 font-sans placeholder:text-white/20 focus:outline-none disabled:opacity-50" />
          <button onClick={clearChat} disabled={isLoading} title="Clear chat" className="p-2 rounded-lg text-white/30 hover:text-white/60 transition-colors disabled:opacity-30"><RotateCcw className="w-4 h-4" /></button>
          <button onClick={handleSubmit} disabled={isLoading || !input.trim()} className="btn-glow btn-cyan px-4 py-2 rounded-[9px] border border-cyan-500/40 bg-cyan-500/15 text-cyan-400 text-xs font-semibold cursor-pointer transition-all duration-200 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {isLoading ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
