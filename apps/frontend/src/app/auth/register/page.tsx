'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/client-api';
import { toast } from 'sonner';
import { CheckCircle, Mail } from 'lucide-react';
import { useTranslations } from '@/lib/translations';

function getPasswordStrength(pw: string): { score: number; color: string } {
  if (pw.length === 0) return { score: 0, color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, color: 'bg-red-500' };
  if (score <= 2) return { score, color: 'bg-yellow-500' };
  if (score <= 3) return { score, color: 'bg-blue-500' };
  return { score, color: 'bg-green-500' };
}

export default function RegisterPage() {
  const t = useTranslations('auth');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const strength = getPasswordStrength(form.password);
  const strengthLabel =
    strength.score === 0 ? '' :
    strength.score <= 1 ? t('passwordStrength.weak') :
    strength.score <= 2 ? t('passwordStrength.medium') :
    strength.score <= 3 ? t('passwordStrength.good') :
    t('passwordStrength.strong');

  const passwordsMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const passwordsMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error(t('toasts.passwordMismatch'));
      return;
    }
    if (form.password.length < 8) {
      toast.error(t('toasts.passwordTooShort'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      setRegisteredEmail(form.email);
      setRegistered(true);
    } catch (error: any) {
      toast.error(error.message || t('toasts.registerError'));
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <CheckCircle className="mx-auto mb-2 h-6 w-6 text-green-500" />
          <h1 className="mb-2 text-xl font-bold">{t('accountCreated')}</h1>
          <p className="mb-1 text-sm text-muted-foreground">{t('emailConfirmationSent')}</p>
          <p className="mb-6 font-medium text-foreground">{registeredEmail}</p>
          <p className="mb-6 text-sm text-muted-foreground">{t('clickLinkToActivate')}</p>
          <Link href="/auth/login">
            <Button className="w-full">{t('login')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-bold">{t('register')}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="register-name" className="mb-1 block text-sm font-medium">{t('name')}</label>
            <input
              id="register-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              autoComplete="name"
              aria-required="true"
              required
            />
          </div>
          <div>
            <label htmlFor="register-email" className="mb-1 block text-sm font-medium">{t('email')}</label>
            <input
              id="register-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              autoComplete="email"
              aria-required="true"
              required
            />
          </div>
          <div>
            <label htmlFor="register-password" className="mb-1 block text-sm font-medium">{t('password')}</label>
            <input
              id="register-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              autoComplete="new-password"
              aria-required="true"
              required
              minLength={8}
            />
            {form.password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        strength.score >= i ? strength.color : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('passwordStrength.label')} <span className="font-medium">{strengthLabel}</span>
                </p>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="register-confirm-password" className="mb-1 block text-sm font-medium">{t('confirmPassword')}</label>
            <input
              id="register-confirm-password"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${
                passwordsMismatch ? 'border-red-400' : passwordsMatch ? 'border-green-400' : ''
              }`}
              autoComplete="new-password"
              aria-required="true"
              required
            />
            {passwordsMismatch && (
              <p className="mt-1 text-xs text-red-500">{t('passwordMismatch')}</p>
            )}
            {passwordsMatch && (
              <p className="mt-1 text-xs text-green-600">{t('passwordMatch')}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading || passwordsMismatch}>
            {loading ? t('creating') : t('createAccount')}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t('alreadyAccount')}{' '}
          <Link href="/auth/login" className="text-primary hover:underline">
            {t('login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
