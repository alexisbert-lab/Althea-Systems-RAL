'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from '@/lib/translations';
import { api } from '@/lib/client-api';
import { Navbar } from '@/components/barre-navigation';
import { Footer } from '@/components/pied-page';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utilitaires';
import { Reveal } from '@/components/reveal';
import { GlassButton } from '@/components/glass-button';
import { Search, SlidersHorizontal, LayoutGrid, Layers, RotateCcw, Star, Sparkles, Package, Tag } from 'lucide-react';

/* ---------- types ---------- */
interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  stock: number;
  images: string[];
  featured: boolean;
  specs?: Record<string, string> | null;
  category?: { id: string; name: string; slug: string } | null;
  categoryName?: string; // from Meilisearch
}

interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  description: string | null;
  _count?: { products: number };
}

interface SearchResult {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    processingTimeMs?: number;
    provider?: string;
  };
  facets?: { categoryName?: Record<string, number> };
}

/* ---------- Carte catégorie avec tilt 3D ---------- */
function CarteCategorieFiltre({
  isSelected, onClick, label, count, image, isAll,
}: {
  isSelected: boolean;
  onClick: () => void;
  label: string;
  count: number;
  image?: string | null;
  isAll?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isSelected) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(300px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale(1.02)`;
  };

  const onLeave = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn(
        'group relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left overflow-hidden',
        isSelected
          ? 'bg-gradient-to-r from-althea-cta/20 to-althea-cta/5 border border-althea-cta/50 shadow-glow'
          : 'glass-light border border-transparent hover:border-althea-cta/30',
      )}
      style={{ willChange: 'transform', transition: isSelected ? 'box-shadow 0.2s' : 'border-color 0.2s, box-shadow 0.2s' }}
    >
      {/* shimmer au hover */}
      {!isSelected && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
          style={{ background: 'linear-gradient(135deg, rgba(0,168,181,0.07) 0%, transparent 60%)' }}
        />
      )}

      {/* Icône / miniature */}
      <div className={cn(
        'relative w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden transition-colors duration-200',
        isSelected ? 'bg-althea-cta/25' : 'bg-althea-cta/10 group-hover:bg-althea-cta/18',
      )}>
        {image
          ? <img src={image} alt="" className="w-full h-full object-cover" />
          : isAll
            ? <LayoutGrid className="w-3.5 h-3.5 text-althea-cta" />
            : <Layers className="w-3.5 h-3.5 text-althea-cta" />
        }
      </div>

      <span className={cn(
        'relative flex-1 text-sm font-medium truncate transition-colors duration-200',
        isSelected ? 'text-althea-cta' : 'text-foreground group-hover:text-althea-cta',
      )}>
        {label}
      </span>

      {count > 0 && (
        <span className={cn(
          'relative text-[11px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 transition-colors duration-200',
          isSelected ? 'bg-althea-cta/20 text-althea-cta' : 'bg-muted text-muted-foreground',
        )}>
          {count}
        </span>
      )}

      {isSelected && (
        <span className="relative w-1.5 h-1.5 rounded-full bg-althea-cta shrink-0" />
      )}
    </button>
  );
}

/* ---------- Carte produit 3D avec tilt souris ---------- */
function CarteProduct3D({
  product,
  onAddToCart,
  isOutOfStock,
  catName,
  t,
  tHome,
  formatCurrency,
}: {
  product: Product;
  onAddToCart: (e: React.MouseEvent, product: Product) => void;
  isOutOfStock: boolean;
  catName: string;
  t: (key: string, opts?: Record<string, string>) => string;
  tHome: (key: string) => string;
  formatCurrency: (n: number) => string;
}) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const shimRef = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;   // -0.5..0.5
    const y = (e.clientY - r.top)  / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) scale(1.025) translateZ(10px)`;
    // Reflet dynamique selon position souris
    if (shimRef.current) {
      shimRef.current.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(0,168,181,0.18) 0%, transparent 70%)`;
      shimRef.current.style.opacity = '1';
    }
  };

  const onLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = '';
    if (shimRef.current) shimRef.current.style.opacity = '0';
  };

  const discount = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null;

  return (
    <Link
      ref={cardRef}
      href={`/products/${product.slug}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`group relative flex h-full flex-col overflow-hidden rounded-xl glass product-card${isOutOfStock ? ' opacity-60' : ''}`}
      style={{ willChange: 'transform', transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease' }}
    >
      {/* Reflet dynamique souris */}
      <div
        ref={shimRef}
        className="pointer-events-none absolute inset-0 z-10 rounded-xl opacity-0 transition-opacity duration-300"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(0,168,181,0.18) 0%, transparent 70%)' }}
      />

      {/* Halo glow extérieur au hover */}
      <div className="pointer-events-none absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ boxShadow: '0 0 0 1.5px rgba(0,168,181,0.45), 0 20px 60px rgba(0,168,181,0.22)' }} />

      {/* ── Image ── */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted/30 flex-shrink-0">
        {product.images?.[0] ? (
          <>
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.08]"
              loading="lazy"
            />
            {/* Reflet glissant sur l'image */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)',
                backgroundSize: '200% 100%',
                animation: 'imageShine 0.6s ease forwards',
              }}
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg className="h-16 w-16 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.featured && (
            <span className="rounded-full bg-althea-cta px-2 py-0.5 text-xs font-semibold text-white animate-badge-pulse">
              ★ {t('featured')}
            </span>
          )}
          {discount !== null && (
            <span className="rounded-full bg-althea-error px-2 py-0.5 text-xs font-bold text-white animate-badge-pulse">
              -{discount}%
            </span>
          )}
        </div>

        {/* Stock badge */}
        {product.stock != null && (
          <div className="absolute bottom-2 right-2">
            {product.stock === 0 ? (
              <span className="rounded-full bg-red-500/80 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                {tHome('outOfStock')}
              </span>
            ) : product.stock <= 5 ? (
              <span className="rounded-full bg-yellow-500/80 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                {tHome('limitedStock')}
              </span>
            ) : (
              <span className="rounded-full bg-althea-success/80 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                {t('inStock')}
              </span>
            )}
          </div>
        )}

        {/* Bouton ajout panier */}
        {product.stock > 0 && (
          <div
            className="absolute inset-x-0 bottom-0 translate-y-full p-3 transition-transform duration-300 group-hover:translate-y-0"
            style={{ background: 'linear-gradient(to top, rgba(2,13,26,0.75) 0%, transparent 100%)' }}
          >
            <GlassButton
              fullWidth
              size="sm"
              onClick={(e) => onAddToCart(e, product)}
              aria-label={t('addToCartAria', { name: product.name })}
              className="glass-btn-overlay rounded-xl"
            >
              {tHome('addToCart')}
            </GlassButton>
          </div>
        )}
      </div>

      {/* ── Infos ── */}
      <div className="flex flex-1 flex-col p-4">
        {catName && (
          <p className="mb-1 text-xs font-medium text-althea-cta">{catName}</p>
        )}
        <h3 className="line-clamp-2 font-semibold text-foreground transition-colors group-hover:text-althea-cta">
          {product.name}
        </h3>
        {product.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {product.description}
          </p>
        )}
        <div className="mt-auto pt-3 flex items-baseline gap-2">
          <span className="text-lg font-bold text-althea-cta">
            {formatCurrency(product.price / 100)}
          </span>
          <span className="text-xs text-muted-foreground">{t('priceExclTax')}</span>
          {discount !== null && (
            <span className="text-sm text-muted-foreground line-through">
              {formatCurrency((product.comparePrice as number) / 100)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ---------- page ---------- */
export default function ProductsPage() {
  const t = useTranslations('productsPage');
  const tHome = useTranslations('homePage');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [facetCounts, setFacetCounts] = useState<Record<string, number>>({});
  const [searchMeta, setSearchMeta] = useState<SearchResult['meta'] | null>(null);

  // Filters — initialise depuis les paramètres d'URL si présents
  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQ);
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('categoryId') || '');
  const [minPrice, setMinPrice] = useState(() => searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get('maxPrice') || '');
  const [availableOnly, setAvailableOnly] = useState(() => searchParams.get('availableOnly') === 'true');
  const [featuredOnly, setFeaturedOnly] = useState(() => searchParams.get('featuredOnly') === 'true');
  const [onSale, setOnSale] = useState(() => searchParams.get('onSale') === 'true');
  const [newestFirst, setNewestFirst] = useState(() => searchParams.get('sortBy') === 'createdAt');
  const [sortBy, setSortBy] = useState(() => {
    const s = searchParams.get('sortBy');
    return s && s !== 'createdAt' ? s : 'position';
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    const o = searchParams.get('sortOrder');
    return o === 'asc' || o === 'desc' ? o : 'asc';
  });
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string[]>>({});

  const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  // Garde une trace de la dernière URL pour détecter les navigations externes (mega-menu)
  const lastSearchParamsRef = useRef(searchParams.toString());

  // Synchronise les filtres quand l'URL change de l'extérieur (ex: clic mega-menu depuis la page catalogue)
  useEffect(() => {
    const current = searchParams.toString();
    if (current === lastSearchParamsRef.current) return;
    lastSearchParamsRef.current = current;

    const newQ = searchParams.get('q') || '';
    setQuery(newQ);
    setDebouncedQuery(newQ);
    setSelectedCategory(searchParams.get('categoryId') || '');
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
    setAvailableOnly(searchParams.get('availableOnly') === 'true');
    setFeaturedOnly(searchParams.get('featuredOnly') === 'true');
    setOnSale(searchParams.get('onSale') === 'true');
    const sb = searchParams.get('sortBy');
    setNewestFirst(sb === 'createdAt');
    setSortBy(sb && sb !== 'createdAt' ? sb : 'position');
    const so = searchParams.get('sortOrder');
    setSortOrder(so === 'asc' || so === 'desc' ? so : 'asc');
    setPage(1);
  }, [searchParams]);

  // Load categories once
  useEffect(() => {
    api.get<Category[] | { data: Category[] }>(`/api/categories?active=true&locale=${locale}`)
      .then((data) => {
        setCategories(Array.isArray(data) ? data : (data as any).data || []);
      })
      .catch(() => {});
  }, [locale]);

  // Debounce search query
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [query]);

  // Search products
  const searchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set('q', debouncedQuery);
      if (selectedCategory) params.set('categoryId', selectedCategory);
      if (minPrice) params.set('minPrice', String(Math.round(parseFloat(minPrice) * 100)));
      if (maxPrice) params.set('maxPrice', String(Math.round(parseFloat(maxPrice) * 100)));
      if (availableOnly) params.set('availableOnly', 'true');
      if (featuredOnly) params.set('featuredOnly', 'true');
      if (onSale) params.set('onSale', 'true');
      params.set('sortBy', newestFirst ? 'createdAt' : sortBy);
      params.set('sortOrder', newestFirst ? 'desc' : sortOrder);
      params.set('page', String(page));
      params.set('limit', '12');

      const result = await api.get<SearchResult>(`/api/search?${params.toString()}`);
      setProducts(result.data || []);
      setSearchMeta(result.meta || null);
      if (result.facets?.categoryName) {
        setFacetCounts(result.facets.categoryName);
      }
    } catch {
      // Fallback to regular products endpoint
      try {
        const params = new URLSearchParams({ page: String(page), limit: '12' });
        if (debouncedQuery) params.set('search', debouncedQuery);
        if (selectedCategory) params.set('categoryId', selectedCategory);
        const data = await api.get<{ data: Product[]; meta: any }>(`/api/products?${params.toString()}`);
        setProducts(data.data || []);
        setSearchMeta(data.meta || null);
      } catch {
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, selectedCategory, minPrice, maxPrice, availableOnly, featuredOnly, onSale, newestFirst, sortBy, sortOrder, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    searchProducts();
  }, [searchProducts]);

  /* helpers */
  const totalPages = searchMeta?.totalPages || 1;
  const totalResults = searchMeta?.total || 0;
  const processingTime = searchMeta?.processingTimeMs;

  const addToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    const cart = JSON.parse(localStorage.getItem('althea-cart') || '[]');
    const existing = cart.find((i: any) => i.productId === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        comparePrice: product.comparePrice ?? null,
        image: product.images?.[0] || '',
        quantity: 1,
      });
    }
    localStorage.setItem('althea-cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
  };

  // Spec facets extracted from current product set
  const specFacets = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const p of products) {
      if (!p.specs) continue;
      for (const [key, val] of Object.entries(p.specs)) {
        if (!map[key]) map[key] = new Set();
        map[key].add(String(val));
      }
    }
    return Object.fromEntries(Object.entries(map).map(([k, s]) => [k, Array.from(s).sort()]));
  }, [products]);

  // Client-side spec filter
  const filteredBySpecs = useMemo(() => {
    const activeSpecs = Object.entries(selectedSpecs).filter(([, v]) => v.length > 0);
    if (activeSpecs.length === 0) return products;
    return products.filter((p) => {
      if (!p.specs) return false;
      return activeSpecs.every(([key, values]) =>
        values.includes(String(p.specs![key] ?? '')),
      );
    });
  }, [products, selectedSpecs]);

  const toggleSpec = (key: string, value: string) => {
    setSelectedSpecs((prev) => {
      const current = prev[key] || [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      if (next.length === 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: next };
    });
  };

  const resetFilters = () => {
    setQuery('');
    setDebouncedQuery('');
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setAvailableOnly(false);
    setFeaturedOnly(false);
    setOnSale(false);
    setNewestFirst(false);
    setSortBy('position');
    setSortOrder('asc');
    setSelectedSpecs({});
    setPage(1);
  };

  const hasActiveSpecs = Object.values(selectedSpecs).some((v) => v.length > 0);
  const hasActiveFilters = debouncedQuery || selectedCategory || minPrice || maxPrice || availableOnly || featuredOnly || onSale || newestFirst || sortBy !== 'position' || sortOrder !== 'asc' || hasActiveSpecs;
  const activeCat = categories.find((c) => c.id === selectedCategory) ?? null;

  /* ---------- render ---------- */
  return (
    <>
      <Navbar />
      <main id="main-content" className="container mx-auto min-h-screen px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-poppins text-3xl font-semibold text-foreground">
              {t('title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {totalResults} {t('results')}
              {processingTime != null && (
                <span className="ml-1 text-xs">
                  ({processingTime}ms)
                </span>
              )}
            </p>
          </div>

          {/* Sort + mobile filter toggle */}
          <div className="flex items-center gap-3">
            <button
              className="rounded-md border px-3 py-2 text-sm lg:hidden"
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              aria-expanded={mobileFiltersOpen}
              aria-controls="products-filters"
              aria-label={mobileFiltersOpen ? t('closeFilters') : t('openFilters')}
            >
              <svg className="mr-1 inline h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {t('filters')}
            </button>

            {/* List / grid toggle (visible on mobile) */}
            <div className="flex rounded-md border lg:hidden">
              <button
                onClick={() => setViewMode('grid')}
                aria-label={t('gridView')}
                className={`px-2.5 py-2 ${viewMode === 'grid' ? 'bg-althea-cta text-white' : 'text-muted-foreground'}`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-label={t('listView')}
                className={`px-2.5 py-2 ${viewMode === 'list' ? 'bg-althea-cta text-white' : 'text-muted-foreground'}`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>

            <label htmlFor="products-sort" className="sr-only">{t('sortBy')}</label>
            <select
              id="products-sort"
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [s, o] = e.target.value.split('_') as [string, 'asc' | 'desc'];
                setSortBy(s);
                setSortOrder(o);
                setPage(1);
              }}
              className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
            >
              <option value="position_asc">{t('sort.default')}</option>
              <option value="price_asc">{t('sort.priceAsc')}</option>
              <option value="price_desc">{t('sort.priceDesc')}</option>
              <option value="createdAt_desc">{t('sort.newest')}</option>
              <option value="stock_desc">{t('sort.availability')}</option>
            </select>
          </div>
        </div>

        <div className="flex gap-8">
          {/* ====== Sidebar Filters ====== */}
          <aside id="products-filters" aria-label={t('filtersAria')} className={`w-64 flex-shrink-0 ${mobileFiltersOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="glass rounded-2xl overflow-hidden">

              {/* En-tête */}
              <div className="flex items-center gap-2 px-4 py-3.5 border-b border-althea-cta/15">
                <div className="w-6 h-6 rounded-md bg-althea-cta/15 flex items-center justify-center">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-althea-cta" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('filters')}</span>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    title={t('reset')}
                    className="ml-auto flex items-center gap-1 text-xs text-althea-cta hover:text-althea-hover transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {t('reset')}
                  </button>
                )}
              </div>

              <div className="p-4 space-y-5">

                {/* Recherche */}
                <div>
                  <label htmlFor="products-search" className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Search className="w-3 h-3" />
                    {t('searchLabel')}
                  </label>
                  <div className="relative">
                    <input
                      id="products-search"
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t('search')}
                      className="w-full rounded-xl glass-light border border-althea-cta/15 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-althea-cta/40 focus:border-althea-cta/40 transition-all"
                    />
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  </div>
                </div>

                <div className="at-divider" />

                {/* Catégories */}
                <div>
                  <div className="mb-3 flex items-center gap-1.5">
                    <LayoutGrid className="w-3 h-3 text-althea-cta" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('category')}</span>
                  </div>
                  <div className="space-y-1.5">
                    <CarteCategorieFiltre
                      isSelected={!selectedCategory}
                      onClick={() => { setSelectedCategory(''); setPage(1); }}
                      label={t('allCategories')}
                      count={totalResults}
                      isAll
                    />
                    {categories.map((cat) => {
                      const count = facetCounts[cat.name] || cat._count?.products || 0;
                      return (
                        <CarteCategorieFiltre
                          key={cat.id}
                          isSelected={selectedCategory === cat.id}
                          onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
                          label={cat.name}
                          count={count}
                          image={cat.image}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="at-divider" />

                {/* Prix */}
                <fieldset>
                  <legend className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span>€</span>
                    {t('price')} <span className="normal-case font-normal">({t('priceExclTax')})</span>
                  </legend>
                  <div className="flex items-center gap-2">
                    <label htmlFor="price-min" className="sr-only">{t('priceMin')}</label>
                    <input
                      id="price-min"
                      type="number"
                      min="0"
                      step="1"
                      placeholder={t('min')}
                      value={minPrice}
                      onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
                      className="w-full rounded-xl glass-light border border-althea-cta/15 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-althea-cta/40 focus:border-althea-cta/40 transition-all"
                    />
                    <span className="text-muted-foreground shrink-0" aria-hidden="true">—</span>
                    <label htmlFor="price-max" className="sr-only">{t('priceMax')}</label>
                    <input
                      id="price-max"
                      type="number"
                      min="0"
                      step="1"
                      placeholder={t('max')}
                      value={maxPrice}
                      onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                      className="w-full rounded-xl glass-light border border-althea-cta/15 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-althea-cta/40 focus:border-althea-cta/40 transition-all"
                    />
                  </div>
                </fieldset>

                <div className="at-divider" />

                {/* Disponibilité + filtres supplémentaires */}
                <div className="space-y-3">
                  {[
                    {
                      label: t('inStockOnly'),
                      icon: Package,
                      checked: availableOnly,
                      onToggle: () => { setAvailableOnly((v) => !v); setPage(1); },
                      id: 'filter-available',
                    },
                    {
                      label: t('filterFeatured'),
                      icon: Star,
                      checked: featuredOnly,
                      onToggle: () => { setFeaturedOnly((v) => !v); setPage(1); },
                      id: 'filter-featured',
                    },
                    {
                      label: t('filterOnSale'),
                      icon: Tag,
                      checked: onSale,
                      onToggle: () => { setOnSale((v) => !v); setPage(1); },
                      id: 'filter-on-sale',
                    },
                    {
                      label: t('filterNewest'),
                      icon: Sparkles,
                      checked: newestFirst,
                      onToggle: () => { setNewestFirst((v) => !v); setPage(1); },
                      id: 'filter-newest',
                    },
                  ].map(({ label, icon: Icon, checked, onToggle, id }) => (
                    <label key={id} htmlFor={id} className="flex items-center justify-between gap-3 cursor-pointer group">
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground group-hover:text-althea-cta transition-colors">
                        <Icon className="w-3.5 h-3.5 text-althea-cta shrink-0" />
                        {label}
                      </span>
                      <button
                        id={id}
                        role="switch"
                        aria-checked={checked}
                        onClick={onToggle}
                        className={cn(
                          'relative rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-althea-cta/40 shrink-0',
                          checked ? 'bg-althea-cta' : 'bg-muted border border-border',
                        )}
                        style={{ height: '22px', width: '40px' }}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200',
                            checked ? 'translate-x-[18px]' : 'translate-x-0',
                          )}
                        />
                      </button>
                    </label>
                  ))}
                </div>

                {/* Caractéristiques techniques — uniquement quand une catégorie est sélectionnée */}
                {selectedCategory && Object.keys(specFacets).length > 0 && (
                  <>
                    <div className="at-divider" />
                    <div>
                      <div className="mb-3 flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3 h-3 text-althea-cta" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('specs')}</span>
                      </div>
                      <div className="space-y-4">
                        {Object.entries(specFacets).map(([key, values]) => (
                          <div key={key}>
                            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{key}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {values.map((val) => {
                                const checked = (selectedSpecs[key] || []).includes(val);
                                return (
                                  <button
                                    key={val}
                                    onClick={() => toggleSpec(key, val)}
                                    className={cn(
                                      'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                                      checked
                                        ? 'bg-althea-cta text-white'
                                        : 'glass-light border border-althea-cta/20 text-foreground hover:border-althea-cta/60',
                                    )}
                                  >
                                    {val}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

              </div>
            </div>
          </aside>

          {/* ====== Products Grid ====== */}
          <div className="flex-1">
            {/* Category banner */}
            {activeCat && (
              <div className="mb-6">
                {activeCat.image && (
                  <div className="relative h-48 overflow-hidden rounded-xl">
                    <img
                      src={activeCat.image}
                      alt={activeCat.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <h2 className="font-poppins text-3xl font-bold text-white drop-shadow-md">
                        {activeCat.name}
                      </h2>
                    </div>
                  </div>
                )}
                {activeCat.description && (
                  <p className="mt-3 text-sm text-muted-foreground">{activeCat.description}</p>
                )}
              </div>
            )}

            {loading ? (
              <div className="flex h-64 items-center justify-center" role="status" aria-busy="true" aria-live="polite">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-althea-cta border-t-transparent" aria-hidden="true" />
                <span className="sr-only">{t('loading')}</span>
              </div>
            ) : filteredBySpecs.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <svg className="mb-4 h-16 w-16 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-lg font-medium text-muted-foreground">
                  {t('noResults')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('noResultsDesc')}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="mt-3 text-sm text-althea-cta hover:underline"
                  >
                    {t('clearAllFilters')}
                  </button>
                )}
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-3">
                {filteredBySpecs.map((product, idx) => (
                  <Reveal key={product.id} delay={(idx % 6) * 60}>
                    <Link
                      href={`/products/${product.slug}`}
                      className="flex items-center gap-4 rounded-xl border bg-card p-3 hover:border-althea-cta/40 hover:shadow-sm transition-all"
                    >
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{product.name}</p>
                        {product.category?.name && (
                          <p className="text-xs text-muted-foreground">{product.category.name}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-semibold text-althea-cta">{formatCurrency(product.price / 100)}</span>
                        {product.stock === 0 ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{t('outOfStock')}</span>
                        ) : (
                          <button
                            onClick={(e) => { e.preventDefault(); addToCart(e, product); }}
                            className="rounded-full bg-althea-cta px-3 py-1 text-xs font-medium text-white hover:bg-althea-hover"
                          >
                            {t('addToCartShort')}
                          </button>
                        )}
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredBySpecs.map((product, idx) => (
                  <Reveal key={product.id} delay={(idx % 6) * 60} className="h-full">
                    <CarteProduct3D
                      product={product}
                      onAddToCart={addToCart}
                      isOutOfStock={product.stock === 0}
                      catName={product.category?.name || product.categoryName || ''}
                      t={t}
                      tHome={tHome}
                      formatCurrency={formatCurrency}
                    />
                  </Reveal>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <nav aria-label={t('paginationAria')} className="mt-8 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('page')} {page} {t('of')} {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    aria-label={tCommon('previous')}
                  >
                    <span aria-hidden="true">←</span> {tCommon('previous')}
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const p = page <= 3 ? i + 1 : page - 2 + i;
                    if (p > totalPages || p < 1) return null;
                    return (
                      <Button
                        key={p}
                        variant={p === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(p)}
                        aria-label={`Page ${p}`}
                        aria-current={p === page ? 'page' : undefined}
                        className={p === page ? 'bg-althea-cta hover:bg-althea-hover' : ''}
                      >
                        {p}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    aria-label={tCommon('next')}
                  >
                    {tCommon('next')} <span aria-hidden="true">→</span>
                  </Button>
                </div>
              </nav>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
