'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslations } from '@/lib/translations';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
      toast.success(t('toasts.sendLinkSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('toasts.sendLinkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t('forgotPasswordTitle')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('forgotPasswordDesc')}</p>
        </div>

        {sent ? (
          <div className="rounded-lg border bg-green-50 p-6 text-center">
            <p className="text-green-800">{t('emailSentConfirm')}</p>
            <Link href="/auth/login" className="mt-4 inline-block text-sm text-primary hover:underline">
              {t('backToLogin')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium">{t('email')}</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border px-3 py-2"
                placeholder={t('emailPlaceholder')}
                autoComplete="email"
                aria-required="true"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('sending') : t('sendLink')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/auth/login" className="text-primary hover:underline">
                {t('backToLogin')}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
