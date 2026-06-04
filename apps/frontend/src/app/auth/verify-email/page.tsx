'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { api } from '@/lib/client-api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useTranslations } from '@/lib/translations';

export default function VerifyEmailPage() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const login = useAuthentificationStore((s) => s.login);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(t('invalidVerifyLink'));
      return;
    }

    api.get<{
      message: string;
      access_token: string;
      user: { id: string; name: string; email: string; role: string };
    }>(`/api/auth/verify-email?token=${token}`)
      .then((data) => {
        setStatus('success');
        setMessage(data.message);
        login(data.user, data.access_token, true);
        setTimeout(() => router.push('/'), 3000);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || t('expiredVerifyLink'));
      });
  }, [token, login, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
            <h1 className="text-xl font-bold">{t('verifying')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t('verifyingDesc')}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <h1 className="text-xl font-bold text-green-700">{t('emailVerified')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t('redirectingSoon')}</p>
            <Link href="/">
              <Button className="mt-4">{t('accessSite')}</Button>
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h1 className="text-xl font-bold text-red-700">{t('verifyFailed')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <div className="mt-4 space-y-2">
              <Link href="/auth/login">
                <Button className="w-full">{t('login')}</Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="outline" className="w-full">{t('register')}</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
