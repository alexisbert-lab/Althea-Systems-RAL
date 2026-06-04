'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { usePathname } from 'next/navigation';
import { X, Send, Trash2, Bot, Sparkles, UserCircle } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useTheme } from 'next-themes';
import { useLocale, useTranslations } from '@/lib/translations';
import { useAuthentificationStore } from '@/stores/authentification-store';
import Lottie from 'lottie-react';
import chatNoir from '../../public/lottie/chat-noir.json';
import chatBlanc from '../../public/lottie/chat-blanc.json';
import chatArabe from '../../public/lottie/chat-arabe.json';

type CatVariant = 'white' | 'black' | 'dynamite';

const CAT_ANIMATIONS: Record<CatVariant, object> = {
  white: chatBlanc,
  black: chatNoir,
  dynamite: chatArabe,
};

function Cat3D({ size = 44, variant = 'black' }: { size?: number; variant?: CatVariant }) {
  return (
    <Lottie
      animationData={CAT_ANIMATIONS[variant]}
      loop
      autoplay
      style={{ width: size, height: size }}
    />
  );
}

type EscalationState = null | 'form' | 'sending' | 'sent';

export function BulleChat() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const locale = useLocale();
  const t = useTranslations('chat');
  const { user, token } = useAuthentificationStore();

  const SUGGESTIONS = [t('suggestion1'), t('suggestion2'), t('suggestion3'), t('suggestion4')];

  // next-themes : resolvedTheme est undefined côté SSR → attendre le mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const catVariant: CatVariant = locale === 'ar' ? 'dynamite' : resolvedTheme === 'light' ? 'white' : 'black';

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [escalation, setEscalation] = useState<EscalationState>(null);
  const [escalationForm, setEscalationForm] = useState({ name: '', email: '', message: '' });
  const [conversationId] = useState(() => Math.random().toString(36).slice(2) + Date.now().toString(36));
  const prevStatusRef = useRef<string>('ready');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Save messages to backend when streaming finishes (authenticated users only)
  useEffect(() => {
    if (prevStatusRef.current === 'streaming' && status === 'ready' && token && messages.length >= 2) {
      const reversed = [...messages].reverse();
      const assistantMsg = reversed.find((m) => m.role === 'assistant');
      const userMsg = reversed.find((m) => m.role === 'user');
      const getText = (m: any) =>
        m?.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') ?? m?.content ?? '';

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

      if (userMsg) {
        fetch(`${apiUrl}/api/chat/messages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ conversationId, role: 'user', content: getText(userMsg) }),
        }).catch(() => {});
      }
      if (assistantMsg) {
        fetch(`${apiUrl}/api/chat/messages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ conversationId, role: 'assistant', content: getText(assistantMsg) }),
        }).catch(() => {});
      }
    }
    prevStatusRef.current = status;
  }, [status, token, conversationId, messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when opened + pre-fill escalation form
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setEscalationForm((f) => ({
        ...f,
        name: f.name || user?.name || '',
        email: f.email || user?.email || '',
      }));
    }
  }, [open, user]);

  // Hide on dashboard (sidebar has chat already)
  if (pathname.startsWith('/dashboard')) return null;
  // Pas de rendu avant hydration : resolvedTheme et locale peuvent différer SSR/client
  if (!mounted) return null;

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setInputValue('');
    sendMessage({ text });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalationForm.email || !escalationForm.name) return;
    setEscalation('sending');

    const getText = (m: any) =>
      m?.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') ?? m?.content ?? '';

    const conversationSummary = messages
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${getText(m)}`)
      .join('\n');

    const messageBody = escalationForm.message
      ? `${escalationForm.message}\n\n--- Extrait de la conversation ---\n${conversationSummary}`
      : `Demande d'assistance humaine suite à une conversation avec le chatbot.\n\n--- Extrait de la conversation ---\n${conversationSummary}`;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      // Fetch CSRF token
      const csrfRes = await fetch(`${apiUrl}/api/csrf/token`).then((r) => r.json()).catch(() => ({}));
      const csrfToken = csrfRes.csrfToken || '';
      await fetch(`${apiUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({
          name: escalationForm.name,
          email: escalationForm.email,
          subject: 'Escalade chatbot — demande d\'assistance humaine',
          message: messageBody,
        }),
      });
      setEscalation('sent');
    } catch {
      setEscalation('form');
    }
  };

  return (
    <>
      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t('closeLabel') : t('openLabel')}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center text-white transition-all duration-300 hover:scale-110 focus-visible:outline-none"
        style={{
          width: 62,
          height: 68,           /* +6px pour la queue de bulle */
          paddingBottom: 6,     /* décale le chat vers le haut dans la bulle */
          background: '#33bfc9',
          /* Bulle de discussion : rect arrondi + queue bas-droite */
          clipPath: 'path("M10,0 Q0,0 0,10 L0,48 Q0,58 10,58 L32,58 L38,68 L44,58 L52,58 Q62,58 62,48 L62,10 Q62,0 52,0 Z")',
          filter: open
            ? 'drop-shadow(0 3px 8px rgba(51,191,201,0.3))'
            : 'drop-shadow(0 4px 14px rgba(51,191,201,0.55)) drop-shadow(0 0 20px rgba(51,191,201,0.3))',
        }}
      >
        {/* pulse ring when closed — suit la forme bubble via outline */}
        {!open && (
          <span className="absolute inset-0 animate-ping opacity-40 rounded-2xl"
            style={{ background: 'rgba(51,191,201,0.35)' }} />
        )}
        {/* reflet spéculaire haut */}
        <span className="absolute left-2 top-1.5 right-2 h-5 rounded-full opacity-20"
          style={{ background: 'linear-gradient(to bottom, white, transparent)' }} />

        <span
          className="relative transition-all duration-300"
          style={{ transform: open ? 'scale(0)' : 'scale(1)', opacity: open ? 0 : 1, position: open ? 'absolute' : 'relative' }}
        >
          <Cat3D size={58} variant={catVariant} />
        </span>
        <span
          className="transition-all duration-300"
          style={{ transform: open ? 'scale(1) rotate(0deg)' : 'scale(0) rotate(-90deg)', opacity: open ? 1 : 0, position: open ? 'relative' : 'absolute' }}
        >
          <X className="h-6 w-6" />
        </span>
      </button>

      {/* ── Chat window ── */}
      <div
        role="dialog"
        aria-label={t('dialogLabel')}
        aria-modal="true"
        aria-hidden={!open}
        className="fixed bottom-24 right-6 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl transition-all duration-300"
        style={{
          width: 'min(400px, calc(100vw - 3rem))',
          height: open ? 'min(520px, calc(100vh - 8rem))' : '0px',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transform: open ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
          transformOrigin: 'bottom right',
          background: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(0, 168, 181, 0.25)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{
            background: 'linear-gradient(90deg, rgba(0,168,181,0.18) 0%, rgba(0,80,100,0.12) 100%)',
            borderBottom: '1px solid rgba(0,168,181,0.15)',
          }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full shrink-0"
            style={{ background: 'linear-gradient(135deg, #00a8b5, #007a85)' }}>
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-none truncate">{t('title')}</p>
            <p className="text-xs text-althea-cta/70 mt-0.5 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-althea-success animate-pulse" />
              {t('online')}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                aria-label={t('clearConversation')}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors duration-150"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              aria-label={t('close')}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors duration-150"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          role="log"
          aria-live="polite"
          aria-label={t('messagesLabel')}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin"
        >
          {messages.length === 0 ? (
            /* Welcome state */
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-4">
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: 'linear-gradient(135deg, rgba(0,168,181,0.25), rgba(0,80,100,0.15))' }}>
                  <Sparkles className="h-7 w-7 text-althea-cta" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-althea-cta opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-althea-cta" />
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">{t('welcomeTitle')}</p>
                <p className="text-xs text-white/40">{t('welcomeSubtitle')}</p>
              </div>
              <div className="flex flex-col gap-2 w-full">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInputValue(''); sendMessage({ text: s }); }}
                    className="text-left text-xs px-3 py-2 rounded-xl text-althea-cta/90 transition-all duration-150 hover:text-white"
                    style={{
                      background: 'rgba(0,168,181,0.08)',
                      border: '1px solid rgba(0,168,181,0.18)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,168,181,0.18)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,168,181,0.08)';
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const text = msg.parts
                  ?.filter((p: any) => p.type === 'text')
                  .map((p: any) => p.text)
                  .join('') ?? (msg as any).content ?? '';

                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
                    {!isUser && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full mt-0.5"
                        style={{ background: 'linear-gradient(135deg, #00a8b5, #007a85)' }}>
                        <Bot className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <div
                      className="max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed"
                      style={isUser
                        ? { background: 'linear-gradient(135deg, #00a8b5, #007a85)', color: 'white', borderBottomRightRadius: '4px' }
                        : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.88)', border: '1px solid rgba(255,255,255,0.08)', borderBottomLeftRadius: '4px' }
                      }
                    >
                      {isUser ? text : (
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>,
                            li: ({ children }) => <li>{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            code: ({ children }) => <code className="bg-white/10 rounded px-1 font-mono text-[10px]">{children}</code>,
                          }}
                        >
                          {text}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isLoading && (
                <div role="status" aria-label={t('typingLabel')} className="flex justify-start gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full mt-0.5"
                    style={{ background: 'linear-gradient(135deg, #00a8b5, #007a85)' }}>
                    <Bot className="h-3 w-3 text-white" aria-hidden="true" />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl px-3 py-2.5"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', borderBottomLeftRadius: '4px' }}>
                    <span className="sr-only">{t('typingSr')}</span>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        aria-hidden="true"
                        className="inline-block w-1.5 h-1.5 rounded-full bg-althea-cta animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Escalation panel */}
        {escalation === 'form' || escalation === 'sending' || escalation === 'sent' ? (
          <div className="shrink-0 px-4 py-4" style={{ borderTop: '1px solid rgba(0,168,181,0.12)', background: 'rgba(0,0,0,0.25)' }}>
            {escalation === 'sent' ? (
              <div className="text-center py-2">
                <p className="text-xs font-semibold text-althea-cta mb-1">{t('escalation.sentTitle')}</p>
                <p className="text-xs text-white/60">{t('escalation.sentMessage')}</p>
                <button onClick={() => setEscalation(null)} className="mt-2 text-xs text-white/40 hover:text-white/70 underline">{t('escalation.backToChat')}</button>
              </div>
            ) : (
              <form onSubmit={handleEscalate} className="space-y-2">
                <p className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                  <UserCircle className="h-3.5 w-3.5 text-althea-cta" /> {t('escalation.title')}
                </p>
                <input
                  type="text"
                  value={escalationForm.name}
                  onChange={(e) => setEscalationForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t('escalation.namePlaceholder')}
                  aria-label={t('escalation.namePlaceholder')}
                  required
                  className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,168,181,0.2)' }}
                />
                <input
                  type="email"
                  value={escalationForm.email}
                  onChange={(e) => setEscalationForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder={t('escalation.emailPlaceholder')}
                  aria-label={t('escalation.emailPlaceholder')}
                  required
                  className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,168,181,0.2)' }}
                />
                <textarea
                  value={escalationForm.message}
                  onChange={(e) => setEscalationForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder={t('escalation.messagePlaceholder')}
                  aria-label={t('escalation.messagePlaceholder')}
                  rows={2}
                  className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 outline-none resize-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,168,181,0.2)' }}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={escalation === 'sending'}
                    className="flex-1 rounded-lg py-1.5 text-xs font-medium text-white transition-opacity disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #00a8b5, #007a85)' }}
                  >
                    {escalation === 'sending' ? t('escalation.sending') : t('escalation.submit')}
                  </button>
                  <button type="button" onClick={() => setEscalation(null)} className="px-3 rounded-lg text-xs text-white/40 hover:text-white/70" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                    {t('escalation.cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <>
            {/* Human escalation trigger — shown after 2+ messages */}
            {messages.length >= 2 && (
              <div className="shrink-0 flex justify-center px-3 py-1.5" style={{ borderTop: '1px solid rgba(0,168,181,0.08)' }}>
                <button
                  onClick={() => setEscalation('form')}
                  className="text-[10px] text-white/35 hover:text-althea-cta transition-colors"
                >
                  <span aria-hidden="true">👤 </span>{t('speakToAdvisor')}
                </button>
              </div>
            )}
            {/* Input */}
            <div
              className="shrink-0 flex items-center gap-2 px-3 py-3"
              style={{ borderTop: '1px solid rgba(0,168,181,0.12)', background: 'rgba(0,0,0,0.2)' }}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKey}
                placeholder={t('messagePlaceholder')}
                aria-label={t('messagePlaceholder')}
                disabled={isLoading}
                className="flex-1 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none transition-all duration-150 disabled:opacity-50"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(0,168,181,0.15)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,168,181,0.45)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,168,181,0.15)'; }}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                aria-label={t('send')}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-150 disabled:opacity-30 hover:scale-110 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #00a8b5, #007a85)' }}
              >
                <Send className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
