'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from '@/lib/translations';
import { api } from '@/lib/client-api';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SettingsPage() {
  const t = useTranslations('admin.settings');
  const tCommon = useTranslations('common');
  const { token, user, updateUser } = useAuthentificationStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.put<{ name: string; email: string }>(
        '/api/users/me',
        { name, email },
        token!,
      );
      updateUser({ name: updated.name, email: updated.email });
      toast.success(t('updateSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('updateError'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) {
      toast.error(t('updateError'));
      return;
    }
    if (newPw !== confirmPw) {
      toast.error(t('updateError'));
      return;
    }
    setChangingPw(true);
    try {
      await api.post('/api/auth/change-password', {
        currentPassword: currentPw,
        newPassword: newPw,
      }, token!);
      toast.success(t('updateSuccess'));
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (error: any) {
      toast.error(error.message || t('updateError'));
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('title')}</h2>

      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <form onSubmit={handleProfileSave} className="rounded-lg border p-6 space-y-4">
          <h3 className="text-lg font-semibold">{t('profile')}</h3>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? tCommon('loading') : tCommon('save')}
          </Button>
        </form>

        {/* Password */}
        <form onSubmit={handlePasswordChange} className="rounded-lg border p-6 space-y-4">
          <h3 className="text-lg font-semibold">{t('changePassword')}</h3>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('currentPassword')}</label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('newPassword')}</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              placeholder="Min. 8"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('confirmPassword')}</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              required
            />
          </div>
          <Button type="submit" disabled={changingPw}>
            {changingPw ? tCommon('loading') : t('changePassword')}
          </Button>
        </form>

        {/* Danger Zone */}
        <section className="rounded-lg border border-destructive/50 p-6">
          <h3 className="text-lg font-semibold text-destructive">Zone de danger</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            La suppression de votre compte est irréversible.
          </p>
          <Button
            variant="destructive"
            className="mt-4"
            onClick={async () => {
              if (!confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) return;
              try {
                await api.delete('/api/users/me', token!);
                useAuthentificationStore.getState().logout();
                window.location.href = '/';
              } catch (error: any) {
                toast.error(error.message);
              }
            }}
          >
            Supprimer mon compte
          </Button>
        </section>
      </div>
    </div>
  );
}
