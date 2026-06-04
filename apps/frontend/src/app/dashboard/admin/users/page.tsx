'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from '@/lib/translations';
import { api } from '@/lib/client-api';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { formatDate } from '@/lib/utilitaires';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Shield, Trash2, Users, Search, ChevronLeft, ChevronRight } from 'lucide-react';

/* ---------- types ---------- */
interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

const ROLES = [
  { value: 'USER', color: 'bg-gray-100 text-gray-700' },
  { value: 'MODERATOR', color: 'bg-blue-100 text-blue-700' },
  { value: 'MANAGER_PRODUCTS', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'MANAGER_ORDERS', color: 'bg-amber-100 text-amber-700' },
  { value: 'ACCOUNTANT', color: 'bg-purple-100 text-purple-700' },
  { value: 'ADMIN', color: 'bg-red-100 text-red-700' },
];

const getRoleBadge = (role: string) => {
  const r = ROLES.find((x) => x.value === role);
  return r || { value: role, color: 'bg-muted text-muted-foreground' };
};

/* ---------- page ---------- */
export default function AdminUsersPage() {
  const t = useTranslations('admin.users');
  const tCommon = useTranslations('common');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [rgpdChecked, setRgpdChecked] = useState(false);
  const { token, user: currentUser } = useAuthentificationStore();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/users?page=${page}&limit=20`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      const data = await api.get<{ data: User[]; meta: { totalPages: number; total: number } }>(
        url, token!,
      );
      let list = data.data || [];
      if (filterRole) list = list.filter((u) => u.role === filterRole);
      setUsers(list);
      setTotalPages(data.meta?.totalPages || 1);
      setTotalCount(data.meta?.total || 0);
    } catch {
      toast.error(t('loadingError'));
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterRole, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadUsers(); }, [loadUsers]);

  /* ---------- role change ---------- */
  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === currentUser?.id) {
      toast.error(t('updateError'));
      return;
    }
    try {
      await api.put(`/api/users/${userId}/role`, { role: newRole }, token!);
      toast.success(t('updateSuccess'));
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || t('updateError'));
    }
  };

  /* ---------- delete with RGPD ---------- */
  const handleDeleteUser = async () => {
    if (!deleteConfirm || !rgpdChecked) return;
    try {
      await api.delete(`/api/users/${deleteConfirm.id}`, token!);
      toast.success(t('deleteSuccess'));
      setDeleteConfirm(null);
      setRgpdChecked(false);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || tCommon('error'));
    }
  };

  /* ---------- export CSV ---------- */
  const exportCSV = () => {
    const headers = [t('name'), t('email'), t('role'), t('createdAt')];
    const rows = users.map((u) => [
      `"${u.name || ''}"`,
      u.email,
      t(`roles.${u.role}`) || u.role,
      new Date(u.createdAt).toLocaleDateString('fr-FR'),
    ].join(';'));
    const csv = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utilisateurs_althea_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('exportSuccess'));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-poppins text-2xl font-semibold text-althea-dark flex items-center gap-2">
            <Users className="h-6 w-6" />
            {t('title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('totalUsers', { count: totalCount })}
          </p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('search')}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full max-w-sm rounded-md border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
        >
          <option value="">{t('allRoles')}</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{t(`roles.${r.value}`) || r.value}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : users.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">{tCommon('noResults')}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t('name')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('role')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('createdAt')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const badge = getRoleBadge(user.role);
                const isSelf = user.id === currentUser?.id;
                return (
                  <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{user.name || t('noName')}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isSelf ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.color}`}>
                          <Shield className="h-3 w-3" />
                          {t(`roles.${badge.value}`) || badge.value} {t('youSuffix')}
                        </span>
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className={`cursor-pointer rounded-full border-0 px-2.5 py-0.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-althea-cta ${badge.color}`}
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{t(`roles.${r.value}`) || r.value}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {!isSelf && (
                        <button
                          onClick={() => setDeleteConfirm(user)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
                          title={t('deleteUser')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {tCommon('delete')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> {tCommon('previous')}
          </button>
          <span className="px-3 text-sm text-muted-foreground">
            {tCommon('page')} {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-muted transition-colors"
          >
            {tCommon('next')} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* RGPD Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              {t('confirmDelete')}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('confirmDeleteDesc')} <strong>{deleteConfirm.name || deleteConfirm.email}</strong>.
            </p>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-800">
                <strong>{t('rgpdTitle')}</strong> {t('rgpdDesc')}
              </p>
            </div>
            <label className="mt-4 flex items-start gap-2">
              <input
                type="checkbox"
                checked={rgpdChecked}
                onChange={(e) => setRgpdChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border accent-red-600"
              />
              <span className="text-sm">{t('rgpdCheckbox')}</span>
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setDeleteConfirm(null); setRgpdChecked(false); }}>
                {tCommon('cancel')}
              </Button>
              <Button
                disabled={!rgpdChecked}
                onClick={handleDeleteUser}
                className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {t('deleteUser')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
