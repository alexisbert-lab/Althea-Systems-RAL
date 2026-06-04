'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { api } from '@/lib/client-api';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { useTranslations } from '@/lib/translations';

export default function LoginPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const [show2FA, setShow2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAUserId, setTwoFAUserId] = useState('');

  const login = useAuthentificationStore((s) => s.login);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  const navigateAfterLogin = (role: string) => {
    if (redirectTo) {
      router.push(decodeURIComponent(redirectTo));
    } else {
      const staffRoles = ['ADMIN', 'MANAGER_PRODUCTS', 'MANAGER_ORDERS', 'ACCOUNTANT', 'MODERATOR'];
      router.push(staffRoles.includes(role) ? '/dashboard' : '/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.post<{
        access_token?: string;
        requires2FA?: boolean;
        temp_token?: string;
        user: { id: string; name: string; email: string; role: string };
      }>('/api/auth/login', { email, password });

      if (data.requires2FA) {
        setShow2FA(true);
        setTwoFAUserId(data.user.id);
        toast.info(t('twoFA.prompt'));
      } else if (data.access_token) {
        login(data.user, data.access_token, rememberMe);
        toast.success(t('toasts.loginSuccess'));
        navigateAfterLogin(data.user.role);
      }
    } catch (error: any) {
      toast.error(error.message || t('toasts.loginError'));
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.post<{
        access_token: string;
        user: { id: string; name: string; email: string; role: string };
      }>('/api/auth/2fa/validate', { userId: twoFAUserId, code: twoFACode });

      login(data.user, data.access_token, rememberMe);
      toast.success(t('toasts.loginSuccess'));
      navigateAfterLogin(data.user.role);
    } catch (error: any) {
      toast.error(error.message || t('toasts.twoFAInvalid'));
    } finally {
      setLoading(false);
    }
  };

  if (show2FA) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
          <div className="mb-6 text-center">
            <ShieldCheck className="mx-auto mb-3 h-12 w-12 text-primary" />
            <h1 className="text-2xl font-bold">{t('twoFA.title')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t('twoFA.description')}</p>
          </div>
          <form onSubmit={handle2FASubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full rounded-md border px-3 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="000000"
                maxLength={6}
                autoFocus
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || twoFACode.length !== 6}>
              {loading ? t('twoFA.verifying') : t('twoFA.verify')}
            </Button>
            <button
              type="button"
              onClick={() => { setShow2FA(false); setTwoFACode(''); }}
              className="w-full text-sm text-muted-foreground hover:text-primary"
            >
              {t('twoFA.back')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-bold">{t('login')}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-medium">{t('email')}</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              required
              aria-required="true"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1 block text-sm font-medium">{t('password')}</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              required
              aria-required="true"
              autoComplete="current-password"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              {t('rememberMe')}
            </label>
            <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
              {t('forgotPassword')}
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('loginLoading') : t('login')}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t('noAccount')}{' '}
          <Link href="/auth/register" className="text-primary hover:underline">
            {t('register')}
          </Link>
        </p>
      </div>
    </div>
  );
}
