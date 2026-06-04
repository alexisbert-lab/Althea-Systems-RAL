'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { api } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { User, Lock, Trash2, ShieldOff, Mail, ShieldCheck } from 'lucide-react';
import { useTranslations, useLocale } from '@/lib/translations';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  emailVerified: boolean;
  isActive: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const t = useTranslations('settings');
  const locale = useLocale();
  const { token, updateUser, logout } = useAuthentificationStore();
  const searchParams = useSearchParams();

  const dateLocale = locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'fr-FR';
  const confirmWord = t('delete.confirmWord');

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [pendingEmailMessage, setPendingEmailMessage] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Deactivate state
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [loadingDeactivate, setLoadingDeactivate] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [loadingDelete, setLoadingDelete] = useState(false);

  // 2FA state
  const [twoFAStep, setTwoFAStep] = useState<'idle' | 'setup' | 'verify'>('idle');
  const [twoFAQrCode, setTwoFAQrCode] = useState('');
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFADisableCode, setTwoFADisableCode] = useState('');
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [loading2FA, setLoading2FA] = useState(false);

  // Handle email change confirmation token from URL
  useEffect(() => {
    const confirmEmailToken = searchParams.get('confirmEmailToken');
    if (confirmEmailToken && token) {
      api.get<{ message: string }>(`/api/users/confirm-email-change?token=${confirmEmailToken}`, token)
        .then((data) => {
          toast.success(data.message || t('toasts.emailUpdated'));
          api.get<UserProfile>('/api/users/me', token).then((p) => {
            setProfile(p);
            setName(p.name);
            setEmail(p.email);
            updateUser({ name: p.name, email: p.email });
          });
        })
        .catch((err) => toast.error(err.message || t('toasts.emailConfirmInvalid')));
    }
  }, [searchParams, token, updateUser]);

  useEffect(() => {
    if (!token) return;
    api.get<UserProfile>('/api/users/me', token).then((data) => {
      setProfile(data);
      setName(data.name);
      setEmail(data.email);
    }).catch(() => toast.error(t('toasts.profileLoadError')));
  }, [token]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoadingProfile(true);
    setPendingEmailMessage('');
    try {
      const updated = await api.put<UserProfile & { pendingEmailChange?: boolean; message?: string }>(
        '/api/users/me', { name, email }, token,
      );
      setProfile({ ...profile!, name: updated.name, email: updated.email ?? profile!.email });
      updateUser({ name: updated.name, email: updated.email ?? profile!.email });

      if (updated.pendingEmailChange) {
        setPendingEmailMessage(updated.message || t('toasts.pendingEmailChange'));
        setEmail(profile!.email);
        toast.info(t('toasts.pendingEmailChange'));
      } else {
        toast.success(t('toasts.profileUpdated'));
      }
    } catch (err: any) {
      toast.error(err.message || t('toasts.profileUpdateError'));
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('toasts.passwordMismatch'));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('toasts.passwordTooShort'));
      return;
    }
    if (!token) return;
    setLoadingPassword(true);
    try {
      await api.put('/api/users/me/password', { currentPassword, newPassword }, token);
      toast.success(t('toasts.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || t('toasts.passwordChangeError'));
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleDeactivate = async () => {
    if (!token) return;
    setLoadingDeactivate(true);
    try {
      await api.patch('/api/users/me/deactivate', {}, token);
      toast.success(t('toasts.deactivated'));
      logout();
      window.location.href = '/';
    } catch (err: any) {
      toast.error(err.message || t('toasts.deactivateError'));
    } finally {
      setLoadingDeactivate(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== confirmWord || !token) return;
    setLoadingDelete(true);
    try {
      await api.delete('/api/users/me', token);
      toast.success(t('toasts.deleted'));
      logout();
      window.location.href = '/';
    } catch (err: any) {
      toast.error(err.message || t('toasts.deleteError'));
    } finally {
      setLoadingDelete(false);
    }
  };

  const handleSetup2FA = async () => {
    if (!token) return;
    setLoading2FA(true);
    try {
      const data = await api.post<{ qrCode: string; secret: string }>('/api/auth/2fa/setup', {}, token);
      setTwoFAQrCode(data.qrCode);
      setTwoFASecret(data.secret);
      setTwoFAStep('verify');
    } catch (err: any) {
      toast.error(err.message || t('toasts.twoFASetupError'));
    } finally {
      setLoading2FA(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading2FA(true);
    try {
      await api.post('/api/auth/2fa/verify', { code: twoFACode }, token);
      toast.success(t('toasts.twoFAEnabled'));
      setProfile({ ...profile!, twoFactorEnabled: true });
      setTwoFAStep('idle');
      setTwoFACode('');
      setTwoFAQrCode('');
      setTwoFASecret('');
    } catch (err: any) {
      toast.error(err.message || t('toasts.twoFACodeInvalid'));
    } finally {
      setLoading2FA(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading2FA(true);
    try {
      await api.post('/api/auth/2fa/disable', { code: twoFADisableCode }, token);
      toast.success(t('toasts.twoFADisabled'));
      setProfile({ ...profile!, twoFactorEnabled: false });
      setShowDisable2FA(false);
      setTwoFADisableCode('');
    } catch (err: any) {
      toast.error(err.message || t('toasts.twoFACodeInvalid'));
    } finally {
      setLoading2FA(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-busy="true" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
        <span className="sr-only">{t('loading')}</span>
      </div>
    );
  }

  const inputClass =
    'w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t('pageTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('pageSubtitle')}</p>
      </div>

      {/* Email verification banner */}
      {!profile.emailVerified && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
          <Mail className="mt-0.5 h-5 w-5 text-amber-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {t('emailBanner.title')}
            </p>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {t('emailBanner.body')}
            </p>
          </div>
        </div>
      )}

      {/* Profile Section */}
      <form onSubmit={handleUpdateProfile} className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t('profile.title')}</h2>
            <p className="text-xs text-muted-foreground">
              {t('profile.memberSince')} {new Date(profile.createdAt).toLocaleDateString(dateLocale)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="settings-name" className="mb-1 block text-sm font-medium">{t('profile.name')}</label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              autoComplete="name"
              aria-required="true"
              required
            />
          </div>
          <div>
            <label htmlFor="settings-email" className="mb-1 block text-sm font-medium">{t('profile.email')}</label>
            <input
              id="settings-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              autoComplete="email"
              aria-required="true"
              required
            />
            {pendingEmailMessage && (
              <p className="mt-1 text-xs text-amber-600">{pendingEmailMessage}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            type="submit"
            disabled={loadingProfile || (name === profile.name && email === profile.email)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loadingProfile ? t('profile.savingBtn') : t('profile.saveBtn')}
          </Button>
        </div>
      </form>

      {/* Password Section */}
      <form onSubmit={handleChangePassword} className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold">{t('password.title')}</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="settings-current-password" className="mb-1 block text-sm font-medium">{t('password.current')}</label>
            <input
              id="settings-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
              aria-required="true"
              required
            />
          </div>
          <div>
            <label htmlFor="settings-new-password" className="mb-1 block text-sm font-medium">{t('password.new')}</label>
            <input
              id="settings-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              placeholder={t('password.newPlaceholder')}
              autoComplete="new-password"
              aria-required="true"
              required
            />
          </div>
          <div>
            <label htmlFor="settings-confirm-password" className="mb-1 block text-sm font-medium">{t('password.confirm')}</label>
            <input
              id="settings-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
              aria-required="true"
              required
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            type="submit"
            disabled={loadingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loadingPassword ? t('password.savingBtn') : t('password.saveBtn')}
          </Button>
        </div>
      </form>

      {/* 2FA Section */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t('twofa.title')}</h2>
            <p className="text-xs text-muted-foreground">
              {profile.twoFactorEnabled ? t('twofa.enabled') : t('twofa.disabled')}
            </p>
          </div>
          {profile.twoFactorEnabled && (
            <span className="ml-auto rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {t('twofa.badge')}
            </span>
          )}
        </div>

        {!profile.twoFactorEnabled && twoFAStep === 'idle' && (
          <Button onClick={handleSetup2FA} disabled={loading2FA}>
            {loading2FA ? t('twofa.setupLoading') : t('twofa.setupBtn')}
          </Button>
        )}

        {!profile.twoFactorEnabled && twoFAStep === 'verify' && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="mb-3 text-sm font-medium">{t('twofa.qrStep1')}</p>
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={twoFAQrCode} alt="QR Code 2FA" className="h-48 w-48 rounded-lg" />
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {t('twofa.qrManual')} <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{twoFASecret}</code>
              </p>
            </div>

            <form onSubmit={handleVerify2FA} className="space-y-3">
              <label htmlFor="twofa-verify-code" className="text-sm font-medium">
                {t('twofa.qrStep2')}
              </label>
              <input
                id="twofa-verify-code"
                type="text"
                inputMode="numeric"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-center font-mono text-xl tracking-[0.5em] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="000000"
                maxLength={6}
                autoComplete="one-time-code"
                aria-required="true"
                autoFocus
                required
              />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setTwoFAStep('idle'); setTwoFACode(''); setTwoFAQrCode(''); setTwoFASecret(''); }}
                >
                  {t('cancelBtn')}
                </Button>
                <Button type="submit" disabled={loading2FA || twoFACode.length !== 6}>
                  {loading2FA ? t('twofa.verifyLoading') : t('twofa.verifyBtn')}
                </Button>
              </div>
            </form>
          </div>
        )}

        {profile.twoFactorEnabled && !showDisable2FA && (
          <Button
            variant="outline"
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => setShowDisable2FA(true)}
          >
            {t('twofa.disableBtn')}
          </Button>
        )}

        {profile.twoFactorEnabled && showDisable2FA && (
          <form onSubmit={handleDisable2FA} className="space-y-3">
            <label htmlFor="twofa-disable-code" className="block text-sm text-muted-foreground">
              {t('twofa.disablePrompt')}
            </label>
            <input
              id="twofa-disable-code"
              type="text"
              inputMode="numeric"
              value={twoFADisableCode}
              onChange={(e) => setTwoFADisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-center font-mono text-xl tracking-[0.5em] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="000000"
              maxLength={6}
              autoComplete="one-time-code"
              aria-required="true"
              autoFocus
              required
            />
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => { setShowDisable2FA(false); setTwoFADisableCode(''); }}>
                {t('cancelBtn')}
              </Button>
              <Button
                type="submit"
                disabled={loading2FA || twoFADisableCode.length !== 6}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {loading2FA ? t('twofa.disableLoading') : t('twofa.disableConfirmBtn')}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Deactivate Account Section */}
      <div className="rounded-xl border border-amber-200 bg-card p-6 dark:border-amber-800">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
            <ShieldOff className="h-5 w-5 text-amber-600" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-amber-700 dark:text-amber-400">{t('deactivate.title')}</h2>
            <p className="text-xs text-muted-foreground">{t('deactivate.subtitle')}</p>
          </div>
        </div>

        {!showDeactivateConfirm ? (
          <Button
            variant="outline"
            className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950"
            onClick={() => setShowDeactivateConfirm(true)}
          >
            {t('deactivate.btn')}
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('deactivate.confirmText')}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDeactivateConfirm(false)}>{t('cancelBtn')}</Button>
              <Button
                className="bg-amber-600 text-white hover:bg-amber-700"
                onClick={handleDeactivate}
                disabled={loadingDeactivate}
              >
                {loadingDeactivate ? t('deactivate.loading') : t('deactivate.confirmBtn')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Account Section */}
      <div className="rounded-xl border border-destructive/30 bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <Trash2 className="h-5 w-5 text-destructive" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-destructive">{t('delete.title')}</h2>
            <p className="text-xs text-muted-foreground">{t('delete.subtitle')}</p>
          </div>
        </div>

        {!showDeleteConfirm ? (
          <Button
            variant="outline"
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteConfirm(true)}
          >
            {t('delete.btn')}
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('delete.confirmPromptPrefix')} <strong>{confirmWord}</strong> {t('delete.confirmPromptSuffix')}
            </p>
            <label htmlFor="delete-confirm" className="sr-only">{t('delete.srOnly')}</label>
            <input
              id="delete-confirm"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className={inputClass}
              placeholder={confirmWord}
              aria-required="true"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
              >
                {t('cancelBtn')}
              </Button>
              <Button
                disabled={deleteConfirmText !== confirmWord || loadingDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDeleteAccount}
              >
                {loadingDelete ? t('delete.loading') : t('delete.confirmBtn')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
