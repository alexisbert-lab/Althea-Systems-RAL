'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/client-api';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslations } from '@/lib/translations';

interface Setting {
  id: string;
  key: string;
  value: string;
  label: string;
  group: string;
}

export default function AdminSiteSettingsPage() {
  const t = useTranslations('adminSiteSettings');
  const { token } = useAuthentificationStore();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Setting[]>('/api/site-settings/detailed', token!);
      setSettings(Array.isArray(data) ? data : []);
      const map: Record<string, string> = {};
      (Array.isArray(data) ? data : []).forEach((s) => { map[s.key] = s.value; });
      setValues(map);
    } catch {
      toast.error(t('toasts.loadError'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(
        '/api/site-settings',
        { settings: Object.entries(values).map(([key, value]) => ({ key, value })) },
        token!,
      );
      toast.success(t('toasts.saved'));
    } catch (err: any) {
      toast.error(err.message || t('toasts.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const groups = [...new Set(settings.map((s) => s.group))];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-poppins text-2xl font-semibold text-althea-dark">{t('pageTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('pageDesc')}</p>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-althea-cta border-t-transparent" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {groups.map((group) => {
            const groupSettings = settings.filter((s) => s.group === group);
            return (
              <div key={group} className="rounded-xl border bg-card p-6">
                <h3 className="mb-5 font-poppins text-base font-semibold text-althea-dark">
                  {t(`groups.${group}`) || group}
                </h3>
                <div className="space-y-4">
                  {groupSettings.map((setting) => {
                    const isLong = (values[setting.key] || '').length > 80;
                    return (
                      <div key={setting.key}>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                          {setting.label}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            ({setting.key})
                          </span>
                        </label>
                        {isLong ? (
                          <textarea
                            value={values[setting.key] ?? ''}
                            onChange={(e) => setValues({ ...values, [setting.key]: e.target.value })}
                            rows={3}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                          />
                        ) : (
                          <input
                            type="text"
                            value={values[setting.key] ?? ''}
                            onChange={(e) => setValues({ ...values, [setting.key]: e.target.value })}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving} className="bg-althea-cta hover:bg-althea-hover">
              {saving ? t('savingBtn') : t('saveBtn')}
            </Button>
            <Button type="button" variant="outline" onClick={loadSettings} disabled={saving}>
              {t('cancelBtn')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
