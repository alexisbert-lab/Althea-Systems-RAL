'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from '@/lib/translations';
import { api } from '@/lib/client-api';
import { Navbar } from '@/components/barre-navigation';
import { Footer } from '@/components/pied-page';
import { GlassButton } from '@/components/glass-button';
import { Reveal } from '@/components/reveal';
import { formatCurrency } from '@/lib/utilitaires';
import { ChevronLeft, ChevronRight, ShoppingCart, Tag } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  images: string[];
  stock: number;
  featured: boolean;
  specs: Record<string, string> | null;
  category?: { id: string; name: string; slug: string };
  reviews?: Array<{
    id: string;
    rating: number;
    comment: string | null;
    user: { name: string };
    createdAt: string;
  }>;
}

interface SimilarProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  images: string[];
  stock: number;
  featured: boolean;
  category?: { name: string };
}

/* ── Image carousel 3D ── */
function ImageCarousel({ images, productName }: { images: string[]; productName: string }) {
  const t = useTranslations('productDetailPage');
  const [selected, setSelected] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const prev = () => setSelected((s) => (s - 1 + images.length) % images.length);
  const next = () => setSelected((s) => (s + 1) % images.length);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg)`;
  };

  const onLeave = () => {
    if (containerRef.current) containerRef.current.style.transform = '';
  };

  return (
    <div>
      {/* Main image */}
      <div
        ref={containerRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ willChange: 'transform', transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1)' }}
        className="relative aspect-square overflow-hidden rounded-3xl border-glow bg-muted/30"
      >
        {images[selected] ? (
          <img
            src={images[selected]}
            alt={t('imageAlt', { name: productName, index: selected + 1 })}
            className="h-full w-full object-cover transition-transform duration-700"
            key={selected}
            style={{ animation: 'carouselBgEnter 0.6s ease forwards' }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Tag className="h-20 w-20" />
          </div>
        )}

        {/* Overlay glassmorphic gradient bottom */}
        <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,30,50,0.35), transparent)' }}
        />

        {/* Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 backdrop-blur-md p-2.5 shadow-lg transition hover:bg-white/35 border border-white/20"
              aria-label={t('carousel.prevImage')}
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 backdrop-blur-md p-2.5 shadow-lg transition hover:bg-white/35 border border-white/20"
              aria-label={t('carousel.nextImage')}
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  className={`rounded-full transition-all ${
                    i === selected
                      ? 'w-5 h-2 bg-althea-cta'
                      : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl transition-all duration-200 ${
                i === selected
                  ? 'ring-2 ring-althea-cta ring-offset-2 scale-105'
                  : 'opacity-60 hover:opacity-100 hover:scale-105'
              }`}
            >
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  const t = useTranslations('productDetailPage');
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const loadProduct = useCallback(async () => {
    try {
      const data = await api.get<Product>(`/api/products/slug/${slug}`);
      setProduct(data);
      try {
        const similar = await api.get<SimilarProduct[]>(`/api/products/${data.id}/similar?limit=6`);
        setSimilarProducts(Array.isArray(similar) ? similar : []);
      } catch {
        setSimilarProducts([]);
      }
    } catch {
      router.push('/products');
    } finally {
      setLoading(false);
    }
  }, [slug, router]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const addToCart = () => {
    if (!product || product.stock === 0) return;
    const cart = JSON.parse(localStorage.getItem('althea-cart') || '[]');
    const existingIndex = cart.findIndex((item: any) => item.productId === product.id);
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        comparePrice: product.comparePrice ?? null,
        image: product.images[0] || '',
        quantity,
      });
    }
    localStorage.setItem('althea-cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
    toast.success(t('addedToCart', { name: product.name }));
  };

  /* ---------- loading ---------- */
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-althea-cta border-t-transparent" />
        </div>
      </>
    );
  }

  if (!product) return null;

  const isOutOfStock = product.stock === 0;
  const discount =
    product.comparePrice && product.comparePrice > product.price
      ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
      : null;

  return (
    <>
      <Navbar />

      <main className="relative min-h-screen overflow-hidden">

        {/* ── Fond ambiant ── */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="orb orb-teal  w-[500px] h-[500px] -top-32 -left-20  animate-orb-drift-slow" />
          <div className="orb orb-navy  w-[400px] h-[400px]  top-1/3 -right-24  animate-orb-drift-reverse" />
          <div className="orb orb-cyan  w-[280px] h-[280px]  bottom-24 left-1/2  animate-orb-drift-slow" style={{ animationDelay: '-8s' }} />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle, #00a8b5 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
        </div>

        <div className="container mx-auto max-w-6xl px-4 py-10 md:py-16">

          {/* ── Breadcrumb ── */}
          <Reveal>
            <nav className="mb-8 text-sm text-muted-foreground flex flex-wrap items-center gap-1">
              <Link href="/" className="hover:text-althea-cta transition-colors">{t('breadcrumb.home')}</Link>
              <span>/</span>
              <Link href="/products" className="hover:text-althea-cta transition-colors">{t('breadcrumb.products')}</Link>
              {product.category && (
                <>
                  <span>/</span>
                  <Link href={`/products?categoryId=${product.category.id}`} className="hover:text-althea-cta transition-colors">
                    {product.category.name}
                  </Link>
                </>
              )}
              <span>/</span>
              <span className="text-foreground font-medium">{product.name}</span>
            </nav>
          </Reveal>

          {/* ====== Main product section ====== */}
          <div className="grid gap-10 lg:grid-cols-2">

            {/* ---- Image carousel ---- */}
            <Reveal>
              <div className="relative">
                {/* Discount badge flottant */}
                {discount && (
                  <div
                    className="absolute -top-3 -right-3 z-10 flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold text-white shadow-lg animate-float"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                  >
                    -{discount}%
                  </div>
                )}
                <ImageCarousel images={product.images} productName={product.name} />
              </div>
            </Reveal>

            {/* ---- Product info ---- */}
            <div className="flex flex-col">

              {/* Category */}
              {product.category && (
                <Reveal>
                  <Link
                    href={`/products?categoryId=${product.category.id}`}
                    className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-althea-cta hover:underline"
                  >
                    {product.category.name}
                  </Link>
                </Reveal>
              )}

              {/* Name */}
              <Reveal delay={60}>
                <h1 className="font-poppins text-3xl font-bold leading-tight text-althea-dark dark:text-foreground md:text-4xl">
                  {product.name}
                </h1>
              </Reveal>

              {/* Price */}
              <Reveal delay={100}>
                <div className="mt-5 flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-althea-cta">
                    {formatCurrency(product.price / 100)}
                  </span>
                  <span className="text-sm text-muted-foreground">{t('priceExclTax')}</span>
                  {product.comparePrice && product.comparePrice > product.price && (
                    <span className="text-lg text-muted-foreground line-through">
                      {formatCurrency(product.comparePrice / 100)}
                    </span>
                  )}
                </div>
              </Reveal>

              {/* Availability */}
              <Reveal delay={120}>
                <div className="mt-4">
                  {isOutOfStock ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-sm font-medium text-red-500">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      {t('stock.outOfStock')}
                    </span>
                  ) : product.stock <= 5 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-sm font-medium text-amber-500">
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      {t('stock.limited', { count: product.stock })}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 text-sm font-medium text-green-500">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      {t('stock.inStock')}
                    </span>
                  )}
                </div>
              </Reveal>

              {/* Separator */}
              <div
                className="my-6 h-px w-full"
                style={{ background: 'linear-gradient(90deg, transparent, #00a8b5 40%, transparent)' }}
              />

              {/* Description */}
              {product.description && (
                <Reveal delay={140}>
                  <div className="glass-light rounded-2xl p-5">
                    <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-althea-cta/70">
                      {t('description')}
                    </h2>
                    <p className="leading-relaxed text-muted-foreground text-sm">{product.description}</p>
                  </div>
                </Reveal>
              )}

              {/* Specs */}
              {product.specs && Object.keys(product.specs).length > 0 && (
                <Reveal delay={160}>
                  <div className="mt-4 glass-light rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-althea-cta/10">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-althea-cta/70">
                        {t('technicalSpecs')}
                      </h2>
                    </div>
                    {Object.entries(product.specs).map(([key, value], i) => (
                      <div
                        key={key}
                        className={`flex justify-between px-5 py-2.5 text-sm ${
                          i % 2 === 0 ? 'bg-althea-cta/[0.02]' : ''
                        }`}
                      >
                        <span className="font-medium text-foreground">{key}</span>
                        <span className="text-muted-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </Reveal>
              )}

              {/* CTA */}
              <Reveal delay={180}>
                <div className="mt-8 flex items-center gap-3">
                  {!isOutOfStock && (
                    <div className="flex items-center rounded-xl border border-althea-cta/20 bg-background/60 backdrop-blur-sm overflow-hidden">
                      <button
                        className="px-3.5 py-3 text-lg leading-none hover:bg-althea-cta/10 transition-colors"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      >
                        −
                      </button>
                      <span className="min-w-[2.5rem] text-center text-sm font-bold">{quantity}</span>
                      <button
                        className="px-3.5 py-3 text-lg leading-none hover:bg-althea-cta/10 transition-colors"
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      >
                        +
                      </button>
                    </div>
                  )}

                  {isOutOfStock ? (
                    <div className="flex-1 rounded-xl border border-muted/40 bg-muted/30 py-3 text-center text-sm font-semibold text-muted-foreground cursor-not-allowed">
                      {t('stock.outOfStock')}
                    </div>
                  ) : (
                    <>
                      <GlassButton
                        className="flex-1 justify-center gap-2 text-base"
                        onClick={addToCart}
                      >
                        <ShoppingCart className="h-5 w-5" />
                        {t('addToCart')}
                      </GlassButton>
                      <GlassButton
                        className="flex-1 justify-center gap-2 text-base bg-althea-cta text-white hover:bg-althea-hover"
                        onClick={() => { addToCart(); router.push('/checkout'); }}
                      >
                        {t('buyNow')}
                      </GlassButton>
                    </>
                  )}
                </div>
              </Reveal>
            </div>
          </div>

          {/* ====== Produits similaires ====== */}
          {similarProducts.length > 0 && (
            <section className="mt-16">
              <Reveal>
                <h2 className="mb-6 font-poppins text-xl font-semibold text-althea-dark dark:text-foreground">
                  {t('similarProducts')}
                </h2>
              </Reveal>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {similarProducts.map((p, i) => {
                  const outOfStock = p.stock === 0;
                  return (
                    <Reveal key={p.id} delay={i * 50}>
                      <Link
                        href={`/products/${p.slug}`}
                        className={`card-3d group flex items-center gap-2.5 glass-light rounded-xl p-2.5 transition-all duration-300 hover:border-althea-cta/40 ${outOfStock ? 'opacity-55' : ''}`}
                      >
                        {/* Thumbnail */}
                        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted/50">
                          {p.images?.[0] ? (
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-115"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Tag className="h-5 w-5 text-gray-300" />
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-xs font-semibold leading-tight text-foreground group-hover:text-althea-cta transition-colors">
                            {p.name}
                          </p>
                          <p className="mt-1 text-sm font-bold text-althea-cta">
                            {formatCurrency(p.price / 100)}
                            <span className="ml-1 text-[10px] font-normal text-muted-foreground">{t('priceExclTax')}</span>
                          </p>
                          {outOfStock && (
                            <span className="text-[10px] font-medium text-red-500">{t('stock.shortOutOfStock')}</span>
                          )}
                        </div>
                      </Link>
                    </Reveal>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
