'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Navbar } from '@/components/barre-navigation';
import { Footer } from '@/components/pied-page';
import { Button } from '@/components/ui/button';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { api } from '@/lib/client-api';
import { formatCurrency } from '@/lib/utilitaires';
import { toast } from 'sonner';
import { Lock, Stethoscope, MapPin, Package, CreditCard, ShieldCheck } from 'lucide-react';
import { useTranslations } from '@/lib/translations';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  stock: number;
}

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

interface ShippingInfo {
  amount: number;
  type: string;
  label: string;
  message?: string;
}

/* ---------- Payment Form (child of Elements provider) ---------- */
function PaymentForm({
  orderId,
  total,
  onBack,
  shippingInfo,
}: {
  orderId: string;
  total: number;
  onBack: () => void;
  shippingInfo: ShippingInfo | null;
}) {
  const t = useTranslations('checkout');
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/confirmation?orderId=${orderId}`,
      },
    });

    if (error) {
      setErrorMessage(error.message || t('payment.error'));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6 rounded-lg border border-althea-cta/20 bg-althea-bg/30 p-4">
        <p className="text-sm text-muted-foreground">
          <Lock className="mr-1 inline h-4 w-4" /> {t('payment.secureInfo')}
        </p>
      </div>

      <PaymentElement />

      {errorMessage && (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>
      )}

      {shippingInfo?.type === 'CUSTOM' && (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-700">
          {shippingInfo.message || t('payment.contactForQuote')}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          {t('payment.back')}
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-althea-cta text-white hover:bg-althea-hover"
        >
          {loading ? t('payment.processing') : `${t('payment.pay')} ${formatCurrency(total / 100)}`}
        </Button>
      </div>
    </form>
  );
}

/* ---------- Checkout Page ---------- */
export default function CheckoutPage() {
  const t = useTranslations('checkout');
  const { isAuthenticated, token } = useAuthentificationStore();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [newAddress, setNewAddress] = useState({
    firstName: '', lastName: '', street: '', city: '', postalCode: '', country: 'FR', phone: '', label: '',
  });
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [savedAddressId, setSavedAddressId] = useState('');

  // Billing address state
  const [billingSameAsDelivery, setBillingSameAsDelivery] = useState(true);
  const [billingAddressId, setBillingAddressId] = useState('');
  const [billingNewAddress, setBillingNewAddress] = useState({
    firstName: '', lastName: '', street: '', city: '', postalCode: '', country: 'FR', phone: '',
  });
  const [useBillingNewAddress, setUseBillingNewAddress] = useState(false);

  // Stripe state
  const [orderId, setOrderId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const steps = [
    { id: 1, label: t('steps.login') },
    { id: 2, label: t('steps.address') },
    { id: 3, label: t('steps.recap') },
    { id: 4, label: t('steps.payment') },
  ];

  // Load cart from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('althea-cart') || '[]');
      setCart(stored);
    } catch { setCart([]); }
  }, []);

  // Skip step 1 if already logged in
  useEffect(() => {
    if (isAuthenticated && step === 1) {
      setStep(2);
    }
  }, [isAuthenticated, step]);

  // Load addresses when entering step 2
  useEffect(() => {
    if (step === 2 && isAuthenticated) {
      loadAddresses();
    }
  }, [step, isAuthenticated]);

  const loadAddresses = async () => {
    try {
      const data = await api.get<Address[]>('/api/addresses', token!);
      setAddresses(data);
      const defaultAddr = data.find((a) => a.isDefault);
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
    } catch {}
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = Math.round(subtotal * 0.2);
  const shipping = shippingInfo?.amount ?? 0;
  const total = subtotal + tax + shipping;

  useEffect(() => {
    if (subtotal > 0) {
      api.get<ShippingInfo>(`/api/shipping-rules/calculate?subtotal=${subtotal}`)
        .then(setShippingInfo)
        .catch(() => setShippingInfo({ amount: 499, type: 'FLAT', label: t('shippingStandard') }));
    }
  }, [subtotal]);

  // Move from step 2 (address) to step 3 (recap)
  const handleGoToRecap = async () => {
    if (useNewAddress) {
      try {
        const created = await api.post<Address>('/api/addresses', newAddress, token!);
        setSavedAddressId(created.id);
        setSelectedAddressId(created.id);
        setAddresses((prev) => [...prev, { ...created, isDefault: false }]);
      } catch (err: any) {
        toast.error(err?.message || t('toasts.addressError'));
        return;
      }
    } else {
      setSavedAddressId(selectedAddressId);
    }
    setStep(3);
  };

  // Create order + PaymentIntent from recap step, then move to step 4
  const handleConfirmAndPay = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const addressId = savedAddressId || selectedAddressId;

      // Resolve billing address
      let resolvedBillingAddressId: string | undefined;
      if (!billingSameAsDelivery) {
        if (useBillingNewAddress) {
          if (!billingNewAddress.firstName || !billingNewAddress.lastName || !billingNewAddress.street || !billingNewAddress.city || !billingNewAddress.postalCode) {
            toast.error(t('toasts.billingRequired'));
            setLoading(false);
            return;
          }
          const createdBilling = await api.post<Address>('/api/addresses', billingNewAddress, token!);
          resolvedBillingAddressId = createdBilling.id;
        } else {
          resolvedBillingAddressId = billingAddressId || undefined;
        }
      }

      // Verify stock availability before creating order
      const stockCheck = await api.post<{ productId: string; available: boolean; reason?: string }[]>(
        '/api/products/check-availability',
        { items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })) },
      );
      const unavailable = stockCheck.filter((s) => !s.available);
      if (unavailable.length > 0) {
        const reasons = unavailable.map((u) => u.reason || t('toasts.stockInsufficient')).join(', ');
        toast.error(`${t('toasts.stockUnavailable')} ${reasons}`);
        setLoading(false);
        return;
      }

      // Create order (status: PENDING)
      const order = await api.post<{ id: string }>(
        '/api/orders',
        {
          addressId: addressId || undefined,
          billingAddressId: resolvedBillingAddressId,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
        token!,
      );
      setOrderId(order.id);

      // Create PaymentIntent
      const { clientSecret: cs } = await api.post<{ clientSecret: string }>(
        '/api/payments/create-intent',
        { orderId: order.id },
        token!,
      );
      setClientSecret(cs);
      setStep(4);
    } catch (err: any) {
      toast.error(err?.message || t('toasts.orderError'));
    } finally {
      setLoading(false);
    }
  };

  const selectedAddress = addresses.find((a) => a.id === (savedAddressId || selectedAddressId));

  if (cart.length === 0 && step < 4) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto min-h-screen px-4 py-16 text-center">
          <h1 className="font-poppins text-2xl font-semibold text-althea-dark">{t('emptyCart.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('emptyCart.desc')}</p>
          <Link href="/products">
            <Button className="mt-6 bg-althea-cta text-white hover:bg-althea-hover">
              {t('emptyCart.cta')}
            </Button>
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto min-h-screen px-4 py-8">
        <h1 className="mb-6 font-poppins text-2xl font-semibold text-althea-dark">{t('pageTitle')}</h1>

        {/* Stepper */}
        <div className="mb-10 flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                  step >= s.id
                    ? 'bg-althea-cta text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > s.id ? '✓' : s.id}
              </div>
              <span className={`ml-2 hidden text-sm sm:inline ${step >= s.id ? 'text-althea-dark font-medium' : 'text-gray-400'}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div className={`mx-3 h-px w-8 sm:w-12 ${step > s.id ? 'bg-althea-cta' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: Step content */}
          <div className="lg:col-span-2">
            {/* Step 1: Login */}
            {step === 1 && (
              <div className="rounded-xl border bg-card p-6">
                <h2 className="mb-4 font-poppins text-lg font-semibold">{t('step1.title')}</h2>
                <p className="mb-4 text-muted-foreground">{t('step1.desc')}</p>
                <div className="flex gap-3">
                  <Link href="/auth/login?redirect=/checkout">
                    <Button className="bg-althea-cta text-white hover:bg-althea-hover">
                      {t('step1.login')}
                    </Button>
                  </Link>
                  <Link href="/auth/register?redirect=/checkout">
                    <Button variant="outline">{t('step1.register')}</Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Step 2: Address */}
            {step === 2 && (
              <div className="rounded-xl border bg-card p-6">
                <h2 className="mb-4 font-poppins text-lg font-semibold">{t('step2.title')}</h2>

                {addresses.length > 0 && !useNewAddress && (
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                          selectedAddressId === addr.id ? 'border-althea-cta bg-althea-bg/50' : 'hover:bg-muted/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          value={addr.id}
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="mt-1 accent-[#00a8b5]"
                        />
                        <div>
                          <p className="font-medium">{addr.firstName} {addr.lastName}</p>
                          <p className="text-sm text-muted-foreground">{addr.street}</p>
                          <p className="text-sm text-muted-foreground">{addr.postalCode} {addr.city}</p>
                          {addr.phone && <p className="text-sm text-muted-foreground">{t('step2.phone')} {addr.phone}</p>}
                          {addr.label && <span className="mt-1 inline-block rounded bg-althea-bg px-2 py-0.5 text-xs">{addr.label}</span>}
                        </div>
                      </label>
                    ))}
                    <button
                      onClick={() => setUseNewAddress(true)}
                      className="text-sm text-althea-cta hover:underline"
                    >
                      {t('step2.addNew')}
                    </button>
                  </div>
                )}

                {(addresses.length === 0 || useNewAddress) && (
                  <div className="space-y-4">
                    {useNewAddress && (
                      <button onClick={() => setUseNewAddress(false)} className="text-sm text-althea-cta hover:underline">
                        {t('step2.useExisting')}
                      </button>
                    )}
                    <fieldset>
                      <legend className="sr-only">{t('step2.title')}</legend>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="addr-firstname" className="mb-1 block text-xs font-medium text-muted-foreground">{t('step2.firstName')}</label>
                          <input
                            id="addr-firstname"
                            placeholder={t('step2.firstName')}
                            value={newAddress.firstName}
                            onChange={(e) => setNewAddress({ ...newAddress, firstName: e.target.value })}
                            aria-required="true"
                            autoComplete="given-name"
                            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                          />
                        </div>
                        <div>
                          <label htmlFor="addr-lastname" className="mb-1 block text-xs font-medium text-muted-foreground">{t('step2.lastName')}</label>
                          <input
                            id="addr-lastname"
                            placeholder={t('step2.lastName')}
                            value={newAddress.lastName}
                            onChange={(e) => setNewAddress({ ...newAddress, lastName: e.target.value })}
                            aria-required="true"
                            autoComplete="family-name"
                            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label htmlFor="addr-street" className="mb-1 block text-xs font-medium text-muted-foreground">{t('step2.street')}</label>
                        <input
                          id="addr-street"
                          placeholder={t('step2.street')}
                          value={newAddress.street}
                          onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                          aria-required="true"
                          autoComplete="street-address"
                          className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                        />
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-3">
                        <div>
                          <label htmlFor="addr-postal" className="mb-1 block text-xs font-medium text-muted-foreground">{t('step2.postalCode')}</label>
                          <input
                            id="addr-postal"
                            placeholder={t('step2.postalCode')}
                            value={newAddress.postalCode}
                            onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                            aria-required="true"
                            autoComplete="postal-code"
                            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                          />
                        </div>
                        <div>
                          <label htmlFor="addr-city" className="mb-1 block text-xs font-medium text-muted-foreground">{t('step2.city')}</label>
                          <input
                            id="addr-city"
                            placeholder={t('step2.city')}
                            value={newAddress.city}
                            onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                            aria-required="true"
                            autoComplete="address-level2"
                            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                          />
                        </div>
                        <div>
                          <label htmlFor="addr-phone" className="mb-1 block text-xs font-medium text-muted-foreground">{t('step2.phone2')}</label>
                          <input
                            id="addr-phone"
                            type="tel"
                            placeholder={t('step2.phone2')}
                            value={newAddress.phone}
                            onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                            autoComplete="tel"
                            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label htmlFor="addr-label" className="mb-1 block text-xs font-medium text-muted-foreground">{t('step2.label')}</label>
                        <input
                          id="addr-label"
                          placeholder={t('step2.labelPlaceholder')}
                          value={newAddress.label}
                          onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                          autoComplete="off"
                          className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                        />
                      </div>
                    </fieldset>
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <Button variant="outline" onClick={() => router.push('/cart')}>
                    {t('step2.back')}
                  </Button>
                  <Button
                    onClick={handleGoToRecap}
                    disabled={false}
                    className="bg-althea-cta text-white hover:bg-althea-hover"
                  >
                    {t('step2.continue')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Recap before payment */}
            {step === 3 && (
              <div className="space-y-6">
                {/* Products recap */}
                <div className="rounded-xl border bg-card p-6">
                  <h2 className="mb-4 flex items-center gap-2 font-poppins text-lg font-semibold">
                    <Package className="h-5 w-5" /> {t('step3.products')}
                  </h2>
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.productId} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <Stethoscope className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.price / 100)} {t('step3.ht')} x {item.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-semibold">
                          {formatCurrency((item.price * item.quantity) / 100)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Address recap */}
                {selectedAddress && (
                  <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center justify-between">
                      <h2 className="flex items-center gap-2 font-poppins text-lg font-semibold">
                        <MapPin className="h-5 w-5" /> {t('step3.deliveryAddress')}
                      </h2>
                      <button
                        onClick={() => setStep(2)}
                        className="text-sm text-althea-cta hover:underline"
                      >
                        {t('step3.edit')}
                      </button>
                    </div>
                    <div className="mt-3 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">
                        {selectedAddress.firstName} {selectedAddress.lastName}
                      </p>
                      <p>{selectedAddress.street}</p>
                      <p>{selectedAddress.postalCode} {selectedAddress.city}</p>
                      {selectedAddress.phone && <p>{t('step3.phone')} {selectedAddress.phone}</p>}
                    </div>
                  </div>
                )}

                {/* Billing address */}
                <div className="rounded-xl border bg-card p-6">
                  <h2 className="mb-3 flex items-center gap-2 font-poppins text-lg font-semibold">
                    <CreditCard className="h-5 w-5" /> {t('step3.billingAddress')}
                  </h2>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={billingSameAsDelivery}
                      onChange={(e) => setBillingSameAsDelivery(e.target.checked)}
                      className="accent-[#00a8b5]"
                    />
                    {t('step3.billingSame')}
                  </label>

                  {!billingSameAsDelivery && (
                    <div className="mt-4 space-y-3">
                      {addresses.length > 0 && !useBillingNewAddress && (
                        <div className="space-y-2">
                          {addresses.map((addr) => (
                            <label
                              key={addr.id}
                              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${billingAddressId === addr.id ? 'border-althea-cta bg-althea-bg/50' : 'hover:bg-muted/50'}`}
                            >
                              <input
                                type="radio"
                                name="billing-address"
                                value={addr.id}
                                checked={billingAddressId === addr.id}
                                onChange={() => setBillingAddressId(addr.id)}
                                className="mt-1 accent-[#00a8b5]"
                              />
                              <div>
                                <p className="text-sm font-medium">{addr.firstName} {addr.lastName}</p>
                                <p className="text-xs text-muted-foreground">{addr.street}, {addr.postalCode} {addr.city}</p>
                              </div>
                            </label>
                          ))}
                          <button onClick={() => setUseBillingNewAddress(true)} className="text-sm text-althea-cta hover:underline">
                            {t('step3.addBilling')}
                          </button>
                        </div>
                      )}

                      {(addresses.length === 0 || useBillingNewAddress) && (
                        <div className="space-y-3">
                          {useBillingNewAddress && (
                            <button onClick={() => setUseBillingNewAddress(false)} className="text-sm text-althea-cta hover:underline">
                              {t('step3.useExisting')}
                            </button>
                          )}
                          <div className="grid gap-3 sm:grid-cols-2">
                            <input placeholder={t('step3.firstNamePlaceholder')} value={billingNewAddress.firstName} onChange={(e) => setBillingNewAddress({ ...billingNewAddress, firstName: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta" />
                            <input placeholder={t('step3.lastNamePlaceholder')} value={billingNewAddress.lastName} onChange={(e) => setBillingNewAddress({ ...billingNewAddress, lastName: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta" />
                          </div>
                          <input placeholder={t('step3.streetPlaceholder')} value={billingNewAddress.street} onChange={(e) => setBillingNewAddress({ ...billingNewAddress, street: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta" />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <input placeholder={t('step3.postalCodePlaceholder')} value={billingNewAddress.postalCode} onChange={(e) => setBillingNewAddress({ ...billingNewAddress, postalCode: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta" />
                            <input placeholder={t('step3.cityPlaceholder')} value={billingNewAddress.city} onChange={(e) => setBillingNewAddress({ ...billingNewAddress, city: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Payment method info */}
                <div className="rounded-xl border bg-card p-6">
                  <h2 className="flex items-center gap-2 font-poppins text-lg font-semibold">
                    <ShieldCheck className="h-5 w-5" /> {t('step3.paymentSection')}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    <ShieldCheck className="mr-1 inline h-4 w-4" />
                    {t('step3.paymentDesc')}
                  </p>
                </div>

                {/* Totals */}
                <div className="rounded-xl border bg-card p-6">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('step3.subtotal')}</span>
                      <span>{formatCurrency(subtotal / 100)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('step3.tax')}</span>
                      <span>{formatCurrency(tax / 100)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('step3.shipping')}</span>
                      <span>
                        {shippingInfo?.type === 'CUSTOM'
                          ? t('step3.quote')
                          : shipping === 0
                            ? t('step3.free')
                            : formatCurrency(shipping / 100)}
                      </span>
                    </div>
                    {shippingInfo?.type === 'CUSTOM' && (
                      <p className="text-xs text-amber-600">{shippingInfo.message}</p>
                    )}
                    <hr />
                    <div className="flex justify-between font-poppins text-lg font-semibold">
                      <span>{t('step3.total')}</span>
                      <span className="text-althea-cta">{formatCurrency(total / 100)}</span>
                    </div>
                  </div>
                </div>

                {shippingInfo?.type === 'CUSTOM' && (
                  <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-700">
                    {shippingInfo.message || t('step3.customShippingMsg')}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    {t('step3.back')}
                  </Button>
                  <Button
                    onClick={handleConfirmAndPay}
                    disabled={loading}
                    className="bg-althea-cta text-white hover:bg-althea-hover"
                  >
                    {loading ? t('step3.loading') : t('step3.confirmAndPay')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Payment with Stripe Elements */}
            {step === 4 && clientSecret && (
              <div className="rounded-xl border bg-card p-6">
                <h2 className="mb-4 font-poppins text-lg font-semibold">{t('step4.title')}</h2>
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#00a8b5',
                      },
                    },
                    locale: 'fr',
                  }}
                >
                  <PaymentForm
                    orderId={orderId!}
                    total={total}
                    onBack={() => setStep(3)}
                    shippingInfo={shippingInfo}
                  />
                </Elements>
              </div>
            )}
          </div>

          {/* Right: Sidebar Recap (steps 1-2 only, step 3 has inline recap) */}
          {step <= 2 && (
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-xl border bg-card p-6">
                <h3 className="mb-4 font-poppins text-lg font-semibold">{t('sidebar.title')}</h3>
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded bg-muted">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <Stethoscope className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{t('sidebar.qty')} {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold">
                        {formatCurrency((item.price * item.quantity) / 100)}
                      </p>
                    </div>
                  ))}
                </div>
                <hr className="my-4" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('sidebar.subtotal')}</span>
                    <span>{formatCurrency(subtotal / 100)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('sidebar.tax')}</span>
                    <span>{formatCurrency(tax / 100)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('sidebar.shipping')}</span>
                    <span>
                      {shippingInfo?.type === 'CUSTOM'
                        ? t('sidebar.quote')
                        : shipping === 0
                          ? t('sidebar.free')
                          : formatCurrency(shipping / 100)}
                    </span>
                  </div>
                  {shippingInfo?.type === 'CUSTOM' && (
                    <p className="text-xs text-amber-600">{shippingInfo.message}</p>
                  )}
                  <hr />
                  <div className="flex justify-between font-poppins text-lg font-semibold">
                    <span>{t('sidebar.total')}</span>
                    <span className="text-althea-cta">{formatCurrency(total / 100)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
