'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { api } from '@/lib/client-api';
import { formatCurrency } from '@/lib/utilitaires';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { useTranslations } from '@/lib/translations';

/* ---------- types ---------- */
interface ShippingRule {
  id: string;
  label: string;
  type: 'FLAT' | 'FREE_ABOVE' | 'CUSTOM';
  amount: number;
  minSubtotal: number | null;
  maxSubtotal: number | null;
  message: string | null;
  priority: number;
  active: boolean;
}

interface RuleForm {
  label: string;
  type: 'FLAT' | 'FREE_ABOVE' | 'CUSTOM';
  amount: number;
  minSubtotal: string;
  maxSubtotal: string;
  message: string;
  priority: number;
  active: boolean;
}

const emptyForm: RuleForm = {
  label: '',
  type: 'FLAT',
  amount: 0,
  minSubtotal: '',
  maxSubtotal: '',
  message: '',
  priority: 0,
  active: true,
};

const typeBadgeColors: Record<string, string> = {
  FLAT: 'bg-blue-100 text-blue-700',
  FREE_ABOVE: 'bg-green-100 text-green-700',
  CUSTOM: 'bg-amber-100 text-amber-700',
};

export default function ShippingAdminPage() {
  const t = useTranslations('adminShipping');
  const { token } = useAuthentificationStore();
  const [rules, setRules] = useState<ShippingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RuleForm>(emptyForm);

  const inputClass = 'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta';

  const loadRules = useCallback(async () => {
    try {
      const data = await api.get<ShippingRule[]>('/api/shipping-rules', token!);
      setRules(data);
    } catch {
      toast.error(t('toasts.loadError'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) loadRules();
  }, [token, loadRules]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, priority: rules.length });
    setShowForm(true);
  };

  const openEdit = (rule: ShippingRule) => {
    setEditingId(rule.id);
    setForm({
      label: rule.label,
      type: rule.type,
      amount: rule.amount,
      minSubtotal: rule.minSubtotal !== null ? String(rule.minSubtotal / 100) : '',
      maxSubtotal: rule.maxSubtotal !== null ? String(rule.maxSubtotal / 100) : '',
      message: rule.message || '',
      priority: rule.priority,
      active: rule.active,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.label.trim()) {
      toast.error(t('toasts.labelRequired'));
      return;
    }

    const payload = {
      label: form.label,
      type: form.type,
      amount: form.type === 'FLAT' ? Math.round(form.amount) : 0,
      minSubtotal: form.minSubtotal ? Math.round(parseFloat(form.minSubtotal) * 100) : null,
      maxSubtotal: form.maxSubtotal ? Math.round(parseFloat(form.maxSubtotal) * 100) : null,
      message: form.type === 'CUSTOM' ? form.message : null,
      priority: form.priority,
      active: form.active,
    };

    try {
      if (editingId) {
        await api.put(`/api/shipping-rules/${editingId}`, payload, token!);
        toast.success(t('toasts.updated'));
      } else {
        await api.post('/api/shipping-rules', payload, token!);
        toast.success(t('toasts.created'));
      }
      setShowForm(false);
      loadRules();
    } catch (err: any) {
      toast.error(err.message || t('toasts.error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    try {
      await api.delete(`/api/shipping-rules/${id}`, token!);
      toast.success(t('toasts.deleted'));
      loadRules();
    } catch (err: any) {
      toast.error(err.message || t('toasts.error'));
    }
  };

  const toggleActive = async (rule: ShippingRule) => {
    try {
      await api.put(`/api/shipping-rules/${rule.id}`, { active: !rule.active }, token!);
      loadRules();
    } catch {
      toast.error(t('toasts.error'));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-althea-cta border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-poppins text-2xl font-semibold text-althea-dark">
            {t('pageTitle')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rules.length} {rules.length > 1 ? t('countPlural') : t('countSingular')}
          </p>
        </div>
        <Button onClick={openCreate} className="bg-althea-cta text-white hover:bg-althea-hover">
          <Plus className="mr-1 h-4 w-4" />
          {t('addBtn')}
        </Button>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        {t('hint')}
      </p>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t('table.priority')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('table.label')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('table.type')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('table.amount')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('table.minSubtotal')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('table.maxSubtotal')}</th>
              <th className="px-4 py-3 text-center font-medium">{t('table.active')}</th>
              <th className="px-4 py-3 text-right font-medium">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                    {rule.priority}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{rule.label}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeColors[rule.type]}`}>
                    {t(`types.${rule.type}`)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {rule.type === 'FLAT' ? formatCurrency(rule.amount / 100) : '—'}
                </td>
                <td className="px-4 py-3">
                  {rule.minSubtotal !== null ? `${formatCurrency(rule.minSubtotal / 100)} ${t('htSuffix')}` : '—'}
                </td>
                <td className="px-4 py-3">
                  {rule.maxSubtotal !== null ? `${formatCurrency(rule.maxSubtotal / 100)} ${t('htSuffix')}` : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleActive(rule)}
                    className={`h-5 w-9 rounded-full transition-colors ${rule.active ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${rule.active ? 'translate-x-4' : 'translate-x-0.5'}`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => openEdit(rule)}
                      className="rounded p-1 hover:bg-muted"
                      title={t('editTitle')}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="rounded p-1 hover:bg-red-50"
                      title={t('deleteTitle')}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  {t('emptyText')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl">
            <h2 className="mb-4 font-poppins text-lg font-semibold">
              {editingId ? t('form.titleEdit') : t('form.titleNew')}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">{t('form.labelField')}</label>
                <input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder={t('form.labelPlaceholder')}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">{t('form.typeField')}</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as RuleForm['type'] })}
                  className={inputClass}
                >
                  <option value="FLAT">{t('form.typeFlatOption')}</option>
                  <option value="FREE_ABOVE">{t('form.typeFreeAboveOption')}</option>
                  <option value="CUSTOM">{t('form.typeCustomOption')}</option>
                </select>
              </div>

              {form.type === 'FLAT' && (
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('form.amountField')}</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })}
                    placeholder="499"
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    = {formatCurrency((form.amount || 0) / 100)}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('form.minSubtotalField')}</label>
                  <input
                    type="number"
                    value={form.minSubtotal}
                    onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })}
                    placeholder={t('form.optional')}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('form.maxSubtotalField')}</label>
                  <input
                    type="number"
                    value={form.maxSubtotal}
                    onChange={(e) => setForm({ ...form, maxSubtotal: e.target.value })}
                    placeholder={t('form.optional')}
                    className={inputClass}
                  />
                </div>
              </div>

              {form.type === 'CUSTOM' && (
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('form.messageField')}</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder={t('form.messagePlaceholder')}
                    rows={2}
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium">{t('form.priorityField')}</label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('form.priorityHint')}
                </p>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="accent-[#00a8b5]"
                />
                <span className="text-sm">{t('form.activeLabel')}</span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                {t('form.cancelBtn')}
              </Button>
              <Button onClick={handleSubmit} className="bg-althea-cta text-white hover:bg-althea-hover">
                {editingId ? t('form.saveBtn') : t('form.createBtn')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
