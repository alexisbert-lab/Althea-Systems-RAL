'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from '@/lib/translations';
import { api } from '@/lib/client-api';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utilitaires';
import { toast } from 'sonner';

/* ---------- types ---------- */
interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  total: number;
  product: {
    id: string;
    name: string;
    slug: string;
    images: string[];
  };
}

interface Order {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  shippingCost: number;
  currency: string;
  stripePaymentId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string | null; email: string } | null;
  guestEmail?: string | null;
  address?: {
    firstName: string;
    lastName: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string | null;
  } | null;
  items: OrderItem[];
  invoice?: { id: string; invoiceNumber: string } | null;
  statusHistory?: { id: string; status: string; createdAt: string }[];
  _count?: { items: number };
}

/* ---------- constants ---------- */
const STATUS_OPTIONS = [
  'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELED', 'REFUNDED',
] as const;

const STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  PENDING: { color: 'text-yellow-800', bg: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-500' },
  CONFIRMED: { color: 'text-blue-800', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  PROCESSING: { color: 'text-purple-800', bg: 'bg-purple-50 border-purple-200', dot: 'bg-purple-500' },
  SHIPPED: { color: 'text-cyan-800', bg: 'bg-cyan-50 border-cyan-200', dot: 'bg-cyan-500' },
  DELIVERED: { color: 'text-green-800', bg: 'bg-green-50 border-green-200', dot: 'bg-green-500' },
  CANCELED: { color: 'text-red-800', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  REFUNDED: { color: 'text-gray-800', bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-500' },
};

/* ---------- page ---------- */
export default function AdminOrdersPage() {
  const t = useTranslations('admin.orders');
  const tCommon = useTranslations('common');
  const tStatus = useTranslations('dashboardPage.orderStatus');
  const { token } = useAuthentificationStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Order | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const data = await api.get<{ data: Order[]; meta: { totalPages: number; total: number } }>(
        `/api/orders?${params}`,
        token!,
      );
      setOrders(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
      setTotalCount(data.meta?.total || 0);
    } catch {
      toast.error(t('loadingError'));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  /* ---------- order detail ---------- */
  const toggleOrderDetail = async (orderId: string) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      setExpandedDetails(null);
      return;
    }

    try {
      const detail = await api.get<Order>(`/api/orders/${orderId}`, token!);
      setExpandedDetails(detail);
      setExpandedOrder(orderId);
    } catch {
      toast.error(t('loadingError'));
    }
  };

  /* ---------- status update ---------- */
  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.put(`/api/orders/${orderId}/status`, { status: newStatus }, token!);
      toast.success(t('updateSuccess'));
      loadOrders();
      if (expandedOrder === orderId) {
        const detail = await api.get<Order>(`/api/orders/${orderId}`, token!);
        setExpandedDetails(detail);
      }
    } catch (err: any) {
      toast.error(err.message || tCommon('error'));
    }
  };

  /* ---------- invoice PDF download ---------- */
  const generateInvoice = async (order: Order) => {
    if (!order.invoice) {
      toast.error(t('noInvoice'));
      return;
    }
    try {
      await api.downloadBlob(
        `/api/invoices/${order.invoice.id}/pdf`,
        `${order.invoice.invoiceNumber}.pdf`,
        token!,
      );
    } catch {
      toast.error(t('invoiceDownloadError'));
    }
  };

  /* ---------- render ---------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-poppins text-2xl font-semibold text-althea-dark">
            {t('title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('totalOrders', { count: totalCount })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Status filter pills */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => { setStatusFilter(''); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                !statusFilter ? 'bg-althea-cta text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {t('allStatuses')}
            </button>
            {STATUS_OPTIONS.map((s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? `${cfg.bg} ${cfg.color} border`
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                  {tStatus(s)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-althea-cta border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
            const isExpanded = expandedOrder === order.id;
            const orderNum = order.id.slice(-8).toUpperCase();

            return (
              <div key={order.id} className={`rounded-xl border transition-shadow ${isExpanded ? 'shadow-md' : 'hover:shadow-sm'}`}>
                {/* Order row */}
                <div
                  className="flex cursor-pointer flex-wrap items-center gap-4 p-4"
                  onClick={() => toggleOrderDetail(order.id)}
                >
                  {/* Status dot */}
                  <span className={`h-3 w-3 flex-shrink-0 rounded-full ${cfg.dot}`} />

                  {/* Order number */}
                  <div className="min-w-[100px]">
                    <p className="font-mono text-sm font-semibold">#{orderNum}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>

                  {/* Client */}
                  <div className="min-w-[150px] flex-1">
                    <p className="text-sm font-medium">
                      {order.user?.name || order.guestEmail || t('guest')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.user?.email || ''}
                    </p>
                  </div>

                  {/* Articles count */}
                  <div className="text-center">
                    <p className="text-sm font-medium">{order._count?.items || '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {(order._count?.items || 0) > 1 ? t('articlePlural') : t('articleSingular')}
                    </p>
                  </div>

                  {/* Total */}
                  <div className="text-right">
                    <p className="text-sm font-semibold text-althea-dark">
                      {formatCurrency(order.total / 100)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('ttc')}</p>
                  </div>

                  {/* Status badge */}
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                    {tStatus(order.status)}
                  </span>

                  {/* Expand arrow */}
                  <svg
                    className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Expanded detail */}
                {isExpanded && expandedDetails && (
                  <div className="border-t bg-muted/30 px-4 pb-4 pt-3">
                    <div className="grid gap-6 lg:grid-cols-3">
                      {/* Items */}
                      <div className="lg:col-span-2">
                        <h4 className="mb-3 font-poppins text-sm font-semibold text-althea-dark">
                          {t('detail.orderedItems')}
                        </h4>
                        <div className="space-y-2">
                          {expandedDetails.items?.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 rounded-lg bg-background p-3">
                              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                                {item.product?.images?.[0] ? (
                                  <img
                                    src={item.product.images[0]}
                                    alt={item.product.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">—</div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{item.product?.name || t('detail.productFallback')}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatCurrency(item.unitPrice / 100)} × {item.quantity}
                                </p>
                              </div>
                              <p className="font-medium">{formatCurrency(item.total / 100)}</p>
                            </div>
                          ))}
                        </div>

                        {/* Totals */}
                        <div className="mt-4 space-y-1 rounded-lg bg-background p-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('detail.subtotalExclTax')}</span>
                            <span>{formatCurrency(expandedDetails.subtotal / 100)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('detail.tax')}</span>
                            <span>{formatCurrency(expandedDetails.tax / 100)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('detail.shipping')}</span>
                            <span>{expandedDetails.shippingCost === 0 ? t('detail.shippingFree') : formatCurrency(expandedDetails.shippingCost / 100)}</span>
                          </div>
                          <div className="flex justify-between border-t pt-1 text-sm font-bold text-althea-dark">
                            <span>{t('detail.totalInclTax')}</span>
                            <span>{formatCurrency(expandedDetails.total / 100)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Sidebar: Client + Status + Actions */}
                      <div className="space-y-4">
                        {/* Client info */}
                        <div className="rounded-lg bg-background p-3">
                          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{t('detail.clientSection')}</h4>
                          <p className="text-sm font-medium">
                            {expandedDetails.user?.name || expandedDetails.guestEmail || t('guest')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {expandedDetails.user?.email || ''}
                          </p>
                        </div>

                        {/* Delivery address */}
                        {expandedDetails.address && (
                          <div className="rounded-lg bg-background p-3">
                            <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                              {t('detail.shippingAddress')}
                            </h4>
                            <p className="text-sm">
                              {expandedDetails.address.firstName} {expandedDetails.address.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {expandedDetails.address.street}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {expandedDetails.address.postalCode} {expandedDetails.address.city}
                            </p>
                            {expandedDetails.address.phone && (
                              <p className="text-xs text-muted-foreground">
                                {t('detail.phone')}: {expandedDetails.address.phone}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Payment */}
                        <div className="rounded-lg bg-background p-3">
                          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                            {t('detail.paymentSection')}
                          </h4>
                          {expandedDetails.stripePaymentId ? (
                            <>
                              <p className="text-sm text-green-600">{t('detail.paidViaStripe')}</p>
                              <p className="break-all text-xs text-muted-foreground">
                                {expandedDetails.stripePaymentId}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-yellow-600">{t('detail.awaitingPayment')}</p>
                          )}
                        </div>

                        {/* Change status */}
                        <div className="rounded-lg bg-background p-3">
                          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                            {t('detail.changeStatus')}
                          </h4>
                          <div className="grid grid-cols-2 gap-1">
                            {STATUS_OPTIONS.map((s) => {
                              const sc = STATUS_CONFIG[s];
                              const isCurrent = expandedDetails.status === s;
                              return (
                                <button
                                  key={s}
                                  disabled={isCurrent}
                                  onClick={() => updateStatus(expandedDetails.id, s)}
                                  className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                                    isCurrent
                                      ? `${sc.bg} ${sc.color} border`
                                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                  }`}
                                >
                                  <span className={`h-2 w-2 rounded-full ${sc.dot}`} />
                                  {tStatus(s)}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateInvoice(expandedDetails)}
                            className="w-full"
                          >
                            <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {t('detail.downloadInvoice')}
                          </Button>
                          {expandedDetails.status === 'DELIVERED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-red-500 hover:bg-red-50"
                              onClick={() => updateStatus(expandedDetails.id, 'REFUNDED')}
                            >
                              {t('detail.refundBtn')}
                            </Button>
                          )}
                        </div>

                        {/* Status history */}
                        {expandedDetails.statusHistory && expandedDetails.statusHistory.length > 0 && (
                          <div className="rounded-lg bg-background p-3">
                            <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{t('detail.statusHistory')}</h4>
                            <ol className="relative border-l border-muted">
                              {expandedDetails.statusHistory.map((entry) => {
                                const cfg = STATUS_CONFIG[entry.status] || { color: 'text-gray-700', dot: 'bg-gray-400' };
                                return (
                                  <li key={entry.id} className="mb-2 ml-3 last:mb-0">
                                    <span className={`absolute -left-1.5 mt-0.5 h-3 w-3 rounded-full ${cfg.dot}`} />
                                    <p className={`text-xs font-medium ${cfg.color}`}>{tStatus(entry.status as any) || entry.status}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(entry.createdAt).toLocaleString('fr-FR')}
                                    </p>
                                  </li>
                                );
                              })}
                            </ol>
                          </div>
                        )}

                        {/* Notes */}
                        {expandedDetails.notes && (
                          <div className="rounded-lg bg-yellow-50 p-3">
                            <h4 className="mb-1 text-xs font-semibold uppercase text-yellow-700">
                              Notes
                            </h4>
                            <p className="text-sm text-yellow-800">{expandedDetails.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {orders.length === 0 && (
            <div className="rounded-xl border bg-card p-12 text-center">
              <p className="text-muted-foreground">{tCommon('noResults')}</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {tCommon('page')} {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              ← {tCommon('previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              {tCommon('next')} →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
