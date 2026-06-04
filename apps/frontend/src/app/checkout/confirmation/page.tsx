'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/barre-navigation';
import { Footer } from '@/components/pied-page';
import { Button } from '@/components/ui/button';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { api } from '@/lib/client-api';
import { formatCurrency } from '@/lib/utilitaires';
import { toast } from 'sonner';
import { CheckCircle, Package, MapPin, CreditCard, FileText, Stethoscope } from 'lucide-react';
import { useTranslations, useLocale } from '@/lib/translations';

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

interface OrderAddress {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string | null;
}

interface OrderInvoice {
  id: string;
  invoiceNumber: string;
}

interface OrderConfirmation {
  id: string;
  status: string;
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  createdAt: string;
  address: OrderAddress | null;
  items: OrderItem[];
  invoice: OrderInvoice | null;
  user: { id: string; name: string | null; email: string } | null;
}

export default function ConfirmationPage() {
  const t = useTranslations('confirmation');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');
  const { token } = useAuthentificationStore();
  const [order, setOrder] = useState<OrderConfirmation | null>(null);
  const [loading, setLoading] = useState(true);

  const dateLocale = locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'fr-FR';

  const statusLabels: Record<string, string> = {
    PENDING: t('banner.status.PENDING'),
    CONFIRMED: t('banner.status.CONFIRMED'),
    PROCESSING: t('banner.status.PROCESSING'),
    SHIPPED: t('banner.status.SHIPPED'),
    DELIVERED: t('banner.status.DELIVERED'),
  };

  useEffect(() => {
    if (!orderId) {
      router.push('/dashboard/orders');
      return;
    }
    if (!token) return;

    const redirectStatus = searchParams.get('redirect_status');
    const loadOrder = () =>
      api.get<OrderConfirmation>(`/api/orders/${orderId}/confirmation`, token)
        .then(setOrder)
        .catch(() => {
          toast.error(t('notFound'));
          router.push('/dashboard/orders');
        })
        .finally(() => setLoading(false));

    if (redirectStatus === 'succeeded') {
      localStorage.removeItem('althea-cart');
      window.dispatchEvent(new Event('cart-updated'));
      api.post('/api/payments/confirm-order', { orderId })
        .catch(() => {})
        .finally(loadOrder);
    } else {
      loadOrder();
    }
  }, [orderId, token, router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto flex min-h-screen items-center justify-center px-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-althea-cta border-t-transparent" />
        </main>
        <Footer />
      </>
    );
  }

  if (!order) return null;

  const orderDate = new Date(order.createdAt).toLocaleDateString(dateLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <Navbar />
      <main className="container mx-auto min-h-screen px-4 py-8">
        <div className="mx-auto max-w-3xl">
          {/* Success banner */}
          <div className="mb-8 rounded-xl border border-green-200 bg-green-50 p-6 text-center">
            <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-500" />
            <h1 className="font-poppins text-2xl font-semibold text-althea-dark">
              {t('banner.title')}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t('banner.orderPrefix')}{' '}
              <span className="font-mono font-semibold text-althea-cta">{order.id.slice(0, 12)}...</span>
            </p>
            <p className="text-sm text-muted-foreground">{orderDate}</p>
            <span className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              {statusLabels[order.status] || order.status}
            </span>
          </div>

          {/* Products */}
          <section className="mb-6 rounded-xl border bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 font-poppins text-lg font-semibold text-althea-dark">
              <Package className="h-5 w-5" />
              {t('products.title')}
            </h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 rounded-lg border p-3">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                    {item.product.images.length > 0 ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Stethoscope className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="text-sm font-medium hover:text-althea-cta"
                    >
                      {item.product.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.unitPrice / 100)} {t('products.unitHT')} {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    {formatCurrency(item.total / 100)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('totals.subtotal')}</span>
                <span>{formatCurrency(order.subtotal / 100)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('totals.tax')}</span>
                <span>{formatCurrency(order.tax / 100)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('totals.shipping')}</span>
                <span>{order.shippingCost === 0 ? t('totals.free') : formatCurrency(order.shippingCost / 100)}</span>
              </div>
              <hr />
              <div className="flex justify-between font-poppins text-lg font-semibold">
                <span>{t('totals.total')}</span>
                <span className="text-althea-cta">{formatCurrency(order.total / 100)}</span>
              </div>
            </div>
          </section>

          {/* Address */}
          {order.address && (
            <section className="mb-6 rounded-xl border bg-card p-6">
              <h2 className="mb-3 flex items-center gap-2 font-poppins text-lg font-semibold text-althea-dark">
                <MapPin className="h-5 w-5" />
                {t('address.title')}
              </h2>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  {order.address.firstName} {order.address.lastName}
                </p>
                <p>{order.address.street}</p>
                <p>{order.address.postalCode} {order.address.city}</p>
                <p>{order.address.country}</p>
                {order.address.phone && <p>{t('address.phone')} {order.address.phone}</p>}
              </div>
            </section>
          )}

          {/* Payment info */}
          <section className="mb-6 rounded-xl border bg-card p-6">
            <h2 className="mb-3 flex items-center gap-2 font-poppins text-lg font-semibold text-althea-dark">
              <CreditCard className="h-5 w-5" />
              {t('payment.title')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('payment.stripe')}
            </p>
            {order.invoice && (
              <p className="mt-2 flex items-center gap-1 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                {t('payment.invoicePrefix')} {order.invoice.invoiceNumber}
              </p>
            )}
          </section>

          {/* Actions */}
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/dashboard/orders">
              <Button className="bg-althea-cta text-white hover:bg-althea-hover">
                {t('actions.myOrders')}
              </Button>
            </Link>
            <Link href="/products">
              <Button variant="outline">{t('actions.continueShopping')}</Button>
            </Link>
            {order.invoice && (
              <Button
                variant="outline"
                onClick={() =>
                  api.downloadBlob(
                    `/api/invoices/${order.invoice!.id}/pdf`,
                    `${order.invoice!.invoiceNumber}.pdf`,
                    token ?? undefined,
                  )
                }
              >
                <FileText className="mr-1 h-4 w-4" />
                {t('actions.downloadInvoice')}
              </Button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
