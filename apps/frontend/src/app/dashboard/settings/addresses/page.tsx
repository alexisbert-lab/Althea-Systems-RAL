'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MapPin, Plus, Pencil, Trash2, Star } from 'lucide-react';
import { useTranslations } from '@/lib/translations';

interface Address {
  id: string;
  label: string | null;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

const emptyForm = {
  label: '', firstName: '', lastName: '', street: '',
  city: '', postalCode: '', country: 'FR', phone: '', isDefault: false,
};

export default function AddressesPage() {
  const t = useTranslations('addresses');
  const { token } = useAuthentificationStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAddresses(); }, []);

  const loadAddresses = async () => {
    try {
      const data = await api.get<Address[]>('/api/addresses', token!);
      setAddresses(data);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (addr: Address) => {
    setEditId(addr.id);
    setForm({
      label: addr.label || '',
      firstName: addr.firstName,
      lastName: addr.lastName,
      street: addr.street,
      city: addr.city,
      postalCode: addr.postalCode,
      country: addr.country,
      phone: addr.phone || '',
      isDefault: addr.isDefault,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.firstName || !form.lastName || !form.street || !form.city || !form.postalCode) {
      toast.error(t('toasts.requiredFields'));
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, phone: form.phone || undefined, label: form.label || undefined };
      if (editId) {
        const updated = await api.put<Address>(`/api/addresses/${editId}`, payload, token!);
        setAddresses((prev) => prev.map((a) => {
          if (form.isDefault && a.id !== editId) return { ...a, isDefault: false };
          if (a.id === editId) return updated;
          return a;
        }));
        toast.success(t('toasts.updated'));
      } else {
        const created = await api.post<Address>('/api/addresses', payload, token!);
        setAddresses((prev) => {
          const updated = form.isDefault ? prev.map((a) => ({ ...a, isDefault: false })) : prev;
          return [...updated, created];
        });
        toast.success(t('toasts.added'));
      }
      setShowForm(false);
    } catch (err: any) {
      toast.error(err?.message || t('toasts.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('deleteConfirm'))) return;
    try {
      await api.delete(`/api/addresses/${id}`, token!);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.success(t('toasts.deleted'));
    } catch {
      toast.error(t('toasts.deleteError'));
    }
  };

  const handleSetDefault = async (addr: Address) => {
    try {
      await api.put<Address>(`/api/addresses/${addr.id}`, { isDefault: true }, token!);
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === addr.id })));
      toast.success(t('toasts.defaultUpdated'));
    } catch {
      toast.error(t('toasts.defaultError'));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const inputClass = 'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('pageTitle')}</h2>
        <Button onClick={openAdd} className="bg-althea-cta text-white hover:bg-althea-hover">
          <Plus className="mr-2 h-4 w-4" />
          {t('addBtn')}
        </Button>
      </div>

      {addresses.length === 0 && !showForm ? (
        <div className="rounded-lg border p-12 text-center">
          <MapPin className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">{t('emptyText')}</p>
          <Button onClick={openAdd} variant="outline" className="mt-4">
            {t('addBtn')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div key={addr.id} className={`relative rounded-lg border bg-card p-4 ${addr.isDefault ? 'border-althea-cta/60' : ''}`}>
              {addr.isDefault && (
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-althea-bg px-2 py-0.5 text-xs text-althea-cta">
                  <Star className="h-3 w-3 fill-current" /> {t('defaultBadge')}
                </span>
              )}
              {addr.label && (
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{addr.label}</p>
              )}
              <p className="font-medium">{addr.firstName} {addr.lastName}</p>
              <p className="text-sm text-muted-foreground">{addr.street}</p>
              <p className="text-sm text-muted-foreground">{addr.postalCode} {addr.city}, {addr.country}</p>
              {addr.phone && <p className="text-sm text-muted-foreground">{t('phone')} {addr.phone}</p>}

              <div className="mt-3 flex gap-2">
                {!addr.isDefault && (
                  <Button size="sm" variant="outline" onClick={() => handleSetDefault(addr)}>
                    <Star className="mr-1 h-3.5 w-3.5" /> {t('setDefaultBtn')}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => openEdit(addr)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> {t('editBtn')}
                </Button>
                <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(addr.id)}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> {t('deleteBtn')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">{editId ? t('form.titleEdit') : t('form.titleNew')}</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('form.label')}</label>
              <input
                placeholder={t('form.labelPlaceholder')}
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('form.firstName')}</label>
                <input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('form.lastName')}</label>
                <input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('form.street')}</label>
              <input
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('form.postalCode')}</label>
                <input
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('form.city')}</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('form.country')}</label>
                <input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('form.phone')}</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClass}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="accent-[#00a8b5]"
              />
              {t('form.isDefault')}
            </label>
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => setShowForm(false)}>{t('form.cancelBtn')}</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-althea-cta text-white hover:bg-althea-hover">
              {saving ? t('form.savingBtn') : t('form.saveBtn')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
