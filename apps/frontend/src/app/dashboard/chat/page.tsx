'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useTranslations } from '@/lib/translations';
import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Trash2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { gsap } from 'gsap';

function AnimatedMessage({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(ref.current,
        { opacity: 0, y: 10, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'power2.out' }
      );
    }
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}

export default function ChatPage() {
  const t = useTranslations('admin.chat');
  const SUGGESTIONS = [
    { icon: '🛍️', text: t('suggestion1') },
    { icon: '📦', text: t('suggestion2') },
    { icon: '🚚', text: t('suggestion3') },
    { icon: '↩️', text: t('suggestion4') },
    { icon: '💳', text: t('suggestion5') },
  ];
  const { messages, sendMessage, setMessages, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const [input, setInput] = useState('');
  const isLoading = status === 'submitted' || status === 'streaming';
  const bottomRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current,
        { opacity: 0, y: -16 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
      );
    }
    if (inputAreaRef.current) {
      gsap.fromTo(inputAreaRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.45, delay: 0.1, ease: 'power2.out' }
      );
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput('');
  };

  return (
    <div className="flex h-[calc(100vh-16rem)] flex-col gap-4">
      {/* Header */}
      <div
        ref={headerRef}
        className="flex items-center justify-between rounded-2xl px-5 py-4"
        style={{
          background: 'linear-gradient(135deg, rgba(0,168,181,0.14) 0%, rgba(0,80,100,0.07) 100%)',
          border: '1px solid rgba(0,168,181,0.2)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
            style={{ background: 'linear-gradient(135deg, #00a8b5, #007a85)' }}
          >
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold leading-tight">{t('title')}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {t('onlineStatus')}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('clearBtn')}
          </button>
        )}
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto rounded-2xl p-5"
        style={{
          background: 'rgba(0,0,0,0.1)',
          border: '1px solid rgba(0,168,181,0.1)',
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="relative">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: 'linear-gradient(135deg, rgba(0,168,181,0.2), rgba(0,80,100,0.1))' }}
              >
                <Sparkles className="h-8 w-8" style={{ color: '#00a8b5' }} />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: '#00a8b5' }}
                />
                <span
                  className="relative inline-flex rounded-full h-3.5 w-3.5"
                  style={{ background: '#00a8b5' }}
                />
              </span>
            </div>
            <div>
              <p className="text-base font-semibold mb-1">{t('emptyHeading')}</p>
              <p className="text-sm text-muted-foreground">{t('empty')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => sendMessage({ text: s.text })}
                  className="flex items-center gap-2.5 text-left text-sm px-4 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: 'rgba(0,168,181,0.07)',
                    border: '1px solid rgba(0,168,181,0.15)',
                  }}
                >
                  <span className="text-base shrink-0">{s.icon}</span>
                  <span className="truncate text-sm">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const text = msg.parts
                .filter((p: any) => p.type === 'text')
                .map((p: any) => p.text)
                .join('');
              return (
                <AnimatedMessage
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl mt-0.5"
                      style={{ background: 'linear-gradient(135deg, #00a8b5, #007a85)' }}
                    >
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className="max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                    style={
                      isUser
                        ? {
                            background: 'linear-gradient(135deg, #00a8b5, #007a85)',
                            color: 'white',
                            borderBottomRightRadius: '4px',
                          }
                        : {
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderBottomLeftRadius: '4px',
                          }
                    }
                  >
                    {isUser ? (
                      <p>{text}</p>
                    ) : (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{text}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {isUser && (
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl mt-0.5"
                      style={{
                        background: 'rgba(0,168,181,0.12)',
                        border: '1px solid rgba(0,168,181,0.2)',
                      }}
                    >
                      <User className="h-4 w-4" style={{ color: '#00a8b5' }} />
                    </div>
                  )}
                </AnimatedMessage>
              );
            })}

            {isLoading && (
              <div className="flex gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #00a8b5, #007a85)' }}
                >
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div
                  className="flex items-center gap-1.5 rounded-2xl px-4 py-3"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderBottomLeftRadius: '4px',
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="inline-block w-2 h-2 rounded-full animate-bounce"
                      style={{ background: '#00a8b5', animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form ref={inputAreaRef} onSubmit={handleSubmit} className="flex gap-3">
        <div
          className="flex-1 flex items-center rounded-2xl px-4 transition-all duration-200 focus-within:border-althea-cta/50"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(0,168,181,0.18)',
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e as any);
            }}
            placeholder={t('placeholder')}
            className="flex-1 bg-transparent py-3.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none disabled:opacity-50"
            disabled={isLoading}
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-30"
          style={{ background: 'linear-gradient(135deg, #00a8b5, #007a85)' }}
        >
          <Send className="h-4 w-4 text-white" />
        </button>
      </form>
    </div>
  );
}
