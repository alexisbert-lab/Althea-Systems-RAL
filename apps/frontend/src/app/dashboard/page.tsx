'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations, useLocale } from '@/lib/translations';
import { api } from '@/lib/client-api';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { formatCurrency } from '@/lib/utilitaires';
import Link from 'next/link';

/* ---------- types ---------- */
interface Kpis {
  revenue: { today: number; week: number; month: number };
  orders: { today: number; week: number; month: number; pending: number; total: number };
  products: { total: number; stockAlerts: number };
  users: { total: number };
  messages: { unread: number };
}

interface CategorySales {
  category: string;
  revenue: number;
}

interface StockAlert {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  images: string[];
  category: { name: string } | null;
}

interface RecentOrder {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  user: { name: string | null; email: string } | null;
  _count: { items: number };
}

interface TopProduct {
  productId: string;
  name: string;
  image: string | null;
  price: number;
  quantitySold: number;
  revenue: number;
}

interface SalesHistogram {
  data: Record<string, number | string>[];
  categories: string[];
}

/* ---------- constants ---------- */
const PIE_COLORS = [
  '#00a8b5', '#003d5c', '#33bfc9', '#10b981', '#F59E0B',
  '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6',
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-purple-100 text-purple-800',
  SHIPPED: 'bg-cyan-100 text-cyan-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
};

/* ---------- page ---------- */
export default function DashboardPage() {
  const t = useTranslations('dashboardPage');
  const locale = useLocale();
  const { token, user } = useAuthentificationStore();
  const isAdmin = user?.role === 'ADMIN';

  // Helper to get translated status label
  const getStatusLabel = (status: string) => ({
    label: t(`orderStatus.${status}` as any) || status,
    color: STATUS_COLORS[status] || 'bg-gray-100 text-gray-800',
  });

  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [salesByCategory, setSalesByCategory] = useState<CategorySales[]>([]);
  const [salesHistogram, setSalesHistogram] = useState<SalesHistogram | null>(null);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [chartDays, setChartDays] = useState(7);
  const [loading, setLoading] = useState(true);

  // User-specific orders
  const [myOrders, setMyOrders] = useState<any[]>([]);

  const loadAdminData = useCallback(async () => {
    if (!token) return;
    try {
      const [k, sales, histogram, alerts, orders, top] = await Promise.all([
        api.get<Kpis>('/api/dashboard/kpis', token).catch(() => null),
        api.get<CategorySales[]>(`/api/dashboard/sales-by-category?days=${chartDays}`, token).catch(() => []),
        api.get<SalesHistogram>(`/api/dashboard/sales-histogram?days=${chartDays}`, token).catch(() => null),
        api.get<StockAlert[]>('/api/dashboard/stock-alerts?limit=8', token).catch(() => []),
        api.get<RecentOrder[]>('/api/dashboard/recent-orders?limit=8', token).catch(() => []),
        api.get<TopProduct[]>('/api/dashboard/top-products?limit=5', token).catch(() => []),
      ]);
      if (k) setKpis(k);
      setSalesByCategory(sales as CategorySales[]);
      if (histogram) setSalesHistogram(histogram);
      setStockAlerts(alerts as StockAlert[]);
      setRecentOrders(orders as RecentOrder[]);
      setTopProducts(top as TopProduct[]);
    } catch {}
  }, [token, chartDays]);

  const loadUserData = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<{ data: any[] }>('/api/orders/my', token);
      setMyOrders(data.data?.slice(0, 5) || []);
    } catch {}
  }, [token]);

  useEffect(() => {
    setLoading(true);
    const promises = [loadUserData()];
    if (isAdmin) promises.push(loadAdminData());
    Promise.all(promises).finally(() => setLoading(false));
  }, [isAdmin, loadAdminData, loadUserData]);

  // Reload charts when period changes
  useEffect(() => {
    if (isAdmin && token) {
      Promise.all([
        api.get<CategorySales[]>(`/api/dashboard/sales-by-category?days=${chartDays}`, token).catch(() => []),
        api.get<SalesHistogram>(`/api/dashboard/sales-histogram?days=${chartDays}`, token).catch(() => null),
      ]).then(([sales, histogram]) => {
        setSalesByCategory(sales as CategorySales[]);
        if (histogram) setSalesHistogram(histogram);
      });
    }
  }, [chartDays, isAdmin, token]);

  /* ---------- render ---------- */
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-althea-cta border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-poppins text-2xl font-semibold text-althea-dark">
            {t('welcome')}{user?.name ? `, ${user.name}` : ''} !
          </h2>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? t('adminDashboard') : t('userDashboard')}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString(locale, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* ====== ADMIN SECTION ====== */}
      {isAdmin && kpis && (
        <>
          {/* KPI Cards Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* CA du jour */}
            <KpiCard
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title={t('kpi.revenueToday')}
              value={formatCurrency(kpis.revenue.today / 100)}
              subtitle={`${t('kpi.week')}: ${formatCurrency(kpis.revenue.week / 100)} · ${t('kpi.month')}: ${formatCurrency(kpis.revenue.month / 100)}`}
              color="bg-althea-cta"
            />

            {/* Commandes */}
            <KpiCard
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
              title={t('kpi.orders')}
              value={String(kpis.orders.total)}
              subtitle={`${t('kpi.today')}: ${kpis.orders.today} · ${t('kpi.pending')}: ${kpis.orders.pending}`}
              color="bg-althea-dark"
              badge={kpis.orders.pending > 0 ? kpis.orders.pending : undefined}
            />

            {/* Alertes stock */}
            <KpiCard
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              }
              title={t('kpi.stockAlerts')}
              value={String(kpis.products.stockAlerts)}
              subtitle={t('kpi.onXActiveProducts', { count: kpis.products.total })}
              color="bg-althea-warning"
              badge={kpis.products.stockAlerts > 0 ? kpis.products.stockAlerts : undefined}
              badgeColor="bg-althea-warning"
            />

            {/* Messages non lus */}
            <KpiCard
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
              title={t('kpi.unreadMessages')}
              value={String(kpis.messages.unread)}
              subtitle={t('kpi.registeredUsers', { count: kpis.users.total })}
              color="bg-althea-error"
              badge={kpis.messages.unread > 0 ? kpis.messages.unread : undefined}
              badgeColor="bg-althea-error"
            />
          </div>

          {/* Charts + Alerts Row */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Pie Chart — Sales by category */}
            <div className="rounded-xl border bg-card p-6 lg:col-span-3">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-poppins text-lg font-semibold text-althea-dark">
                  {t('salesByCategory.title')}
                </h3>
                <select
                  value={chartDays}
                  onChange={(e) => setChartDays(Number(e.target.value))}
                  className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                >
                  <option value={7}>{t('salesByCategory.last7days')}</option>
                  <option value={14}>{t('salesByCategory.last14days')}</option>
                  <option value={35}>{t('salesByCategory.last5weeks')}</option>
                  <option value={30}>{t('salesByCategory.lastMonth')}</option>
                  <option value={90}>{t('salesByCategory.last3months')}</option>
                </select>
              </div>

              {salesByCategory.length > 0 ? (
                <div className="flex flex-col gap-6 md:flex-row md:items-center">
                  {/* SVG Donut chart */}
                  <div className="mx-auto flex-shrink-0">
                    <DonutChart data={salesByCategory} totalLabel={t('salesByCategory.total')} />
                  </div>
                  {/* Legend */}
                  <div className="flex-1 space-y-2">
                    {salesByCategory.map((item, i) => {
                      const totalRevenue = salesByCategory.reduce((s, c) => s + c.revenue, 0);
                      const pct = totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : '0';
                      return (
                        <div key={i} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                            />
                            <span className="text-sm">{item.category}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium">
                              {formatCurrency(item.revenue / 100)}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">({pct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="py-12 text-center text-muted-foreground">
                  {t('salesByCategory.noSales')}
                </p>
              )}
            </div>

            {/* Stock Alerts sidebar */}
            <div className="rounded-xl border bg-card p-6 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-poppins text-lg font-semibold text-althea-dark">
                  {t('stockAlertsWidget.title')}
                </h3>
                <Link
                  href="/dashboard/admin/products"
                  className="text-sm text-althea-cta hover:underline"
                >
                  {t('stockAlertsWidget.viewAll')}
                </Link>
              </div>
              {stockAlerts.length > 0 ? (
                <div className="space-y-3">
                  {stockAlerts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.category?.name || '—'} · {product.sku || '—'}
                        </p>
                      </div>
                      <span
                        className={`ml-3 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          product.stock === 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {product.stock === 0 ? t('stockAlertsWidget.outOfStock') : `${product.stock} ${t('stockAlertsWidget.remaining')}`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  {t('stockAlertsWidget.noAlerts')}
                </p>
              )}
            </div>
          </div>

          {/* Multi-layer Sales Histogram */}
          {salesHistogram && salesHistogram.data.length > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-poppins text-lg font-semibold text-althea-dark">
                    {t('salesByCategory.title')}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('salesByCategory.histogramSubtitle')}</p>
                </div>
              </div>
              <StackedBarChart data={salesHistogram.data} categories={salesHistogram.categories} />
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/dashboard/admin/products"
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
              title={t('quickActions.addProduct')}
              description={t('quickActions.newMedicalEquipment')}
            />
            <QuickAction
              href="/dashboard/admin/orders?status=PENDING"
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
              title={t('quickActions.newOrder')}
              description={t('quickActions.createOrderManually')}
            />
            <QuickAction
              href="/dashboard/admin/orders"
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              }
              title={t('quickActions.manageOrders')}
              description={t('quickActions.pendingOrders', { count: kpis.orders.pending })}
            />
            <QuickAction
              href="/dashboard/admin/contacts"
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              }
              title={t('quickActions.messages')}
              description={t('quickActions.unread', { count: kpis.messages.unread })}
            />
            <QuickAction
              href="/dashboard/admin/users"
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              title={t('quickActions.users')}
              description={t('quickActions.registered', { count: kpis.users.total })}
            />
          </div>

          {/* Recent Orders + Top Products */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent orders table */}
            <div className="rounded-xl border bg-card p-6 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-poppins text-lg font-semibold text-althea-dark">
                  {t('recentOrdersTable.title')}
                </h3>
                <Link
                  href="/dashboard/admin/orders"
                  className="text-sm text-althea-cta hover:underline"
                >
                  {t('recentOrdersTable.viewAll')}
                </Link>
              </div>
              {recentOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                        <th className="pb-3 pr-4">{t('recentOrdersTable.orderNumber')}</th>
                        <th className="pb-3 pr-4">{t('recentOrdersTable.customer')}</th>
                        <th className="pb-3 pr-4">{t('recentOrdersTable.status')}</th>
                        <th className="pb-3 pr-4">{t('recentOrdersTable.items')}</th>
                        <th className="pb-3 text-right">{t('recentOrdersTable.totalIncTax')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {recentOrders.map((order) => {
                        const st = getStatusLabel(order.status);
                        return (
                          <tr key={order.id} className="hover:bg-accent/50">
                            <td className="py-3 pr-4">
                              <span className="font-mono text-xs">
                                #{order.id.slice(-8).toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <p className="font-medium">{order.user?.name || t('recentOrdersTable.guest')}</p>
                              <p className="text-xs text-muted-foreground">
                                {order.user?.email || '—'}
                              </p>
                            </td>
                            <td className="py-3 pr-4">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>
                                {st.label}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-center">{order._count.items}</td>
                            <td className="py-3 text-right font-medium">
                              {formatCurrency(order.total / 100)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  {t('recentOrdersTable.noOrders')}
                </p>
              )}
            </div>

            {/* Top Products */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="mb-4 font-poppins text-lg font-semibold text-althea-dark">
                {t('topProducts.title')}
              </h3>
              {topProducts.length > 0 ? (
                <div className="space-y-4">
                  {topProducts.map((product, i) => (
                    <div key={product.productId} className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-althea-bg text-sm font-bold text-althea-dark">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.quantitySold} {t('topProducts.sold')} ·{' '}
                          {formatCurrency(product.revenue / 100)} {t('topProducts.revenue')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  {t('topProducts.noSales')}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ====== USER SECTION (non-admin or also shown for admin) ====== */}
      {!isAdmin && (
        <>
          {/* Quick actions */}
          <div className="grid gap-4 sm:grid-cols-3">
            <QuickAction
              href="/products"
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
              title={t('quickActions.browseCatalog')}
              description={t('quickActions.cuttingEdgeMedical')}
            />
            <QuickAction
              href="/dashboard/orders"
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
              title={t('quickActions.myOrders')}
              description={t('quickActions.trackOrders')}
            />
            <QuickAction
              href="/dashboard/settings"
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              title={t('quickActions.settings')}
              description={t('quickActions.editProfile')}
            />
          </div>

          {/* Recent orders */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="mb-4 font-poppins text-lg font-semibold text-althea-dark">
              {t('myOrdersWidget.title')}
            </h3>
            {myOrders.length > 0 ? (
              <div className="space-y-3">
                {myOrders.map((order: any) => {
                  const st = getStatusLabel(order.status);
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent/50"
                    >
                      <div>
                        <p className="font-mono text-sm font-medium">
                          #{order.id?.slice(-8).toUpperCase()}
                        </p>
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency((order.total || 0) / 100)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString(locale)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">
                {t('myOrdersWidget.noOrders')}{' '}
                <Link href="/products" className="text-althea-cta hover:underline">
                  {t('myOrdersWidget.browseCatalog')}
                </Link>
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- components ---------- */

function KpiCard({
  icon,
  title,
  value,
  subtitle,
  color,
  badge,
  badgeColor = 'bg-althea-error',
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  color: string;
  badge?: number;
  badgeColor?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 font-poppins text-2xl font-semibold text-althea-dark">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className={`relative flex h-10 w-10 items-center justify-center rounded-lg text-white ${color}`}>
          {icon}
          {badge != null && badge > 0 && (
            <span className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href as any}
      className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:border-althea-cta hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-althea-bg text-althea-cta transition-colors group-hover:bg-althea-cta group-hover:text-white">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-althea-dark">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

/* ---------- SVG Stacked Bar Chart (M2) ---------- */
function StackedBarChart({
  data,
  categories,
}: {
  data: Record<string, number | string>[];
  categories: string[];
}) {
  const W = 600;
  const H = 220;
  const PAD = { top: 10, right: 10, bottom: 40, left: 52 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Compute max bar total
  const totals = data.map((d) => categories.reduce((s, c) => s + (Number(d[c]) || 0), 0));
  const maxVal = Math.max(...totals, 1);

  const barW = Math.max(4, chartW / data.length - 4);
  const barGap = (chartW - barW * data.length) / (data.length + 1);

  // Y axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: PAD.top + chartH * (1 - f),
    label: formatCurrency((maxVal * f) / 100),
  }));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 320 }}>
        {/* Y grid lines */}
        {yTicks.map((t) => (
          <g key={t.y}>
            <line x1={PAD.left} y1={t.y} x2={PAD.left + chartW} y2={t.y} stroke="currentColor" strokeOpacity={0.08} />
            <text x={PAD.left - 4} y={t.y + 4} textAnchor="end" fontSize={9} fill="currentColor" fillOpacity={0.5}>
              {t.label}
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const x = PAD.left + barGap + i * (barW + barGap);
          let yOffset = PAD.top + chartH;
          return (
            <g key={String(d.date)}>
              {categories.map((cat, ci) => {
                const val = Number(d[cat]) || 0;
                const barH = (val / maxVal) * chartH;
                yOffset -= barH;
                return (
                  <rect
                    key={cat}
                    x={x}
                    y={yOffset}
                    width={barW}
                    height={barH}
                    fill={PIE_COLORS[ci % PIE_COLORS.length]}
                    rx={ci === categories.length - 1 ? 2 : 0}
                  >
                    <title>{cat}: {formatCurrency(val / 100)}</title>
                  </rect>
                );
              })}
              {/* X label */}
              <text
                x={x + barW / 2}
                y={PAD.top + chartH + 14}
                textAnchor="middle"
                fontSize={8}
                fill="currentColor"
                fillOpacity={0.5}
              >
                {String(d.date).slice(5)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {categories.map((cat, i) => (
          <div key={cat} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
            {cat}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- SVG Donut Chart ---------- */
function DonutChart({ data, totalLabel }: { data: CategorySales[]; totalLabel: string }) {
  const total = data.reduce((sum, d) => sum + d.revenue, 0);
  if (total === 0) return null;

  const size = 180;
  const strokeWidth = 35;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((item, i) => {
        const percent = item.revenue / total;
        const offset = circumference * (1 - percent);
        const rotation = cumulativePercent * 360 - 90;
        cumulativePercent += percent;

        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={PIE_COLORS[i % PIE_COLORS.length]}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference}`}
            strokeDashoffset={offset}
            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
            className="transition-all duration-300"
          />
        );
      })}
      {/* Center text */}
      <text
        x={size / 2}
        y={size / 2 - 8}
        textAnchor="middle"
        className="fill-althea-dark text-xs font-semibold"
      >
        {totalLabel}
      </text>
      <text
        x={size / 2}
        y={size / 2 + 12}
        textAnchor="middle"
        className="fill-althea-dark text-sm font-bold"
      >
        {formatCurrency(total / 100)}
      </text>
    </svg>
  );
}
