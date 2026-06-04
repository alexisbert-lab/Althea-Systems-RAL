'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/barre-navigation';
import { Footer } from '@/components/pied-page';
import { GlassButton } from '@/components/glass-button';
import { Reveal } from '@/components/reveal';
import { formatCurrency } from '@/lib/utilitaires';
import { Tag, AlertTriangle, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { api } from '@/lib/client-api';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { useTranslations } from '@/lib/translations';

interface CartItem {
  productId: string;
  slug?: string;
  name: string;
  price: number;
  comparePrice?: number | null;
  image: string | null;
  quantity: number;
}

interface ShippingInfo {
  amount: number;
  type: string;
  label: string;
  message?: string;
}

interface StockStatus {
  productId: string;
  available: boolean;
  reason?: string;
  currentStock: number;
}

/* ── Carte article avec tilt 3D ── */
function CartItemCard({
  item,
  stock,
  onUpdate,
  onRemove,
  delay,
}: {
  item: CartItem;
  stock: StockStatus | undefined;
  onUpdate: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  delay?: number;
}) {
  const t = useTranslations('cart');
  const ref = useRef<HTMLDivElement>(null);
  const isUnavailable = stock && !stock.available;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(600px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) scale(1.015)`;
  };

  const onLeave = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <Reveal delay={delay}>
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ willChange: 'transform', transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease' }}
        className={`glass-light rounded-2xl p-4 flex gap-4 ${
          isUnavailable
            ? 'border border-red-400/40 bg-red-950/10'
            : 'border-glow'
        }`}
      >
        {/* Image */}
        <div className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-muted/50 ${isUnavailable ? 'opacity-50' : ''}`}>
          {item.image ? (
            <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 hover:scale-110" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Tag className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link
            href={item.slug ? `/products/${item.slug}` : '/products'}
            className="font-semibold text-foreground hover:text-althea-cta transition-colors line-clamp-2"
          >
            {item.name}
          </Link>

          {isUnavailable && (
            <div role="alert" className="mt-1 flex items-center gap-1.5 text-xs font-medium text-red-500">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              {stock?.reason}
            </div>
          )}

          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-bold text-althea-cta">{formatCurrency(item.price / 100)}</span>
            {item.comparePrice && item.comparePrice > item.price && (
              <>
                <span className="text-xs text-muted-foreground line-through">{formatCurrency(item.comparePrice / 100)}</span>
                <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-500">
                  -{Math.round(((item.comparePrice - item.price) / item.comparePrice) * 100)}%
                </span>
              </>
            )}
            <span className="text-xs text-muted-foreground">{t('item.ht')}</span>
          </div>

          {/* Qty controls */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-althea-cta/20 bg-background/60 backdrop-blur-sm overflow-hidden">
              <button
                onClick={() => onUpdate(item.productId, item.quantity - 1)}
                aria-label={`${t('item.decreaseQty')} ${item.name}`}
                className="px-2.5 py-1.5 hover:bg-althea-cta/10 transition-colors"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="min-w-[2rem] text-center text-sm font-semibold" aria-label={`${t('item.currentQty')} ${item.quantity}`}>
                {item.quantity}
              </span>
              <button
                onClick={() => onUpdate(item.productId, item.quantity + 1)}
                aria-label={`${t('item.increaseQty')} ${item.name}`}
                className="px-2.5 py-1.5 hover:bg-althea-cta/10 transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            {stock && stock.currentStock > 0 && stock.currentStock <= 5 && stock.available && (
              <span className="text-xs font-medium text-amber-500">
                {t('item.lowStockPrefix')} {stock.currentStock} {t('item.lowStockSuffix')}
              </span>
            )}
          </div>
        </div>

        {/* Prix total + supprimer */}
        <div className="flex flex-col items-end justify-between gap-2">
          <span className={`font-bold text-base ${isUnavailable ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
            {formatCurrency((item.price * item.quantity) / 100)}
          </span>
          <button
            onClick={() => onRemove(item.productId)}
            aria-label={`${t('item.remove')} ${item.name} ${t('item.removeSuffix')}`}
            className="rounded-lg p-1.5 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Reveal>
  );
}

interface ServerCartItem {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    comparePrice?: number | null;
    images: string[];
    stock: number;
    active: boolean;
  };
}

function serverItemToCartItem(item: ServerCartItem): CartItem {
  return {
    productId: item.productId,
    slug: item.product.slug,
    name: item.product.name,
    price: item.product.price,
    comparePrice: item.product.comparePrice,
    image: item.product.images[0] ?? null,
    quantity: item.quantity,
  };
}

export default function CartPage() {
  const t = useTranslations('cart');
  const [items, setItems] = useState<CartItem[]>([]);
  const [serverItemIds, setServerItemIds] = useState<Record<string, string>>({});
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [stockStatuses, setStockStatuses] = useState<StockStatus[]>([]);
  const [checkingStock, setCheckingStock] = useState(false);
  const router = useRouter();
  const { token } = useAuthentificationStore();

  useEffect(() => {
    if (token) {
      api.get<{ items: ServerCartItem[] }>('/api/cart', token)
        .then((cart) => {
          const ids: Record<string, string> = {};
          const mapped = cart.items.map((item) => {
            ids[item.productId] = item.id;
            return serverItemToCartItem(item);
          });
          setServerItemIds(ids);
          setItems(mapped);
          localStorage.setItem('althea-cart', JSON.stringify(mapped));
          window.dispatchEvent(new Event('cart-updated'));
        })
        .catch(() => {
          const stored = localStorage.getItem('althea-cart');
          if (stored) setItems(JSON.parse(stored));
        });
    } else {
      const stored = localStorage.getItem('althea-cart');
      if (stored) setItems(JSON.parse(stored));
    }
  }, [token]);

  const saveCart = (newItems: CartItem[]) => {
    setItems(newItems);
    localStorage.setItem('althea-cart', JSON.stringify(newItems));
    window.dispatchEvent(new Event('cart-updated'));
  };

  const updateQuantity = async (productId: string, qty: number) => {
    if (qty < 1) return removeItem(productId);
    if (token && serverItemIds[productId]) {
      try {
        const cart = await api.put<{ items: ServerCartItem[] }>(
          `/api/cart/items/${serverItemIds[productId]}`,
          { quantity: qty },
          token,
        );
        const ids: Record<string, string> = {};
        const mapped = cart.items.map((item) => {
          ids[item.productId] = item.id;
          return serverItemToCartItem(item);
        });
        setServerItemIds(ids);
        saveCart(mapped);
        return;
      } catch { /* fallback to local */ }
    }
    saveCart(items.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item)));
  };

  const removeItem = async (productId: string) => {
    if (token && serverItemIds[productId]) {
      try {
        const cart = await api.delete<{ items: ServerCartItem[] }>(
          `/api/cart/items/${serverItemIds[productId]}`,
          token,
        );
        const ids: Record<string, string> = {};
        const mapped = cart.items.map((item) => {
          ids[item.productId] = item.id;
          return serverItemToCartItem(item);
        });
        setServerItemIds(ids);
        saveCart(mapped);
        setStockStatuses((prev) => prev.filter((s) => s.productId !== productId));
        return;
      } catch { /* fallback to local */ }
    }
    saveCart(items.filter((item) => item.productId !== productId));
    setStockStatuses((prev) => prev.filter((s) => s.productId !== productId));
  };

  const checkStock = useCallback(async () => {
    if (items.length === 0) { setStockStatuses([]); return; }
    setCheckingStock(true);
    try {
      const result = await api.post<StockStatus[]>('/api/products/check-availability', {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      setStockStatuses(result);
    } catch {
      setStockStatuses([]);
    } finally {
      setCheckingStock(false);
    }
  }, [items]);

  useEffect(() => {
    const timeout = setTimeout(() => checkStock(), 500);
    return () => clearTimeout(timeout);
  }, [checkStock]);

  const getStockStatus = (productId: string) => stockStatuses.find((s) => s.productId === productId);
  const hasUnavailableItems = stockStatuses.some((s) => !s.available);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalSavings = items.reduce((sum, item) => {
    if (item.comparePrice && item.comparePrice > item.price) {
      return sum + (item.comparePrice - item.price) * item.quantity;
    }
    return sum;
  }, 0);
  const tax = Math.round(subtotal * 0.2);
  const shippingCost = shippingInfo?.amount ?? 0;
  const total = subtotal + tax + shippingCost;

  useEffect(() => {
    if (subtotal > 0) {
      api.get<ShippingInfo>(`/api/shipping-rules/calculate?subtotal=${subtotal}`)
        .then(setShippingInfo)
        .catch(() => setShippingInfo({ amount: 499, type: 'FLAT', label: t('shippingStandard') }));
    } else {
      setShippingInfo(null);
    }
  }, [subtotal]);

  const handleCheckout = () => {
    if (items.length === 0) return;
    router.push('/checkout');
  };

  return (
    <>
      <Navbar />

      <main id="main-content" className="relative min-h-screen overflow-hidden">

        {/* ── Fond ambiant — orbs ── */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="orb orb-teal  w-[480px] h-[480px] -top-28 -left-16  animate-orb-drift-slow" />
          <div className="orb orb-navy  w-[380px] h-[380px]  top-1/2 -right-20  animate-orb-drift-reverse" />
          <div className="orb orb-cyan  w-[260px] h-[260px]  bottom-0  left-1/3  animate-orb-drift-slow" style={{ animationDelay: '-6s' }} />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle, #00a8b5 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
        </div>

        <div className="container mx-auto max-w-6xl px-4 py-12 md:py-20">

          {/* ── Header ── */}
          <Reveal>
            <div className="mb-10">
              <h1 className="font-poppins text-4xl font-bold text-althea-dark dark:text-foreground md:text-5xl">
                {t('titlePrefix')}{' '}
                <span
                  className="text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(135deg, #00a8b5, #33bfc9)' }}
                >
                  {t('titleHighlight')}
                </span>
              </h1>
              {items.length > 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {items.length} {items.length > 1 ? t('itemPlural') : t('itemSingular')}
                </p>
              )}
            </div>
          </Reveal>

          {/* Login invitation banner for guests with items */}
          {!token && items.length > 0 && (
            <Reveal>
              <div className="mb-6 flex items-center gap-4 rounded-xl border border-althea-cta/30 bg-althea-cta/5 px-5 py-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-althea-cta/10">
                  <ShoppingCart className="h-5 w-5 text-althea-cta" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {t('loginBanner.title')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('loginBanner.desc')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href="/auth/login?redirect=/cart">
                    <GlassButton className="text-sm px-4 py-2">{t('loginBanner.login')}</GlassButton>
                  </Link>
                  <Link href="/auth/register">
                    <button className="text-sm text-althea-cta hover:underline">{t('loginBanner.register')}</button>
                  </Link>
                </div>
              </div>
            </Reveal>
          )}

          {items.length === 0 ? (
            <Reveal>
              <div className="glass-light rounded-3xl border-glow py-24 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-althea-cta/10">
                  <ShoppingCart className="h-10 w-10 text-althea-cta" />
                </div>
                <p className="mb-2 text-xl font-semibold text-foreground">{t('empty.title')}</p>
                <p className="mb-8 text-sm text-muted-foreground">{t('empty.desc')}</p>
                <Link href="/products">
                  <GlassButton>{t('empty.cta')}</GlassButton>
                </Link>
              </div>
            </Reveal>
          ) : (
            <div className="grid gap-8 lg:grid-cols-3">

              {/* ── Articles ── */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item, i) => (
                  <CartItemCard
                    key={item.productId}
                    item={item}
                    stock={getStockStatus(item.productId)}
                    onUpdate={updateQuantity}
                    onRemove={removeItem}
                    delay={i * 60}
                  />
                ))}
              </div>

              {/* ── Récapitulatif ── */}
              <Reveal delay={120}>
                <div className="glass rounded-2xl border-glow p-6 sticky top-24">
                  <h2 className="mb-5 font-poppins text-lg font-semibold text-foreground">{t('summary.title')}</h2>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t('summary.subtotal')}</span>
                      <span className="text-foreground font-medium">{formatCurrency(subtotal / 100)}</span>
                    </div>
                    {totalSavings > 0 && (
                      <div className="flex justify-between text-green-500">
                        <span>{t('summary.savings')}</span>
                        <span>-{formatCurrency(totalSavings / 100)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t('summary.tax')}</span>
                      <span className="text-foreground font-medium">{formatCurrency(tax / 100)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t('summary.shipping')}</span>
                      <span className="text-foreground font-medium">
                        {shippingInfo?.type === 'CUSTOM'
                          ? t('summary.quote')
                          : shippingCost === 0
                            ? t('summary.free')
                            : formatCurrency(shippingCost / 100)}
                      </span>
                    </div>
                    {shippingInfo?.type === 'CUSTOM' && (
                      <p className="text-xs text-amber-500">{shippingInfo.message}</p>
                    )}
                    {shippingInfo?.type === 'FLAT' && shippingCost > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {t('summary.freeShippingFrom')} {formatCurrency(100)} {t('summary.ht')}
                      </p>
                    )}

                    <div
                      className="my-2 h-px w-full"
                      style={{ background: 'linear-gradient(90deg, transparent, #00a8b5 50%, transparent)' }}
                    />

                    <div className="flex justify-between text-lg font-bold text-foreground">
                      <span>{t('summary.total')}</span>
                      <span className="text-althea-cta">{formatCurrency(total / 100)}</span>
                    </div>
                  </div>

                  {/* Warning stock */}
                  {hasUnavailableItems && (
                    <div className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-3">
                      <p className="flex items-center gap-2 text-sm font-medium text-red-500">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        {t('summary.unavailableWarning')}
                      </p>
                      <p className="mt-1 text-xs text-red-400">
                        {t('summary.unavailableHint')}
                      </p>
                    </div>
                  )}

                  <div className="mt-6">
                    <GlassButton
                      className="w-full justify-center"
                      onClick={handleCheckout}
                      disabled={checkingStock}
                    >
                      {checkingStock
                        ? t('summary.checking')
                        : t('summary.checkout')}
                    </GlassButton>
                  </div>

                  <Link href="/products" className="mt-3 block text-center text-xs text-muted-foreground hover:text-althea-cta transition-colors">
                    {t('summary.continue')}
                  </Link>
                </div>
              </Reveal>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
