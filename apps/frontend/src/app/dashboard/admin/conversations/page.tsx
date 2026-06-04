'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { MessageSquare, ChevronDown, ChevronUp, Bot, User } from 'lucide-react';
import { useTranslations } from '@/lib/translations';

interface ConversationSummary {
  _id: string;
  userId: string;
  lastMessage: string;
  lastDate: string;
  messageCount: number;
}

interface ChatMessage {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export default function AdminConversationsPage() {
  const t = useTranslations('adminConversations');
  const { token } = useAuthentificationStore();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, ChatMessage[] | null>>({});
  const [loadingDetail, setLoadingDetail] = useState<Record<string, boolean>>({});

  const limit = 20;

  useEffect(() => {
    loadConversations();
  }, [page]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ data: ConversationSummary[]; meta: { total: number } }>(
        `/api/chat/admin/conversations?page=${page}&limit=${limit}`,
        token!,
      );
      setConversations(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (conversationId: string) => {
    if (expanded[conversationId] !== undefined) {
      setExpanded((prev) => {
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });
      return;
    }

    setLoadingDetail((prev) => ({ ...prev, [conversationId]: true }));
    try {
      const messages = await api.get<ChatMessage[]>(
        `/api/chat/admin/conversations/${conversationId}`,
        token!,
      );
      setExpanded((prev) => ({ ...prev, [conversationId]: Array.isArray(messages) ? messages : [] }));
    } catch {
      setExpanded((prev) => ({ ...prev, [conversationId]: [] }));
    } finally {
      setLoadingDetail((prev) => ({ ...prev, [conversationId]: false }));
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-althea-cta border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-poppins text-2xl font-semibold text-althea-dark flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-althea-cta" />
          {t('pageTitle')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {total} {total !== 1 ? t('countPlural') : t('countSingular')}
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{t('emptyConversations')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => (
            <div key={conv._id} className="rounded-xl border bg-card overflow-hidden">
              <button
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-accent/40 transition-colors"
                onClick={() => toggleExpand(conv._id)}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-althea-bg">
                  <MessageSquare className="h-4 w-4 text-althea-cta" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">{conv.userId || t('anonymous')}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {conv.messageCount} {conv.messageCount !== 1 ? t('messagePlural') : t('messageSingular')}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(conv.lastDate).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5 truncate text-althea-dark">{conv.lastMessage}</p>
                </div>
                <div className="shrink-0">
                  {loadingDetail[conv._id] ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-althea-cta border-t-transparent" />
                  ) : expanded[conv._id] !== undefined ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {expanded[conv._id] !== undefined && (
                <div className="border-t bg-muted/30 px-5 py-4 space-y-3 max-h-96 overflow-y-auto">
                  {(expanded[conv._id] || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t('emptyMessages')}</p>
                  ) : (
                    (expanded[conv._id] || []).map((msg) => (
                      <div key={msg._id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-althea-cta/20 mt-0.5">
                            <Bot className="h-3 w-3 text-althea-cta" />
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                          msg.role === 'user'
                            ? 'bg-althea-cta/15 text-althea-dark'
                            : 'bg-background border text-foreground'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleString('fr-FR', { timeStyle: 'short' })}
                          </p>
                        </div>
                        {msg.role === 'user' && (
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                            <User className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-accent"
          >
            {t('pagination.prev')}
          </button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-accent"
          >
            {t('pagination.next')}
          </button>
        </div>
      )}
    </div>
  );
}
