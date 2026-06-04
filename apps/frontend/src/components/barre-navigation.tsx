'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/translations';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utilitaires';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ShoppingCart, Menu, X, Search, ChevronDown, ChevronRight, Layers, LayoutGrid, Sparkles, CheckCircle2, Tag, TrendingUp, Instagram, Facebook, Linkedin, Youtube } from 'lucide-react';
import { BasculeLangue } from '@/components/bascule-langue';
import { BasculeTheme } from '@/components/bascule-theme';
import { getClientLocale } from '@/lib/client-api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface CategoryNav {
  id: string;
  name: string;
  slug: string;
  _count?: { products: number };
}

interface Suggestion {
  name: string;
  slug: string;
  image: string | null;
  categoryName: string;
}

/* ---- Autocomplete dropdown (réutilisé desktop + mobile) ---- */
function SuggestDropdown({
  suggestions,
  activeIdx,
  seeAllResultsLabel,
  listAriaLabel,
  onSelect,
  onSeeAll,
  onHover,
}: {
  suggestions: Suggestion[];
  activeIdx: number;
  seeAllResultsLabel: string;
  listAriaLabel: string;
  onSelect: (slug: string) => void;
  onSeeAll: () => void;
  onHover: (i: number) => void;
}) {
  if (suggestions.length === 0) return null;
  return (
    <ul
      role="listbox"
      aria-label={listAriaLabel}
      className="absolute left-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-xl glass shadow-glow-lg border-glow"
    >
      {suggestions.map((s, i) => (
        <li
          key={s.slug}
          role="option"
          aria-selected={i === activeIdx}
          id={`suggestion-${i}`}
        >
          <button
            onMouseDown={(e) => { e.preventDefault(); onSelect(s.slug); }}
            onMouseEnter={() => onHover(i)}
            tabIndex={-1}
            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
              i === activeIdx ? 'bg-secondary' : 'hover:bg-accent'
            }`}
          >
            <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-md bg-muted">
              {s.image ? (
                <img src={s.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
              {s.categoryName && (
                <p className="text-xs text-muted-foreground">{s.categoryName}</p>
              )}
            </div>
          </button>
        </li>
      ))}
      <li className="border-t px-4 py-2.5">
        <button
          onMouseDown={(e) => { e.preventDefault(); onSeeAll(); }}
          tabIndex={-1}
          className="text-sm text-althea-cta hover:underline"
        >
          {seeAllResultsLabel}
        </button>
      </li>
    </ul>
  );
}

/* ---- Carte catégorie avec tilt 3D au survol ---- */
function CarteCategorieNav({ cat, onClick }: { cat: CategoryNav; onClick: () => void }) {
  const t = useTranslations('nav');
  const ref = useRef<HTMLAnchorElement>(null);

  const onMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(400px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale(1.03) translateZ(6px)`;
  };

  const onLeave = (_e: React.MouseEvent<HTMLAnchorElement>) => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <Link
      ref={ref}
      href={`/products?categoryId=${cat.id}` as any}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="group relative overflow-hidden glass-light rounded-xl p-3.5 flex items-center gap-3 border border-transparent hover:border-althea-cta/50 hover:shadow-glow"
      style={{ willChange: 'transform', transition: 'border-color 0.2s, box-shadow 0.2s' }}
    >
      {/* shimmer overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
        style={{ background: 'linear-gradient(135deg, rgba(0,168,181,0.1) 0%, transparent 60%)' }}
      />
      <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-althea-cta/20 to-althea-cta/5 group-hover:from-althea-cta/30 flex items-center justify-center shrink-0 transition-colors duration-200">
        <Layers className="w-4 h-4 text-althea-cta" />
      </div>
      <div className="relative min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 group-hover:text-althea-cta transition-colors duration-200 truncate">{cat.name}</p>
        {cat._count !== undefined && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{cat._count.products} {cat._count.products !== 1 ? t('productPlural') : t('productSingular')}</p>
        )}
      </div>
      <ChevronRight className="relative w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-althea-cta group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
    </Link>
  );
}

export function BarreNavigation() {
  const t = useTranslations('nav');
  const tFooterInfo = useTranslations('footer.info');
  const { isAuthenticated, user, logout } = useAuthentificationStore();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCatalogOpen, setMobileCatalogOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<CategoryNav[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const catalogTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* ---- Autocomplete state ---- */
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* ---- Fetch categories for catalog menu ---- */
  useEffect(() => {
    fetch(`${API_BASE}/api/categories`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setCategories(Array.isArray(data) ? data : data.data || []))
      .catch(() => {});
  }, []);

  /* ---- Cart count ---- */
  useEffect(() => {
    const updateCartCount = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('althea-cart') || '[]');
        setCartCount(cart.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0));
      } catch { setCartCount(0); }
    };
    updateCartCount();
    window.addEventListener('storage', updateCartCount);
    window.addEventListener('cart-updated', updateCartCount);
    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cart-updated', updateCartCount);
    };
  }, []);

  /* ---- Fetch suggestions (debounced 200ms) ---- */
  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/search/suggest?q=${encodeURIComponent(q)}&limit=6`,
          {
            headers: {
              'X-Locale': getClientLocale(),
              'Accept-Language': getClientLocale(),
            },
          },
        );
        if (res.ok) {
          const data = await res.json();
          const unique = Array.isArray(data)
            ? data.filter((s: Suggestion, i: number, arr: Suggestion[]) => arr.findIndex((x) => x.slug === s.slug) === i)
            : [];
          setSuggestions(unique);
          setShowSuggestions(true);
          setActiveIdx(-1);
        }
      } catch { /* silent */ }
    }, 200);
    return () => { if (suggestTimer.current) clearTimeout(suggestTimer.current); };
  }, [searchQuery]);

  /* ---- Click outside to close ---- */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        desktopRef.current && !desktopRef.current.contains(target) &&
        mobileRef.current && !mobileRef.current.contains(target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /* ---- Helpers ---- */
  const closeSuggestions = useCallback(() => {
    setShowSuggestions(false);
    setActiveIdx(-1);
    setSuggestions([]);
  }, []);

  const selectSuggestion = useCallback((slug: string) => {
    router.push(`/products/${slug}`);
    setSearchQuery('');
    closeSuggestions();
    setMobileMenuOpen(false);
  }, [router, closeSuggestions]);

  const seeAllResults = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/products?q=${encodeURIComponent(q)}`);
    setSearchQuery('');
    closeSuggestions();
    setMobileMenuOpen(false);
  }, [searchQuery, router, closeSuggestions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIdx >= 0 && suggestions[activeIdx]) {
      selectSuggestion(suggestions[activeIdx].slug);
      return;
    }
    seeAllResults();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Escape') {
      closeSuggestions();
    }
  };


  const STAFF_ROLES = ['ADMIN', 'MANAGER_PRODUCTS', 'MANAGER_ORDERS', 'ACCOUNTANT', 'MODERATOR'];
  const isStaff = user?.role ? STAFF_ROLES.includes(user.role) : false;

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-50 nav-glass">
      <nav aria-label="Navigation principale" className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/images/logo-althea-system-removebg-preview.png"
            alt="Althea System"
            className="hidden h-14 w-auto md:block"
          />
          <span className="text-lg font-bold md:hidden">
            <span className="text-althea-cta">A</span><span className="text-althea-dark">lthea</span>
          </span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {/* Accueil */}
          <Link
            href="/"
            aria-current={pathname === '/' ? 'page' : undefined}
            className={cn('text-sm font-medium transition-colors hover:text-althea-cta', pathname === '/' ? 'text-althea-cta' : 'text-foreground')}
          >
            {t('home')}
          </Link>

          {/* Catalogue mega-menu */}
          <div className="relative">
            <button
              onMouseEnter={() => { if (catalogTimer.current) clearTimeout(catalogTimer.current); setCatalogOpen(true); }}
              onMouseLeave={() => { catalogTimer.current = setTimeout(() => setCatalogOpen(false), 180); }}
              aria-expanded={catalogOpen}
              aria-haspopup="true"
              className={cn(
                'flex items-center gap-1 text-sm font-medium transition-colors hover:text-althea-cta',
                pathname.startsWith('/products') ? 'text-althea-cta' : 'text-foreground',
              )}
            >
              {t('products')}
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-300', catalogOpen ? 'rotate-180' : '')} />
            </button>

            {catalogOpen && (
              <div
                onMouseEnter={() => { if (catalogTimer.current) clearTimeout(catalogTimer.current); }}
                onMouseLeave={() => setCatalogOpen(false)}
                className="catalog-mega-menu absolute left-1/2 top-full z-50 mt-3 -translate-x-1/2 w-[620px] rounded-2xl overflow-hidden"
              >
                {/* En-tête */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-althea-cta/20">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-althea-cta/20 flex items-center justify-center">
                      <LayoutGrid className="w-3 h-3 text-althea-cta" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t('catalogLabel')}</span>
                  </div>
                  <Link
                    href="/products"
                    onClick={() => setCatalogOpen(false)}
                    className="flex items-center gap-1 text-xs text-althea-cta hover:text-althea-hover transition-colors font-medium"
                  >
                    {t('viewAll')} <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Filtres rapides */}
                <div className="px-5 pt-3 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">{t('quickAccess')}</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: t('filterNew'), icon: Sparkles, href: '/products?sortBy=createdAt&sortOrder=desc' },
                      { label: t('filterAvailable'), icon: CheckCircle2, href: '/products?availableOnly=true' },
                      { label: t('filterSale'), icon: Tag, href: '/products?onSale=true' },
                      { label: t('filterFeatured'), icon: TrendingUp, href: '/products?featuredOnly=true' },
                    ].map(({ label, icon: Icon, href }) => (
                      <Link
                        key={label}
                        href={href as any}
                        onClick={() => setCatalogOpen(false)}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-althea-cta/10 dark:bg-althea-cta/15 text-althea-cta border border-althea-cta/20 hover:bg-althea-cta/20 hover:border-althea-cta/40 transition-all duration-150"
                      >
                        <Icon className="w-3 h-3" />
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="px-5 pb-1 pt-2">
                  <div className="h-px bg-althea-cta/10" />
                </div>

                {/* Grille catégories */}
                <div className="px-4 pb-3 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 px-1">{t('categories')}</p>
                  {categories.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((cat) => (
                        <CarteCategorieNav key={cat.id} cat={cat} onClick={() => setCatalogOpen(false)} />
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">{t('categoriesLoading')}</div>
                  )}
                </div>

                {/* Footer CTA */}
                <div className="px-4 pb-4">
                  <Link
                    href="/products"
                    onClick={() => setCatalogOpen(false)}
                    className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 bg-gradient-to-r from-althea-cta/15 to-althea-cta/8 border border-althea-cta/30 hover:from-althea-cta/25 hover:border-althea-cta/50 transition-all duration-200 text-sm font-semibold text-althea-cta"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {t('allProducts')}
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Contact */}
          <Link
            href="/contact"
            aria-current={pathname === '/contact' ? 'page' : undefined}
            className={cn('text-sm font-medium transition-colors hover:text-althea-cta', pathname === '/contact' ? 'text-althea-cta' : 'text-foreground')}
          >
            {t('contact')}
          </Link>
        </div>

        <form onSubmit={handleSearch} role="search" aria-label={t('searchAriaLabel')} className="hidden md:flex items-center">
          <div className="relative" ref={desktopRef}>
            <label htmlFor="desktop-search" className="sr-only">{t('searchLabel')}</label>
            <input
              id="desktop-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              placeholder={t('searchPlaceholder')}
              role="combobox"
              aria-expanded={showSuggestions && suggestions.length > 0}
              aria-haspopup="listbox"
              aria-controls="desktop-suggestions"
              aria-activedescendant={activeIdx >= 0 ? `suggestion-${activeIdx}` : undefined}
              aria-autocomplete="list"
              className="h-9 w-52 rounded-full border border-border bg-muted pl-9 pr-3 text-sm text-foreground focus:border-althea-cta focus:outline-none focus:ring-2 focus:ring-althea-cta/20 lg:w-64"
              autoComplete="off"
            />
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            {showSuggestions && (
              <SuggestDropdown
                suggestions={suggestions}
                activeIdx={activeIdx}
                seeAllResultsLabel={t('seeAllResultsFor', { query: searchQuery.trim() })}
                listAriaLabel={t('suggestionsAriaLabel')}
                onSelect={selectSuggestion}
                onSeeAll={seeAllResults}
                onHover={setActiveIdx}
              />
            )}
          </div>
        </form>

        <div className="hidden items-center gap-3 md:flex">
          <BasculeTheme />
          <BasculeLangue />
          <Link href="/cart" aria-label={cartCount > 0 ? t('cartAriaWithCount', { count: cartCount }) : t('cartAria')} className="relative text-foreground transition-colors hover:text-althea-cta">
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {cartCount > 0 && (
              <span aria-hidden="true" className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-althea-cta text-[10px] font-bold leading-none text-white">
                {cartCount}
              </span>
            )}
          </Link>
          {isAuthenticated ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-foreground hover:bg-accent hover:text-althea-cta">
                  {isStaff ? t('backoffice') : t('myAccount')}
                </Button>
              </Link>
              <span className="text-sm text-muted-foreground">{user?.name}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-border text-foreground hover:bg-accent"
              >
                {t('logout')}
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="text-foreground hover:bg-accent hover:text-althea-cta">
                  {t('login')}
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="bg-althea-cta text-white hover:bg-althea-hover">
                  {t('register')}
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 md:hidden">
          <BasculeTheme />
          <BasculeLangue />
          <Link href="/cart" aria-label={cartCount > 0 ? t('cartAriaWithCount', { count: cartCount }) : t('cartAria')} className="relative text-foreground">
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {cartCount > 0 && (
              <span aria-hidden="true" className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-althea-cta text-[10px] font-bold leading-none text-white">
                {cartCount}
              </span>
            )}
          </Link>
          <button
            className="text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? t('closeMenu') : t('openMenu')}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div id="mobile-menu" role="navigation" aria-label={t('mobileMenu')} className="border-t border-althea-cta/15 nav-glass px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <div className="relative" ref={mobileRef}>
              <form onSubmit={handleSearch} role="search" aria-label={t('searchAriaLabel')}>
                <label htmlFor="mobile-search" className="sr-only">{t('searchLabel')}</label>
                <input
                  id="mobile-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  placeholder={t('searchPlaceholder')}
                  role="combobox"
                  aria-expanded={showSuggestions && suggestions.length > 0}
                  aria-haspopup="listbox"
                  aria-autocomplete="list"
                  className="h-10 w-full rounded-full border border-border bg-muted pl-10 pr-4 text-sm text-foreground focus:border-althea-cta focus:outline-none focus:ring-2 focus:ring-althea-cta/20"
                  autoComplete="off"
                />
                <button type="submit" aria-label={t('searchSubmit')} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-althea-cta">
                  <Search className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
              {showSuggestions && (
                <SuggestDropdown
                  suggestions={suggestions}
                  activeIdx={activeIdx}
                  seeAllResultsLabel={t('seeAllResultsFor', { query: searchQuery.trim() })}
                  listAriaLabel={t('suggestionsAriaLabel')}
                  onSelect={selectSuggestion}
                  onSeeAll={seeAllResults}
                  onHover={setActiveIdx}
                />
              )}
            </div>

            <hr className="border-border" />
            {/* Accueil */}
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              aria-current={pathname === '/' ? 'page' : undefined}
              className={cn('rounded-md px-3 py-2 text-sm font-medium transition-colors', pathname === '/' ? 'bg-althea-cta/20 text-althea-cta' : 'text-foreground hover:bg-accent')}
            >
              {t('home')}
            </Link>

            {/* Catalogue mobile */}
            <div>
              <button
                onClick={() => setMobileCatalogOpen((o) => !o)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <span className={pathname.startsWith('/products') ? 'text-althea-cta' : ''}>{t('products')}</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', mobileCatalogOpen ? 'rotate-180' : '')} />
              </button>
              {mobileCatalogOpen && (
                <div className="mt-1 ml-3 flex flex-col gap-1 border-l-2 border-althea-cta/20 pl-3">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/products?categoryId=${cat.id}` as any}
                      onClick={() => { setMobileMenuOpen(false); setMobileCatalogOpen(false); }}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:text-althea-cta hover:bg-accent transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5 text-althea-cta shrink-0" />
                      {cat.name}
                    </Link>
                  ))}
                  <Link
                    href="/products"
                    onClick={() => { setMobileMenuOpen(false); setMobileCatalogOpen(false); }}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-althea-cta hover:bg-accent transition-colors"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                    {t('allProducts')}
                  </Link>
                </div>
              )}
            </div>

            {/* Contact */}
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              aria-current={pathname === '/contact' ? 'page' : undefined}
              className={cn('rounded-md px-3 py-2 text-sm font-medium transition-colors', pathname === '/contact' ? 'bg-althea-cta/20 text-althea-cta' : 'text-foreground hover:bg-accent')}
            >
              {t('contact')}
            </Link>

            <hr className="my-2 border-border" />
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
                >
                  {isStaff ? t('backoffice') : t('myAccount')}
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-accent"
                >
                  {t('logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
                >
                  {t('login')}
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-althea-cta hover:bg-accent"
                >
                  {t('register')}
                </Link>
              </>
            )}

            <hr className="my-2 border-border" />
            <p className="px-3 text-xs font-semibold uppercase text-muted-foreground">{tFooterInfo('title')}</p>
            {[
              { href: '/legal/cgv', label: tFooterInfo('terms') },
              { href: '/legal/mentions-legales', label: tFooterInfo('legal') },
              { href: '/legal/confidentialite', label: tFooterInfo('privacy') },
              { href: '/contact', label: tFooterInfo('contact') },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href as any}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}

            <hr className="my-2 border-border" />
            <div className="flex items-center gap-3 px-3 py-1">
              {[
                { href: 'https://instagram.com', icon: Instagram, label: 'Instagram' },
                { href: 'https://facebook.com', icon: Facebook, label: 'Facebook' },
                { href: 'https://linkedin.com', icon: Linkedin, label: 'LinkedIn' },
                { href: 'https://youtube.com', icon: Youtube, label: 'YouTube' },
              ].map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-all hover:border-althea-cta/50 hover:text-althea-cta"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

// Backward-compatible English alias
export { BarreNavigation as Navbar };
