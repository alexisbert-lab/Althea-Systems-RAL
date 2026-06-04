'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from '@/lib/translations';
import { api } from '@/lib/client-api';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { formatDate } from '@/lib/utilitaires';
import { toast } from 'sonner';

interface Contact {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  resolved: boolean;
  createdAt: string;
}

export default function AdminContactsPage() {
  const t = useTranslations('admin.contacts');
  const tCommon = useTranslations('common');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Contact | null>(null);
  const { token } = useAuthentificationStore();

  useEffect(() => { loadContacts(); }, []);

  const loadContacts = async () => {
    try {
      const data = await api.get<{ data: Contact[] }>('/api/contact', token!);
      setContacts(data.data);
    } catch {} finally { setLoading(false); }
  };

  const markRead = async (id: string) => {
    try {
      await api.put(`/api/contact/${id}`, { read: true }, token!);
      loadContacts();
    } catch {}
  };

  const markResolved = async (id: string) => {
    try {
      await api.put(`/api/contact/${id}`, { resolved: true }, token!);
      toast.success(t('updateSuccess'));
      setSelected(null);
      loadContacts();
    } catch {}
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('title')}</h2>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* List */}
          <div className="space-y-2">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => { setSelected(contact); if (!contact.read) markRead(contact.id); }}
                className={`w-full rounded-lg border p-4 text-left transition-colors hover:bg-accent ${
                  selected?.id === contact.id ? 'border-primary bg-primary/5' : ''
                } ${!contact.read ? 'border-l-4 border-l-primary' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.subject}</p>
                  </div>
                  <div className="flex gap-1">
                    {!contact.read && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                    {contact.resolved && (
                      <span className="text-xs text-green-600">✓</span>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(contact.createdAt)}</p>
              </button>
            ))}
            {contacts.length === 0 && (
              <p className="py-10 text-center text-muted-foreground">{tCommon('noResults')}</p>
            )}
          </div>

          {/* Detail */}
          {selected && (
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selected.subject}</h3>
                  <p className="text-sm text-muted-foreground">
                    De {selected.name} ({selected.email})
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(selected.createdAt)}</p>
                </div>
              </div>
              <div className="rounded bg-muted/50 p-4">
                <p className="whitespace-pre-wrap text-sm">{selected.message}</p>
              </div>
              {!selected.resolved && (
                <button
                  onClick={() => markResolved(selected.id)}
                  className="mt-4 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  {t('markAsRead')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
