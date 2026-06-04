'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/translations';
import { api } from '@/lib/client-api';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { formaterMonnaie as formatCurrency, formaterDate as formatDate } from '@/lib/utilitaires';
import { Tag, Search, Filter, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface OrderInvoice {
  id: string;
  invoiceNumber: string;
}

interface Order {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  shippingCost: number;
  createdAt: string;
  guestEmail?: string | null;
  paymentLast4?: string | null;
  invoice?: OrderInvoice | null;
  address?: {
    firstName: string; lastName: string; street: string;
    city: string; postalCode: string; phone: string | null;
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    total: number;
    product: { id: string; name: string; slug: string; images: string[]; price: number };
  }>;
}


const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-indigo-100 text-indigo-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
};

const STATUS_KEYS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELED', 'REFUNDED'];


export default function OrdersPage() {
  const t = useTranslations('admin.myOrders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthentificationStore();
  const router = useRouter();

  const downloadInvoicePdf = async (invoice: OrderInvoice) => {
    await api.downloadBlob(`/api/invoices/${invoice.id}/pdf`, `${invoice.invoiceNumber}.pdf`, token!);
  };

  const renewOrder = (order: Order) => {
    const existing = JSON.parse(localStorage.getItem('althea-cart') || '[]');
    const updated = [...existing];
    for (const item of order.items) {
      const idx = updated.findIndex((c: any) => c.productId === item.product.id);
      if (idx >= 0) updated[idx].quantity += item.quantity;
      else updated.push({
        productId: item.product.id,
        slug: item.product.slug,
        name: item.product.name,
        price: item.product.price,
        image: item.product.images?.[0] || '',
        quantity: item.quantity,
      });
    }
    localStorage.setItem('althea-cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cart-updated'));
    toast.success(t('addedToCart'));
    router.push('/cart');
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  useEffect(() => {
    loadOrders();
  }, [selectedYear, selectedStatus]);

  const loadOrders = async () => {
    try {
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (selectedYear) params.set('year', selectedYear);
      if (selectedStatus) params.set('status', selectedStatus);

      const data = await api.get<{ data: Order[] }>(`/api/orders/my?${params}`, token!);
      setOrders(data.data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Client-side search filter
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter((order) =>
      order.items.some((item) => item.product.name.toLowerCase().includes(q)) ||
      order.id.toLowerCase().includes(q) ||
      new Date(order.createdAt).toLocaleDateString('fr-FR').includes(q),
    );
  }, [orders, searchQuery]);

  // Group by year
  const groupedByYear = useMemo(() => {
    const groups: Record<number, Order[]> = {};
    for (const order of filteredOrders) {
      const year = new Date(order.createdAt).getFullYear();
      if (!groups[year]) groups[year] = [];
      groups[year].push(order);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, orders]) => ({ year: Number(year), orders }));
  }, [filteredOrders]);

  // Available years for filter
  const availableYears = useMemo(() => {
    const years = new Set(orders.map((o) => new Date(o.createdAt).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [orders]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('title')}</h2>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-lg border bg-muted pl-10 pr-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="rounded-lg border bg-muted px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">{t('allYears')}</option>
          {availableYears.map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="rounded-lg border bg-muted px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">{t('allStatuses')}</option>
          {STATUS_KEYS.map((k) => (
            <option key={k} value={k}>{t(`status.${k}`)}</option>
          ))}
        </select>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-lg border p-12 text-center">
          <p className="text-lg text-muted-foreground">{t('noOrders')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByYear.map(({ year, orders: yearOrders }) => (
            <div key={year}>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-muted-foreground">
                <Filter className="h-4 w-4" />
                {year}
                <span className="text-sm font-normal">({yearOrders.length} {yearOrders.length > 1 ? t('orderCountPlural') : t('orderCountSingular')})</span>
              </h3>

              <div className="space-y-4">
                {yearOrders.map((order) => (
                  <div key={order.id} className="rounded-lg border bg-card">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b p-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t('orderPrefix')}{order.id.slice(-8).toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </p>
                        {order.invoice && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            {order.invoice.invoiceNumber}
                          </p>
                        )}
                        {order.paymentLast4 && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Tag className="h-3 w-3" />
                            {t('cardPrefix')} {order.paymentLast4}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            statusColors[order.status] || 'bg-gray-100'
                          }`}
                        >
                          {t(`status.${order.status}`) || order.status}
                        </span>
                        <span className="font-semibold">{formatCurrency(order.total / 100)}</span>
                        {order.invoice && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadInvoicePdf(order.invoice!)}
                          >
                            <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {t('invoicePdf')}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => renewOrder(order)}
                          title={t('renewTitle')}
                        >
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                          {t('renewBtn')}
                        </Button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 text-sm">
                            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
                              {item.product.images?.[0] ? (
                                <img src={item.product.images[0]} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center"><Tag className="h-4 w-4 text-muted-foreground" /></div>
                              )}
                            </div>
                            <div className="flex-1">
                              <span className="font-medium">{item.product.name}</span>
                              <span className="text-muted-foreground"> x{item.quantity}</span>
                            </div>
                            <span>{formatCurrency(item.total / 100)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
