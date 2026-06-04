'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslations } from '@/lib/translations';

export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error(t('toasts.passwordTooShort'));
      return;
    }
    if (password !== confirm) {
      toast.error(t('toasts.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, newPassword: password });
      setDone(true);
      toast.success(t('toasts.resetSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('toasts.resetError'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold">{t('invalidLink')}</h1>
          <p className="mt-2 text-muted-foreground">{t('invalidLinkDesc')}</p>
          <Link href="/auth/forgot-password" className="mt-4 inline-block text-primary hover:underline">
            {t('requestNewLink')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t('newPasswordTitle')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('newPasswordDesc')}</p>
        </div>

        {done ? (
          <div className="rounded-lg border bg-green-50 p-6 text-center">
            <p className="text-green-800">{t('resetSuccessDesc')}</p>
            <Link href="/auth/login" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              {t('login')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-password" className="mb-1 block text-sm font-medium">{t('newPassword')}</label>
              <input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border px-3 py-2"
                placeholder={t('passwordPlaceholder')}
                autoComplete="new-password"
                aria-required="true"
                required
              />
            </div>
            <div>
              <label htmlFor="reset-confirm" className="mb-1 block text-sm font-medium">{t('confirm')}</label>
              <input
                id="reset-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-md border px-3 py-2"
                autoComplete="new-password"
                aria-required="true"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('resetting') : t('resetPassword')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
