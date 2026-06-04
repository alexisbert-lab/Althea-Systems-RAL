'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/client-api';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslations } from '@/lib/translations';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  active: boolean;
  featured: boolean;
  position: number;
  parentId: string | null;
  parent?: { id: string; name: string } | null;
  _count?: { products: number };
}

interface CategoryTranslation {
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

function SortableCategoryRow({
  category,
  index: _index,
  onToggleFeatured,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  category: Category;
  index: number;
  onToggleFeatured: (c: Category) => void;
  onToggleActive: (c: Category) => void;
  onEdit: (c: Category) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations('adminCategories');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`transition-colors hover:bg-accent/50 ${!category.active ? 'opacity-60' : ''}`}
    >
      {/* Drag handle */}
      <td className="px-2 py-3 text-center">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded p-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
          title={t('row.dragTitle')}
        >
          ⠿
        </button>
      </td>

      {/* Image */}
      <td className="px-4 py-3">
        <div className="h-10 w-10 overflow-hidden rounded-md bg-gray-100">
          {category.image ? (
            <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">—</div>
          )}
        </div>
      </td>

      {/* Name + slug */}
      <td className="px-4 py-3">
        <p className="font-medium text-althea-dark">{category.name}</p>
        <p className="text-xs text-muted-foreground">{category.slug}</p>
      </td>

      {/* Parent */}
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {category.parent?.name || <span className="text-xs italic">{t('row.root')}</span>}
      </td>

      {/* Product count */}
      <td className="px-4 py-3 text-center">
        <span className="rounded-full bg-althea-bg px-2.5 py-0.5 text-xs font-medium text-althea-dark">
          {category._count?.products ?? '—'}
        </span>
      </td>

      {/* Featured toggle */}
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onToggleFeatured(category)}
          title={category.featured ? t('row.featuredTitle') : t('row.notFeaturedTitle')}
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
            category.featured
              ? 'bg-althea-cta text-white hover:bg-althea-hover'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
          }`}
        >
          {category.featured ? t('row.featuredBtn') : '☆'}
        </button>
      </td>

      {/* Status toggle */}
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onToggleActive(category)}
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
            category.active
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {category.active ? t('row.active') : t('row.inactive')}
        </button>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="outline" onClick={() => onEdit(category)}>
            {t('row.editBtn')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-500 hover:bg-red-50 hover:text-red-700"
            onClick={() => onDelete(category.id)}
          >
            ✕
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminCategoriesPage() {
  const t = useTranslations('adminCategories');
  const { token } = useAuthentificationStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [retranslating, setRetranslating] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [translations, setTranslations] = useState<Record<string, { name: string; description: string }>>(
    emptyTranslations(),
  );
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    parentId: '',
    position: '0',
    active: true,
    featured: false,
  });

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Category[]>('/api/categories');
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      toast.error(t('toasts.loadError'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const resetForm = () => {
    setForm({ name: '', slug: '', description: '', image: '', parentId: '', position: '0', active: true, featured: false });
    setTranslations(emptyTranslations());
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleEdit = async (category: Category) => {
    setEditingCategory(category);
    setTranslations(emptyTranslations());
    setForm({
      name: category.name,
      slug: category.slug || '',
      description: category.description || '',
      image: category.image || '',
      parentId: category.parentId || '',
      position: String(category.position),
      active: category.active,
      featured: category.featured,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const currentTranslations = await api.get<CategoryTranslation[]>(
        `/api/categories/${category.id}/translations`,
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
      toast.error(t('toasts.translationsLoadError'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t('toasts.nameRequired'));
      return;
    }

    const payload: any = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description || undefined,
      image: form.image || undefined,
      parentId: form.parentId || undefined,
      position: parseInt(form.position) || 0,
      active: form.active,
      featured: form.featured,
    };

    try {
      let savedCategoryId = editingCategory?.id;
      if (editingCategory) {
        await api.put(`/api/categories/${editingCategory.id}`, payload, token!);
        toast.success(t('toasts.updated'));
      } else {
        const created = await api.post<{ id: string }>('/api/categories', payload, token!);
        savedCategoryId = created.id;
        toast.success(t('toasts.created'));
      }

      if (savedCategoryId) {
        await Promise.all(
          TRANSLATION_LOCALES.map(async (locale) => {
            const tr = translations[locale];
            if (!tr?.name.trim() && !tr?.description.trim()) return;
            await api.put(
              `/api/categories/${savedCategoryId}/translations/${locale}`,
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
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || t('toasts.error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('deleteConfirm'))) return;
    try {
      await api.delete(`/api/categories/${id}`, token!);
      toast.success(t('toasts.deleted'));
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || t('toasts.error'));
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      await api.put(`/api/categories/${category.id}`, { active: !category.active }, token!);
      toast.success(category.active ? t('toasts.deactivated') : t('toasts.activated'));
      loadCategories();
    } catch {
      toast.error(t('toasts.error'));
    }
  };

  const handleRetranslate = async () => {
    setRetranslating(true);
    try {
      await api.post('/api/categories/retranslate-all', {}, token!);
      toast.success('Retraduction lancée — patientez quelques secondes puis rechargez.');
    } catch {
      toast.error('Erreur lors du lancement de la retraduction.');
    } finally {
      setRetranslating(false);
    }
  };

  const handleToggleFeatured = async (category: Category) => {
    try {
      await api.put(`/api/categories/${category.id}`, { featured: !category.featured }, token!);
      toast.success(category.featured ? t('toasts.unfeatured') : t('toasts.featured'));
      loadCategories();
    } catch {
      toast.error(t('toasts.error'));
    }
  };

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sorted = [...categories].sort((a, b) => a.position - b.position);
    const oldIndex = sorted.findIndex((c) => c.id === active.id);
    const newIndex = sorted.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(sorted, oldIndex, newIndex);

    setCategories(reordered.map((c, i) => ({ ...c, position: i })));

    try {
      await api.put('/api/categories/reorder', { ids: reordered.map((c) => c.id) }, token!);
      toast.success(t('toasts.reordered'));
    } catch {
      toast.error(t('toasts.error'));
      loadCategories();
    }
  };

  const rootCategories = categories.filter((c) => !c.parentId);
  const sortedCategories = [...categories].sort((a, b) => a.position - b.position);

  const inputClass = 'w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-poppins text-2xl font-semibold text-althea-dark">{t('pageTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {categories.length} {categories.length > 1 ? t('countPlural') : t('countSingular')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRetranslate}
            disabled={retranslating}
          >
            {retranslating ? 'Traduction en cours...' : 'Re-traduire tout'}
          </Button>
          <Button
            onClick={() => { showForm ? resetForm() : setShowForm(true); }}
            className="bg-althea-cta hover:bg-althea-hover"
          >
            {showForm ? t('cancelBtn') : t('newBtn')}
          </Button>
        </div>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="mb-4 font-poppins text-lg font-semibold text-althea-dark">
            {editingCategory ? `${t('form.titleEdit')} ${editingCategory.name}` : t('form.titleNew')}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Name */}
              <div>
                <label className="mb-1 block text-sm font-medium">{t('form.name')}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                  placeholder={t('form.namePlaceholder')}
                  required
                />
              </div>

              {/* Slug SEO */}
              <div>
                <label className="mb-1 block text-sm font-medium">{t('form.slug')}</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className={inputClass}
                  placeholder={t('form.slugPlaceholder')}
                />
              </div>

              {/* Parent category */}
              <div>
                <label className="mb-1 block text-sm font-medium">{t('form.parentCategory')}</label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">{t('form.parentNone')}</option>
                  {rootCategories
                    .filter((c) => c.id !== editingCategory?.id)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>

              {/* Position */}
              <div>
                <label className="mb-1 block text-sm font-medium">{t('form.position')}</label>
                <input
                  type="number"
                  min="0"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  className={inputClass}
                />
              </div>

              {/* Image URL */}
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">{t('form.imageUrl')}</label>
                <input
                  type="url"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  className={inputClass}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Active + Featured toggles */}
              <div className="flex flex-col items-start justify-end gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="h-4 w-4 rounded border accent-althea-cta"
                  />
                  <span className="text-sm font-medium">{t('form.activeLabel')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="h-4 w-4 rounded border accent-althea-cta"
                  />
                  <span className="text-sm font-medium">{t('form.featuredLabel')}</span>
                </label>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-sm font-medium">{t('form.description')}</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className={inputClass}
                placeholder={t('form.descriptionPlaceholder')}
              />
            </div>

            <div className="rounded-lg border p-4">
              <h4 className="mb-3 text-sm font-semibold">{t('form.translationsTitle')}</h4>
              <div className="grid gap-4 md:grid-cols-2">
                {TRANSLATION_LOCALES.map((locale) => (
                  <div key={locale} className="space-y-2 rounded-md border p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {locale}
                    </p>
                    <div>
                      <label className="mb-1 block text-xs font-medium">{t('form.translatedName')}</label>
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
                        className={inputClass}
                        placeholder={locale === 'en' ? 'Category name in English' : 'اسم الفئة بالعربية'}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">{t('form.translatedDescription')}</label>
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
                        className={inputClass}
                        placeholder={locale === 'en' ? 'Description in English' : 'الوصف بالعربية'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="bg-althea-cta hover:bg-althea-hover">
                {editingCategory ? t('form.saveBtn') : t('form.createBtn')}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                {t('cancelBtn')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Categories Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-althea-cta border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-2 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">{t('table.order')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">{t('table.image')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">{t('table.name')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">{t('table.parent')}</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">{t('table.products')}</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">{t('table.home')}</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">{t('table.status')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">{t('table.actions')}</th>
              </tr>
            </thead>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortedCategories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <tbody className="divide-y">
                  {sortedCategories.map((category, index) => (
                    <SortableCategoryRow
                      key={category.id}
                      category={category}
                      index={index}
                      onToggleFeatured={handleToggleFeatured}
                      onToggleActive={handleToggleActive}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}

                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        {t('empty')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
        </div>
      )}
    </div>
  );
}
