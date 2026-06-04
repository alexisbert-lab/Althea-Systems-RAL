'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/client-api';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { Button } from '@/components/ui/button';
import { formaterMonnaie as formatCurrency, formaterDate as formatDate } from '@/lib/utilitaires';
import { toast } from 'sonner';
import { useTranslations } from '@/lib/translations';

/* ---------- types ---------- */
interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'CANCELED';
  issuedAt: string;
  canceledAt: string | null;
  guestEmail: string | null;
  order: {
    id: string;
    subtotal: number;
    tax: number;
    shippingCost: number;
    total: number;
    stripePaymentId: string | null;
    user: { id: string; name: string | null; email: string } | null;
    address: {
      firstName: string; lastName: string; street: string;
      city: string; postalCode: string; phone: string | null;
    } | null;
    items: Array<{
      id: string; quantity: number; unitPrice: number; total: number;
      product: { name: string };
    }>;
  };
  creditNote: { creditNoteNumber: string } | null;
}

/* ---------- constants ---------- */
const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  PAID:     { color: 'text-green-800',  bg: 'bg-green-50 border-green-200' },
  PENDING:  { color: 'text-yellow-800', bg: 'bg-yellow-50 border-yellow-200' },
  CANCELED: { color: 'text-red-800',    bg: 'bg-red-50 border-red-200' },
};

/* ---------- page ---------- */
export default function AdminInvoicesPage() {
  const t = useTranslations('adminInvoices');
  const { token } = useAuthentificationStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [cancelModal, setCancelModal] = useState<{ id: string; number: string } | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const data = await api.get<{ data: Invoice[]; meta: { totalPages: number; total: number } }>(
        `/api/invoices?${params}`, token!,
      );
      setInvoices(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
      setTotalCount(data.meta?.total || 0);
    } catch {
      toast.error(t('toasts.loadError'));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, token]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  /* ---------- PDF download ---------- */
  const downloadInvoicePdf = async (invoice: Invoice) => {
    await api.downloadBlob(`/api/invoices/${invoice.id}/pdf`, `${invoice.invoiceNumber}.pdf`, token!);
  };

  /* ---------- send email ---------- */
  const sendByEmail = async (id: string, number: string) => {
    try {
      await api.post(`/api/invoices/${id}/send-email`, {}, token!);
      toast.success(`${t('toasts.emailSentPrefix')} ${number} ${t('toasts.emailSentSuffix')}`);
    } catch {
      toast.error(t('toasts.emailError'));
    }
  };

  /* ---------- cancel + avoir ---------- */
  const confirmCancel = async () => {
    if (!cancelModal) return;
    try {
      await api.post(`/api/invoices/${cancelModal.id}/cancel`, { reason: cancelReason || t('cancelReasonDefault') }, token!);
      toast.success(`${t('toasts.cancelledPrefix')} ${cancelModal.number} ${t('toasts.cancelledSuffix')}`);
      setCancelModal(null);
      setCancelReason('');
      loadInvoices();
    } catch (err: any) {
      toast.error(err.message || t('toasts.cancelError'));
    }
  };

  /* ---------- render ---------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-poppins text-2xl font-semibold text-althea-dark">{t('pageTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {totalCount} {totalCount > 1 ? t('countPlural') : t('countSingular')}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {[
            { k: '', l: t('filter.all') },
            { k: 'PAID', l: t('filter.paid') },
            { k: 'PENDING', l: t('filter.pending') },
            { k: 'CANCELED', l: t('filter.canceled') },
          ].map(({ k, l }) => (
            <button key={k} onClick={() => { setStatusFilter(k); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === k ? 'bg-althea-cta text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-althea-cta border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {[
                  t('table.invoiceNumber'),
                  t('table.date'),
                  t('table.client'),
                  t('table.order'),
                  t('table.amountTTC'),
                  t('table.status'),
                  t('table.creditNote'),
                  t('table.actions'),
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((inv) => {
                const cfg = STATUS_COLORS[inv.status] ?? STATUS_COLORS.PENDING;
                const clientName = inv.order.user?.name ?? inv.guestEmail ?? '—';
                const clientEmail = inv.order.user?.email ?? inv.guestEmail ?? '';
                return (
                  <tr key={inv.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono font-semibold text-althea-dark">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.issuedAt)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{clientName}</p>
                      <p className="text-xs text-muted-foreground">{clientEmail}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      #{inv.order.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(inv.amount / 100)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        {t(`status.${inv.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {inv.creditNote?.creditNoteNumber ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => downloadInvoicePdf(inv)} title={t('downloadTitle')}>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => sendByEmail(inv.id, inv.invoiceNumber)} title={t('emailTitle')}>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </Button>
                        {inv.status !== 'CANCELED' && !inv.creditNote && (
                          <Button size="sm" variant="outline"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => setCancelModal({ id: inv.id, number: inv.invoiceNumber })}
                            title={t('cancelTitle')}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {invoices.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">{t('emptyText')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t('pagination.page')} {page} / {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('pagination.prev')}</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t('pagination.next')}</Button>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-semibold text-althea-dark">{t('modal.title')}</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {t('modal.descPrefix')} <strong>{cancelModal.number}</strong> {t('modal.descSuffix')}
            </p>
            <label className="mb-1 block text-sm font-medium">{t('modal.reasonLabel')}</label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t('modal.reasonPlaceholder')}
              className="mb-4 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setCancelModal(null); setCancelReason(''); }}>
                {t('modal.cancelBtn')}
              </Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={confirmCancel}>
                {t('modal.confirmBtn')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
