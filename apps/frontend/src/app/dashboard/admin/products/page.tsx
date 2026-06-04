'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from '@/lib/translations';
import { api } from '@/lib/client-api';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utilitaires';
import { toast } from 'sonner';
import { ImportProduitsModal } from '@/components/admin/import-produits-modal';
import { Upload } from 'lucide-react';

/* ---------- types ---------- */
interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  sku: string | null;
  stock: number;
  lowStockThreshold: number;
  vatRate: number;
  active: boolean;
  featured: boolean;
  images: string[];
  documents: string[];
  specs: Record<string, string> | null;
  categoryId: string | null;
  position: number;
  createdAt: string;
  category?: { id: string; name: string } | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductTranslation {
  locale: string;
  name: string;
  description: string | null;
}

const TRANSLATION_LOCALES = ['en', 'ar'] as const;

function emptyTranslations() {
  return {
    en: { name: '', description: '' },
    ar: { name: '', description: '' },
  };
}

/* TVA rates per CDCF */
const TVA_RATES = [
  { label: '20%', value: 0.20 },
  { label: '10%', value: 0.10 },
  { label: '5.5%', value: 0.055 },
  { label: '0%', value: 0 },
];

/* ---------- page ---------- */
export default function AdminProductsPage() {
  const t = useTranslations('admin.products');
  const tCommon = useTranslations('common');
  const { token } = useAuthentificationStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'createdAt' | ''>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (col: 'name' | 'price' | 'stock' | 'createdAt') => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const sortedProducts = [...products].sort((a, b) => {
    if (!sortBy) return 0;
    let valA: string | number = a[sortBy] as string | number;
    let valB: string | number = b[sortBy] as string | number;
    if (sortBy === 'name') { valA = (valA as string).toLowerCase(); valB = (valB as string).toLowerCase(); }
    return sortDir === 'asc' ? (valA < valB ? -1 : valA > valB ? 1 : 0) : (valA > valB ? -1 : valA < valB ? 1 : 0);
  });

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Product form
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [translations, setTranslations] = useState<Record<string, { name: string; description: string }>>(
    emptyTranslations(),
  );
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    comparePrice: '',
    sku: '',
    stock: '0',
    lowStockThreshold: '5',
    categoryId: '',
    images: '',
    documents: '',
    featured: false,
    active: true,
    tvaRate: '0.20',
  });

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/products?page=${page}&limit=${pageSize}&active=all`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filterCategory) url += `&categoryId=${filterCategory}`;
      // Admin sees all products including inactive (draft)
      const data = await api.get<{ data: Product[]; meta: { totalPages: number; total: number } }>(
        url,
        token!,
      );
      setProducts(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
      setTotalCount(data.meta?.total || 0);
    } catch {
      toast.error(t('loadingError'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, filterCategory, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCategories = useCallback(async () => {
    try {
      const data = await api.get<Category[] | { data: Category[] }>('/api/categories');
      // Backend returns a raw array; handle both formats for safety
      setCategories(Array.isArray(data) ? data : data.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  /* ---------- form handlers ---------- */
  const resetForm = () => {
    setForm({
      name: '', slug: '', description: '', price: '', comparePrice: '', sku: '',
      stock: '0', lowStockThreshold: '5', categoryId: '', images: '', documents: '',
      featured: false, active: true, tvaRate: '0.20',
    });
    setTranslations(emptyTranslations());
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    setTranslations(emptyTranslations());
    setForm({
      name: product.name,
      slug: product.slug || '',
      description: product.description || '',
      price: (product.price / 100).toFixed(2),
      comparePrice: product.comparePrice ? (product.comparePrice / 100).toFixed(2) : '',
      sku: product.sku || '',
      stock: String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold || 5),
      categoryId: product.categoryId || '',
      images: (product.images || []).join('\n'),
      documents: (product.documents || []).join('\n'),
      featured: product.featured,
      active: product.active,
      tvaRate: String(product.vatRate ?? 0.20),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const currentTranslations = await api.get<ProductTranslation[]>(
        `/api/products/${product.id}/translations`,
        token!,
      );
      const nextTranslations = emptyTranslations();
      for (const tr of currentTranslations) {
        if (tr.locale in nextTranslations) {
          nextTranslations[tr.locale as keyof typeof nextTranslations] = {
            name: tr.name || '',
            description: tr.description || '',
          };
        }
      }
      setTranslations(nextTranslations);
    } catch {
      toast.error(t('translationsLoadError'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price) {
      toast.error(t('requiredError'));
      return;
    }

    const priceHT = Math.round(parseFloat(form.price) * 100);
    const payload: any = {
      name: form.name,
      slug: form.slug.trim() || undefined,
      description: form.description || undefined,
      price: priceHT,
      comparePrice: form.comparePrice ? Math.round(parseFloat(form.comparePrice) * 100) : undefined,
      sku: form.sku || undefined,
      stock: parseInt(form.stock) || 0,
      lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
      vatRate: parseFloat(form.tvaRate) || 0.20,
      categoryId: form.categoryId || undefined,
      images: form.images ? form.images.split('\n').map((s) => s.trim()).filter(Boolean) : [],
      documents: form.documents ? form.documents.split('\n').map((s) => s.trim()).filter(Boolean) : [],
      featured: form.featured,
      active: form.active,
    };

    try {
      let savedProductId = editingProduct?.id;
      if (editingProduct) {
        await api.put(`/api/products/${editingProduct.id}`, payload, token!);
        toast.success(t('updateSuccess'));
      } else {
        const created = await api.post<{ id: string }>('/api/products', payload, token!);
        savedProductId = created.id;
        toast.success(t('createSuccess'));
      }

      if (savedProductId) {
        await Promise.all(
          TRANSLATION_LOCALES.map(async (locale) => {
            const tr = translations[locale];
            if (!tr?.name.trim() && !tr?.description.trim()) return;
            await api.put(
              `/api/products/${savedProductId}/translations/${locale}`,
              {
                name: tr.name.trim() || form.name.trim(),
                description: tr.description.trim() || undefined,
              },
              token!,
            );
          }),
        );
      }

      resetForm();
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || tCommon('error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await api.delete(`/api/products/${id}`, token!);
      toast.success(t('deleteSuccess'));
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || tCommon('error'));
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await api.put(`/api/products/${product.id}`, { active: !product.active }, token!);
      toast.success(product.active ? t('inactive') : t('active'));
      loadProducts();
    } catch {
      toast.error(tCommon('error'));
    }
  };

  /* ---------- bulk actions ---------- */
  const toggleSelectAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const bulkAction = async (action: string) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);

    try {
      switch (action) {
        case 'delete':
          if (!confirm(t('confirmBulkDelete', { count: ids.length }))) return;
          await Promise.all(ids.map((id) => api.delete(`/api/products/${id}`, token!)));
          toast.success(t('deleteSuccess'));
          break;
        case 'publish':
          await Promise.all(ids.map((id) => api.put(`/api/products/${id}`, { active: true }, token!)));
          toast.success(t('updateSuccess'));
          break;
        case 'draft':
          await Promise.all(ids.map((id) => api.put(`/api/products/${id}`, { active: false }, token!)));
          toast.success(t('updateSuccess'));
          break;
      }
      setSelected(new Set());
      loadProducts();
    } catch {
      toast.error(t('deleteError'));
    }
  };

  /* ---------- CSV export via backend ---------- */
  const exportFile = async (format: 'csv' | 'xlsx') => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const idsParam = selected.size > 0 ? `&ids=${Array.from(selected).join(',')}` : '';
      const res = await fetch(`${apiBase}/api/products/export?format=${format}${idsParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `produits_althea_${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Export ${format.toUpperCase()}`);
    } catch {
      toast.error(t('exportError'));
    }
  };

  /* ---------- computed ---------- */
  const computeTTC = (priceHT: string, tvaRate: string) => {
    const ht = parseFloat(priceHT) || 0;
    const rate = parseFloat(tvaRate) || 0;
    return (ht * (1 + rate)).toFixed(2);
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
            {t('totalProducts', { count: totalCount })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="mr-1 h-4 w-4" />
            {t('importBtn')}
          </Button>
          <Button variant="outline" onClick={() => exportFile('csv')}>
            <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV
          </Button>
          <Button variant="outline" onClick={() => exportFile('xlsx')}>
            <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel
          </Button>
          <Button
            onClick={() => { showForm ? resetForm() : setShowForm(true); }}
            className="bg-althea-cta hover:bg-althea-hover"
          >
            {showForm ? tCommon('cancel') : '+ ' + t('addProduct')}
          </Button>
        </div>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="mb-4 font-poppins text-lg font-semibold text-althea-dark">
            {editingProduct ? `${t('editProduct')} : ${editingProduct.name}` : t('addProduct')}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Name */}
              <div>
                <label className="mb-1 block text-sm font-medium">{t('productName')} *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                  placeholder="Stéthoscope Littmann Classic III"
                  required
                />
              </div>

              {/* Slug SEO */}
              <div>
                <label className="mb-1 block text-sm font-medium">{t('slugField')}</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                  placeholder={`stethoscope-littmann-classic-iii ${t('slugPlaceholderHint')}`}
                />
              </div>

              {/* SKU */}
              <div>
                <label className="mb-1 block text-sm font-medium">{t('sku')}</label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                  placeholder="STETH-LITT-001"
                />
              </div>

              {/* Category */}
              <div>
                <label className="mb-1 block text-sm font-medium">{t('category')}</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                >
                  <option value="">{t('selectCategory')}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Prix HT */}
              <div>
                <label className="mb-1 block text-sm font-medium">{t('priceExclTax')} (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                  placeholder="89.90"
                  required
                />
              </div>

              {/* TVA */}
              <div>
                <label className="mb-1 block text-sm font-medium">{t('tvaRate')}</label>
                <select
                  value={form.tvaRate}
                  onChange={(e) => setForm({ ...form, tvaRate: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                >
                  {TVA_RATES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Prix TTC (computed) */}
              <div>
                <label className="mb-1 block text-sm font-medium">{t('priceInclTax')} (€)</label>
                <input
                  type="text"
                  readOnly
                  value={form.price ? `${computeTTC(form.price, form.tvaRate)} €` : '—'}
                  className="w-full rounded-md border bg-muted px-3 py-2 text-sm"
                />
              </div>

              {/* Prix comparé */}
              <div>
                <label className="mb-1 block text-sm font-medium">{t('comparePrice')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.comparePrice}
                  onChange={(e) => setForm({ ...form, comparePrice: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                  placeholder={t('comparePricePlaceholder')}
                />
              </div>

              {/* Stock */}
              <div>
                <label className="mb-1 block text-sm font-medium">{t('stock')}</label>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                />
              </div>

              {/* Seuil stock bas */}
              <div>
                <label className="mb-1 block text-sm font-medium">{t('lowStockThreshold')}</label>
                <input
                  type="number"
                  min="0"
                  value={form.lowStockThreshold}
                  onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                  placeholder="5"
                />
              </div>

              {/* Options */}
              <div className="flex items-end gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="h-4 w-4 rounded border accent-althea-cta"
                  />
                  <span className="text-sm">{t('active')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="h-4 w-4 rounded border accent-althea-cta"
                  />
                  <span className="text-sm">{t('featured')}</span>
                </label>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-sm font-medium">{t('description')}</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                placeholder={t('description')}
              />
            </div>

            <div className="rounded-lg border p-4">
              <h4 className="mb-3 text-sm font-semibold">{t('translations')}</h4>
              <div className="grid gap-4 md:grid-cols-2">
                {TRANSLATION_LOCALES.map((locale) => (
                  <div key={locale} className="space-y-2 rounded-md border p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {locale}
                    </p>
                    <div>
                      <label className="mb-1 block text-xs font-medium">{t('translationName')}</label>
                      <input
                        type="text"
                        value={translations[locale]?.name || ''}
                        onChange={(e) =>
                          setTranslations((prev) => ({
                            ...prev,
                            [locale]: {
                              ...(prev[locale] || { name: '', description: '' }),
                              name: e.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                        placeholder={locale === 'en' ? 'Product name in English' : 'اسم المنتج بالعربية'}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">{t('translationDescription')}</label>
                      <textarea
                        value={translations[locale]?.description || ''}
                        onChange={(e) =>
                          setTranslations((prev) => ({
                            ...prev,
                            [locale]: {
                              ...(prev[locale] || { name: '', description: '' }),
                              description: e.target.value,
                            },
                          }))
                        }
                        rows={2}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                        placeholder={locale === 'en' ? 'Description in English' : 'الوصف بالعربية'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Images */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t('images')}
              </label>
              <textarea
                value={form.images}
                onChange={(e) => setForm({ ...form, images: e.target.value })}
                rows={2}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
              />
            </div>

            {/* Documents */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t('documents')}
              </label>
              <textarea
                value={form.documents}
                onChange={(e) => setForm({ ...form, documents: e.target.value })}
                rows={2}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                placeholder="https://example.com/fiche-technique.pdf&#10;https://example.com/notice.pdf"
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="bg-althea-cta hover:bg-althea-hover">
                {editingProduct ? tCommon('save') : t('addProduct')}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                {tCommon('cancel')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('search')}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full max-w-sm rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
        >
          <option value="">{t('allCategories')}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
        >
          <option value="">{t('allStatuses')}</option>
          <option value="active">{t('activeOnly')}</option>
          <option value="draft">{t('inactiveOnly')}</option>
        </select>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-althea-cta/30 bg-althea-bg/50 px-4 py-3">
          <span className="text-sm font-medium text-althea-dark">
            {selected.size} {tCommon('selected')}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => bulkAction('publish')}>
              {t('activeOnly')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction('draft')}>
              {t('inactiveOnly')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-500 hover:bg-red-50 hover:text-red-700"
              onClick={() => bulkAction('delete')}
            >
              {t('deleteSelected')}
            </Button>
          </div>
          <button
            className="ml-auto text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setSelected(new Set())}
          >
            {tCommon('cancel')}
          </button>
        </div>
      )}

      {/* Product Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-althea-cta border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === products.length && products.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border accent-althea-cta"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">{t('tableColImage')}</th>
                {(['name', 'price', 'stock', 'createdAt'] as const).map(col => (
                  <th
                    key={col}
                    onClick={() => toggleSort(col)}
                    className={`px-3 py-3 text-xs font-semibold uppercase cursor-pointer select-none hover:text-althea-cta transition-colors ${col === 'name' ? 'text-left' : col === 'createdAt' ? 'text-center' : 'text-right'} ${sortBy === col ? 'text-althea-cta' : 'text-muted-foreground'}`}
                  >
                    {col === 'name' ? t('tableColProduct') : col === 'price' ? t('priceExclTax') : col === 'stock' ? t('stock') : t('createdAt')}
                    {sortBy === col && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                ))}
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">{t('category')}</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">{t('tableColVat')}</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">{t('priceInclTax')}</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">{t('tableColStatus')}</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(filterStatus
                ? sortedProducts.filter((p) =>
                    filterStatus === 'active' ? p.active : !p.active,
                  )
                : sortedProducts
              ).map((product) => {
                const ht = product.price / 100;
                const tva = ht * (product.vatRate ?? 0.20);
                const ttc = ht + tva;

                return (
                  <tr
                    key={product.id}
                    className={`transition-colors hover:bg-accent/50 ${
                      !product.active ? 'opacity-60' : ''
                    } ${selected.has(product.id) ? 'bg-althea-bg/30' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="h-4 w-4 rounded border accent-althea-cta"
                      />
                    </td>

                    {/* Image */}
                    <td className="px-3 py-3">
                      <div className="h-10 w-10 overflow-hidden rounded-md bg-gray-100">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                            —
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Product name & SKU */}
                    <td className="max-w-[200px] px-3 py-3">
                      <p className="truncate font-medium">{product.name}</p>
                      {product.sku && (
                        <p className="truncate text-xs text-muted-foreground">{product.sku}</p>
                      )}
                      {product.featured && (
                        <span className="mt-0.5 inline-block rounded bg-althea-bg px-1.5 py-0.5 text-[10px] font-semibold text-althea-cta">
                          {t('featuredBadge')}
                        </span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3 text-sm text-muted-foreground">
                      {product.category?.name || '—'}
                    </td>

                    {/* Prix HT */}
                    <td className="px-3 py-3 text-right font-medium">
                      {formatCurrency(ht)}
                    </td>

                    {/* TVA */}
                    <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                      {formatCurrency(tva)}
                      <br />
                      <span className="text-[10px]">20%</span>
                    </td>

                    {/* Prix TTC */}
                    <td className="px-3 py-3 text-right font-semibold text-althea-dark">
                      {formatCurrency(ttc)}
                    </td>

                    {/* Stock */}
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          product.stock === 0
                            ? 'bg-red-100 text-red-700'
                            : product.stock <= product.lowStockThreshold
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(product)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                          product.active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {product.active ? t('statusPublished') : t('statusDraft')}
                      </button>
                    </td>

                    {/* Date */}
                    <td className="px-3 py-3 text-center text-xs text-muted-foreground">
                      {new Date(product.createdAt).toLocaleDateString('fr-FR')}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(product)}>
                          {t('editBtn')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleDelete(product.id)}
                        >
                          ✕
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {products.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-muted-foreground">
                    {tCommon('noResults')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('rowsPerPage')}</span>
          {[10, 25, 50].map(size => (
            <button
              key={size}
              onClick={() => { setPageSize(size); setPage(1); }}
              className={`rounded px-2 py-1 text-xs font-medium border transition-colors ${pageSize === size ? 'bg-althea-cta text-white border-althea-cta' : 'bg-transparent border-muted-foreground/30 text-muted-foreground hover:border-althea-cta hover:text-althea-cta'}`}
            >
              {size}
            </button>
          ))}
        </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('page')} {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              ← {t('previous')}
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
            >
              {t('next')} →
            </Button>
          </div>
        </div>
      )}
      </div>
      {showImportModal && (
        <ImportProduitsModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => { setShowImportModal(false); loadProducts(); }}
          token={token!}
        />
      )}
    </div>
  );
}
