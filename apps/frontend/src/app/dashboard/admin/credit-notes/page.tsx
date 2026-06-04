'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/client-api';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { Button } from '@/components/ui/button';
import { formaterMonnaie as formatCurrency, formaterDate as formatDate } from '@/lib/utilitaires';
import { toast } from 'sonner';
import { useTranslations } from '@/lib/translations';

/* ---------- types ---------- */
interface CreditNote {
  id: string;
  creditNoteNumber: string;
  amount: number;
  reason: string;
  issuedAt: string;
  guestEmail: string | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    order: {
      id: string;
      user: { id: string; name: string | null; email: string } | null;
      guestEmail: string | null;
    };
  };
}

/* ---------- page ---------- */
export default function AdminCreditNotesPage() {
  const t = useTranslations('adminCreditNotes');
  const { token } = useAuthentificationStore();
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadCreditNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      const data = await api.get<{ data: CreditNote[]; meta: { totalPages: number; total: number } }>(
        `/api/credit-notes?${params}`, token!,
      );
      setCreditNotes(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
      setTotalCount(data.meta?.total || 0);
    } catch {
      toast.error(t('toasts.loadError'));
    } finally {
      setLoading(false);
    }
  }, [page, token]);

  useEffect(() => { loadCreditNotes(); }, [loadCreditNotes]);

  /* ---------- PDF download ---------- */
  const downloadCreditNotePdf = async (cn: CreditNote) => {
    await api.downloadBlob(`/credit-notes/${cn.id}/pdf`, `${cn.creditNoteNumber}.pdf`, token!);
  };

  /* ---------- send email ---------- */
  const sendByEmail = async (id: string, number: string) => {
    try {
      await api.post(`/api/credit-notes/${id}/send-email`, {}, token!);
      toast.success(`${t('toasts.emailSentPrefix')} ${number} ${t('toasts.emailSentSuffix')}`);
    } catch {
      toast.error(t('toasts.emailError'));
    }
  };

  /* ---------- render ---------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-poppins text-2xl font-semibold text-althea-dark">{t('pageTitle')}</h2>
        <p className="text-sm text-muted-foreground">
          {totalCount} {totalCount > 1 ? t('countPlural') : t('countSingular')}
        </p>
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
                  t('table.creditNoteNumber'),
                  t('table.linkedInvoice'),
                  t('table.date'),
                  t('table.client'),
                  t('table.amount'),
                  t('table.reason'),
                  t('table.actions'),
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {creditNotes.map((cn) => {
                const clientName = cn.invoice.order.user?.name ?? cn.invoice.order.guestEmail ?? cn.guestEmail ?? '—';
                const clientEmail = cn.invoice.order.user?.email ?? cn.invoice.order.guestEmail ?? '';
                return (
                  <tr key={cn.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono font-semibold text-red-700">{cn.creditNoteNumber}</td>
                    <td className="px-4 py-3 font-mono text-xs text-althea-dark">{cn.invoice.invoiceNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(cn.issuedAt)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{clientName}</p>
                      <p className="text-xs text-muted-foreground">{clientEmail}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-red-600">−{formatCurrency(cn.amount / 100)}</td>
                    <td className="max-w-[200px] px-4 py-3 text-xs text-muted-foreground truncate">{cn.reason}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => downloadCreditNotePdf(cn)} title={t('downloadTitle')}>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => sendByEmail(cn.id, cn.creditNoteNumber)} title={t('emailTitle')}>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {creditNotes.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">{t('emptyText')}</td></tr>
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
    </div>
  );
}
