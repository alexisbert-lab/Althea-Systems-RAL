'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useLocale, useTranslations } from '@/lib/translations';
import { Navbar } from '@/components/barre-navigation';
import { Footer } from '@/components/pied-page';
import { api } from '@/lib/client-api';
import { formatCurrency } from '@/lib/utilitaires';
import { Truck, ShieldCheck, MessageCircle, Lock, Stethoscope, ChevronLeft, ChevronRight } from 'lucide-react';
import { Reveal } from '@/components/reveal';
import { GlassButton } from '@/components/glass-button';
import { Tilt3D } from '@/components/tilt-3d';

interface CarouselSlide {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  link: string | null;
  position: number;
  translations?: Array<{ locale: string; title: string; subtitle: string | null }>;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  _count?: { products: number };
  translations?: Array<{ locale: string; name: string; description: string | null }>;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  images: string[];
  featured: boolean;
  stock: number;
  category?: { name: string };
  translations?: Array<{ locale: string; name: string; description: string | null }>;
}

function getTranslated<T extends { translations?: Array<{ locale: string } & Record<string, unknown>> }>(
  item: T,
  field: string,
  fallback: string,
  locale: string,
): string {
  const tr = item.translations?.find((x) => x.locale === locale);
  if (tr && typeof tr[field] === 'string') return tr[field] as string;
  return fallback;
}

export default function HomePage() {
  const t = useTranslations('homePage');
  const locale = useLocale();
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideKey, setSlideKey] = useState(0);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    const controller = new AbortController();

    const loadData = async () => {
      try {
        const [slidesData, catsData, prodsData, settingsData] = await Promise.all([
          api.get<CarouselSlide[]>(`/api/carousel-slides?active=true`).catch(() => []),
          api.get<Category[]>(`/api/categories?active=true&featured=true`).catch(() => []),
          api.get<{ data: Product[] }>('/api/products?featured=true&limit=8').catch(() => ({ data: [] })),
          api.get<Record<string, string>>('/api/site-settings').catch(() => ({})),
        ]);

        if (controller.signal.aborted) return;

        const safeSlides = Array.isArray(slidesData) ? slidesData : [];
        const safeCategories = Array.isArray(catsData) ? catsData : [];
        const safeProducts = Array.isArray(prodsData) ? prodsData : prodsData?.data || [];
        setSlides(safeSlides);
        setCategories(safeCategories);
        setFeaturedProducts(safeProducts);
        setSiteSettings(
          locale === 'fr' && settingsData && typeof settingsData === 'object'
            ? (settingsData as Record<string, string>)
            : {},
        );
      } catch {
        // silently fail – pages still render static content
      }
    };

    loadData();
    return () => controller.abort();
  }, [locale]);

  const s = (key: string, fallback: string) => siteSettings[key] || fallback;

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
      setSlideKey((k) => k + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const goToSlide = useCallback((i: number) => {
    setCurrentSlide(i);
    setSlideKey((k) => k + 1);
  }, []);

  const goPrev = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setSlideKey((k) => k + 1);
  }, [slides.length]);

  const goNext = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setSlideKey((k) => k + 1);
  }, [slides.length]);

  return (
    <>
      <Navbar />
      <main id="main-content" className="flex min-h-screen flex-col">

        {/* ═══════════════════════════════════════
            HERO CAROUSEL — Cinematic redesign
            ═══════════════════════════════════════ */}
        <section
          className="relative overflow-hidden"
          style={{ minHeight: '580px', height: 'clamp(520px, 70vh, 700px)' }}
          role="region"
          aria-roledescription="carrousel"
          aria-label={t('carouselAria')}
        >
          {/* Base cinématique — toujours sombre (indépendant du thème) */}
          <div className="absolute inset-0 bg-[#020d1a]" />

          {/* Scan lines CRT */}
          <div className="carousel-scanlines absolute inset-0 z-[1] pointer-events-none" aria-hidden="true" />

          {/* Ambient orbs */}
          <div
            className="orb orb-teal animate-float-slow"
            style={{ width: 700, height: 700, top: '-25%', left: '-12%', opacity: 0.16 }}
            aria-hidden="true"
          />
          <div
            className="orb orb-cyan animate-float-delay"
            style={{ width: 450, height: 450, bottom: '-15%', right: '-5%', opacity: 0.1 }}
            aria-hidden="true"
          />
          <div
            className="orb orb-navy animate-float"
            style={{ width: 300, height: 300, top: '20%', right: '35%', opacity: 0.08 }}
            aria-hidden="true"
          />

          {/* ── SLIDES ── */}
          {slides.length > 0 ? (
            slides.map((slide, i) => (
              <div
                key={slide.id}
                role="group"
                aria-roledescription="diapositive"
                aria-label={`${i + 1} sur ${slides.length}: ${getTranslated(slide, 'title', slide.title, locale)}`}
                aria-hidden={i !== currentSlide}
                className={`absolute inset-0 z-10 transition-opacity duration-700 ${
                  i === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {/* Image de fond — zoom cinématique à l'entrée */}
                {slide.image && (
                  <div
                    key={i === currentSlide ? slideKey : undefined}
                    className={`absolute inset-0 ${i === currentSlide ? 'carousel-bg-enter' : ''}`}
                    style={{
                      backgroundImage: `url(${slide.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center 30%',
                    }}
                    role="img"
                    aria-label={getTranslated(slide, 'title', slide.title, locale)}
                  />
                )}

                {/* Overlays obscurcissants */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#020d1a] via-[#020d1a]/90 to-[#020d1a]/50" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020d1a]/70 via-transparent to-[#020d1a]/20" />

                {/* Ligne lumineuse horizontale */}
                <div
                  className="absolute left-0 right-0 h-px"
                  style={{
                    top: '50%',
                    background: 'linear-gradient(90deg, transparent, rgba(0,168,181,0.06) 30%, rgba(0,168,181,0.12) 50%, rgba(0,168,181,0.06) 70%, transparent)',
                  }}
                  aria-hidden="true"
                />

                {/* Contenu — split layout */}
                <div className="relative z-10 h-full container mx-auto flex items-center px-6 md:px-12">
                  <div className="grid w-full grid-cols-1 items-center gap-12 md:grid-cols-2">

                    {/* ── GAUCHE : Texte ── */}
                    <div className="flex flex-col">

                      {/* Badge animé */}
                      <div
                        key={i === currentSlide ? `badge-${slideKey}` : undefined}
                        className={i === currentSlide ? 'animate-slide-text' : 'opacity-0'}
                        style={{ animationDelay: '0s' }}
                      >
                        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-althea-cta/25 bg-althea-cta/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-althea-cta backdrop-blur-sm">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-althea-cta" aria-hidden="true" />
                          Althea System
                        </span>
                      </div>

                      {/* Titre */}
                      <div
                        key={i === currentSlide ? `title-${slideKey}` : undefined}
                        className={i === currentSlide ? 'animate-slide-text' : 'opacity-0'}
                        style={{ animationDelay: '0.12s' }}
                      >
                        <h1 className="font-poppins text-4xl font-bold leading-[1.1] text-white text-glow-white md:text-[3.4rem]">
                          {getTranslated(slide, 'title', slide.title, locale)}
                        </h1>
                        {/* Trait décoratif */}
                        <div
                          className="mt-4 h-[2px] w-20 rounded-full"
                          style={{ background: 'linear-gradient(90deg, #00a8b5, #33bfc9 60%, transparent)' }}
                          aria-hidden="true"
                        />
                      </div>

                      {/* Sous-titre */}
                      {slide.subtitle && (
                        <div
                          key={i === currentSlide ? `sub-${slideKey}` : undefined}
                          className={i === currentSlide ? 'animate-slide-text' : 'opacity-0'}
                          style={{ animationDelay: '0.26s' }}
                        >
                          <p className="mt-5 max-w-md text-[1.05rem] leading-relaxed text-white/65">
                            {getTranslated(slide, 'subtitle', slide.subtitle, locale)}
                          </p>
                        </div>
                      )}

                      {/* CTA buttons */}
                      <div
                        key={i === currentSlide ? `cta-${slideKey}` : undefined}
                        className={`mt-8 flex flex-wrap items-center gap-4 ${i === currentSlide ? 'animate-slide-text' : 'opacity-0'}`}
                        style={{ animationDelay: '0.4s' }}
                      >
                        <GlassButton
                          size="lg"
                          href="/products"
                          className="glass-btn-overlay rounded-xl"
                        >
                          {t('hero.discover')}
                          <span aria-hidden="true">→</span>
                        </GlassButton>
                        {slide.link ? (
                          <Link
                            href={slide.link}
                            className="group flex items-center gap-1.5 text-sm text-white/45 transition-colors hover:text-white/80"
                          >
                            {t('learnMore')}
                            <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">›</span>
                          </Link>
                        ) : (
                          <Link
                            href="/products"
                            className="group flex items-center gap-1.5 text-sm text-white/45 transition-colors hover:text-white/80"
                          >
                            {t('viewFullCatalog')}
                            <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">›</span>
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* ── DROITE : Image flottante (md+) ── */}
                    {slide.image && (
                      <div className="hidden md:flex items-center justify-end">
                        <div
                          key={i === currentSlide ? `img-${slideKey}` : undefined}
                          className={`relative ${i === currentSlide ? 'animate-slide-3d' : 'opacity-0'}`}
                          style={{ animationDelay: '0.18s' }}
                        >
                          {/* Halo derrière l'image */}
                          <div
                            className="absolute -inset-8 rounded-3xl opacity-40"
                            style={{ background: 'radial-gradient(ellipse, rgba(0,168,181,0.4) 0%, transparent 70%)' }}
                            aria-hidden="true"
                          />
                          {/* Cadre image */}
                          <div
                            className="relative overflow-hidden rounded-2xl border border-althea-cta/30"
                            style={{ boxShadow: '0 0 60px rgba(0,168,181,0.22), 0 30px 80px rgba(0,0,0,0.55)' }}
                          >
                            <img
                              src={slide.image}
                              alt={getTranslated(slide, 'title', slide.title, locale)}
                              className="h-64 w-64 object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-br from-althea-cta/5 to-transparent" />
                          </div>
                          {/* Coins décoratifs */}
                          <div className="absolute -right-1 -top-1 h-5 w-5 rounded-tr-lg border-r-2 border-t-2 border-althea-cta" aria-hidden="true" />
                          <div className="absolute -bottom-1 -left-1 h-5 w-5 rounded-bl-lg border-b-2 border-l-2 border-althea-cta/50" aria-hidden="true" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            /* ── FALLBACK STATIQUE ── */
            <div className="absolute inset-0 z-10 flex items-center">
              <div className="container mx-auto px-6 md:px-12">
                <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-althea-cta/25 bg-althea-cta/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-althea-cta">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-althea-cta" aria-hidden="true" />
                  Althea System
                </span>
                <h1 className="mt-4 font-poppins text-4xl font-bold leading-[1.1] text-white text-glow-white md:text-[3.4rem]">
                  {t('hero.title')}
                </h1>
                <div
                  className="mt-4 h-[2px] w-20 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #00a8b5, #33bfc9 60%, transparent)' }}
                  aria-hidden="true"
                />
                <p className="mt-5 max-w-md text-[1.05rem] leading-relaxed text-white/65">
                  {t('hero.subtitle')}
                </p>
                <GlassButton
                  size="lg"
                  href="/products"
                  className="glass-btn-overlay rounded-xl mt-8"
                >
                  {t('hero.cta')}
                </GlassButton>
              </div>
            </div>
          )}

          {/* ── BARRE DE NAVIGATION INFÉRIEURE ── */}
          {slides.length > 1 && (
            <div
              className="absolute bottom-0 inset-x-0 z-20 flex items-center gap-3 border-t border-white/5 px-6 py-4 md:px-12"
              role="tablist"
              aria-label={t('carouselTabsAria')}
            >
              {/* Compteur */}
              <span className="min-w-[2.5rem] font-mono text-xs tabular-nums text-white/25">
                <span className="text-althea-cta font-semibold">{String(currentSlide + 1).padStart(2, '0')}</span>
                <span className="mx-1 text-white/15">/</span>
                {String(slides.length).padStart(2, '0')}
              </span>

              {/* Barre de progression */}
              <div className="relative h-px flex-1 overflow-hidden rounded-full bg-white/8">
                <div key={slideKey} className="carousel-progress-bar" />
              </div>

              {/* Dots */}
              <div className="flex gap-2">
                {slides.map((slide, i) => (
                  <button
                    key={i}
                    role="tab"
                    onClick={() => goToSlide(i)}
                    aria-selected={i === currentSlide}
                    className={`rounded-full transition-all duration-300 ${
                      i === currentSlide
                        ? 'h-1.5 w-6 bg-althea-cta'
                        : 'h-1.5 w-1.5 bg-white/20 hover:bg-white/40'
                    }`}
                    aria-label={`Diapositive ${i + 1}: ${getTranslated(slide, 'title', slide.title, locale)}`}
                  />
                ))}
              </div>

              {/* Flèches */}
              <div className="flex gap-1.5">
                <button
                  onClick={goPrev}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/30 transition-all hover:border-althea-cta/40 hover:bg-althea-cta/8 hover:text-althea-cta"
                  aria-label="Diapositive précédente"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={goNext}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/30 transition-all hover:border-althea-cta/40 hover:bg-althea-cta/8 hover:text-althea-cta"
                  aria-label="Diapositive suivante"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Divider lumineux en bas */}
          <div className="at-divider absolute bottom-0 inset-x-0 z-30" aria-hidden="true" />
        </section>

        {/* ─── ACCROCHE ─── */}
        <section className="py-12 text-center">
          <div className="container mx-auto px-4">
            <Reveal className="w-full">
              <div className="glass mx-auto max-w-4xl rounded-2xl px-8 py-10">
                <h2 className="font-poppins text-2xl font-semibold text-foreground md:text-3xl">
                  {s('tagline_title', t('tagline.title'))}
                </h2>
                <p className="mx-auto mt-3 max-w-3xl text-muted-foreground">
                  {s('tagline_description', t('tagline.description'))}
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-8">
                  <Stat label={t('tagline.products')} value={s('tagline_stat_products', '200+')} />
                  <Stat label={t('tagline.categories')} value={s('tagline_stat_categories', '12')} />
                  <Stat label={t('tagline.shipping')} value={s('tagline_stat_shipping', 'dès 100€ HT')} />
                  <Stat label={t('tagline.support')} value={s('tagline_stat_support', '48h')} />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ─── CATEGORIES GRID ─── */}
        {(categories.length > 0 || defaultCategories.length > 0) && (
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
                <h2 className="font-poppins text-2xl font-semibold text-foreground md:text-3xl">
                  {t('categoriesTitle')}
                </h2>
                <Link
                  href="/products"
                  className="text-sm font-medium text-althea-cta transition-colors hover:text-althea-hover"
                >
                  {t('viewAllCategories')}
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {(categories.length > 0 ? categories : defaultCategories).map((cat, idx) => (
                  <Reveal key={cat.id || cat.slug} delay={idx * 80}>
                    <Tilt3D intensity={8} perspective={600}>
                    <Link
                      href={`/products?category=${cat.slug}`}
                      className="group relative flex h-44 w-full items-end overflow-hidden rounded-xl border-glow bg-[#0d1f2e] transition-all duration-300"
                    >
                      {cat.image && (
                        <img
                          src={cat.image}
                          alt={getTranslated(cat, 'name', cat.name, locale)}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      )}
                      {!cat.image && (
                        <div className="absolute inset-0 bg-gradient-to-br from-althea-cta/15 to-[#003d5c]/40" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#020d1a]/90 via-[#020d1a]/30 to-transparent" />
                      <div className="relative w-full p-4">
                        <h3 className="font-poppins text-lg font-semibold text-white transition-all group-hover:text-glow">
                          {getTranslated(cat, 'name', cat.name, locale)}
                        </h3>
                        {cat._count && (
                          <span className="text-sm text-white/60">
                            {cat._count.products} {t('productsCount')}
                          </span>
                        )}
                      </div>
                    </Link>
                    </Tilt3D>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── TOP PRODUITS ─── */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-8 text-center font-poppins text-2xl font-semibold text-foreground md:text-3xl">
              {t('featuredTitle')}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {(featuredProducts.length > 0 ? featuredProducts : []).map((product, idx) => (
                <Reveal key={product.id} delay={idx * 70} className="h-full">
                  <Tilt3D className="h-full">
                  <article className="group flex h-full flex-col overflow-hidden rounded-xl glass">
                    <Link
                      href={`/products/${product.slug}`}
                      aria-label={`${product.name} — ${formatCurrency(product.price / 100)}`}
                      className="flex flex-1 flex-col"
                    >
                      <div className="relative aspect-[4/3] flex-shrink-0 overflow-hidden bg-muted/30">
                        {product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-althea-cta/40">
                            <Stethoscope className="h-12 w-12" aria-hidden="true" />
                          </div>
                        )}
                        {product.stock <= 0 && (
                          <span className="absolute left-2 top-2 rounded-full bg-destructive/80 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                            {t('outOfStock')}
                          </span>
                        )}
                        {product.stock > 0 && product.stock <= 5 && (
                          <span className="absolute left-2 top-2 rounded-full bg-althea-warning/80 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                            {t('limitedStock')}
                          </span>
                        )}
                        {/* Glass button 3D overlay */}
                        <div
                          className="absolute inset-x-0 bottom-0 translate-y-full p-3 transition-transform duration-300 group-hover:translate-y-0"
                          style={{ background: 'linear-gradient(to top, rgba(2,13,26,0.75) 0%, transparent 100%)' }}
                        >
                          <GlassButton
                            fullWidth
                            size="sm"
                            className="glass-btn-overlay rounded-xl"
                          >
                            {t('hero.discover')} →
                          </GlassButton>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        {product.category && (
                          <p className="mb-1 text-xs font-medium text-althea-cta">{product.category.name}</p>
                        )}
                        <h3 className="font-poppins text-sm font-semibold leading-tight text-foreground">
                          {product.name}
                        </h3>
                        <div className="mt-auto pt-2 flex items-center gap-2">
                          <span className="text-lg font-bold text-althea-cta">
                            {formatCurrency(product.price / 100)}
                          </span>
                          {product.comparePrice && (
                            <span className="text-sm text-muted-foreground line-through">
                              <span className="sr-only">Ancien prix : </span>
                              {formatCurrency(product.comparePrice / 100)}
                            </span>
                          )}
                        </div>
                        {product.stock > 0 ? (
                          <p className="mt-1 text-xs text-althea-success">{t('inStock')}</p>
                        ) : (
                          <p className="mt-1 text-xs text-destructive">{t('unavailable')}</p>
                        )}
                      </div>
                    </Link>
                  </article>
                  </Tilt3D>
                </Reveal>
              ))}
            </div>
            <div className="mt-8 text-center">
              <GlassButton
                size="lg"
                href="/products"
                className="glass-btn-overlay rounded-xl"
              >
                {t('viewFullCatalog')}
              </GlassButton>
            </div>
          </div>
        </section>

        {/* ─── REASSURANCE ─── */}
        <div className="at-divider" aria-hidden="true" />
        <section className="py-12">
          <div className="container mx-auto grid gap-6 px-4 md:grid-cols-4 md:items-stretch">
            {[
              { icon: <Truck className="h-8 w-8" aria-hidden="true" />, title: t('reassurance.fastDelivery.title'), desc: t('reassurance.fastDelivery.description'), delay: '0s' },
              { icon: <ShieldCheck className="h-8 w-8" aria-hidden="true" />, title: t('reassurance.certifiedQuality.title'), desc: t('reassurance.certifiedQuality.description'), delay: '1.5s' },
              { icon: <MessageCircle className="h-8 w-8" aria-hidden="true" />, title: t('reassurance.responsiveSupport.title'), desc: t('reassurance.responsiveSupport.description'), delay: '3s' },
              { icon: <Lock className="h-8 w-8" aria-hidden="true" />, title: t('reassurance.securePayment.title'), desc: t('reassurance.securePayment.description'), delay: '4.5s' },
            ].map((card, idx) => (
              <Reveal key={idx} delay={idx * 100}>
                <Tilt3D intensity={6} perspective={500} className="h-full">
                  <ReassuranceCard icon={card.icon} title={card.title} description={card.desc} delay={card.delay} />
                </Tilt3D>
              </Reveal>
            ))}
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}

/* ─── Sub-components ─── */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="font-poppins text-2xl font-semibold text-shimmer">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function ReassuranceCard({
  icon,
  title,
  description,
  delay = '0s',
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: string;
}) {
  return (
    <div className="glass flex h-full w-full flex-col items-center rounded-xl p-6 text-center">
      <div className="text-althea-cta animate-float" style={{ animationDelay: delay }} aria-hidden="true">
        {icon}
      </div>
      <h3 className="mt-3 font-poppins font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

const defaultCategories: Category[] = [];
