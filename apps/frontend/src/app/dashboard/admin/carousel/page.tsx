'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from '@/lib/translations';
import { api } from '@/lib/client-api';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SimpleRichEditor } from '@/components/simple-rich-editor';
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

interface Slide {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  link: string | null;
  position: number;
  active: boolean;
}

const MAX_SLIDES = 3;

function SortableSlide({
  slide,
  index,
  t,
  tCommon,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  slide: Slide;
  index: number;
  t: (key: string) => string;
  tCommon: (key: string) => string;
  onToggleActive: (slide: Slide) => void;
  onEdit: (slide: Slide) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
        slide.active ? 'bg-card' : 'bg-muted/50 opacity-60'
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
        title={t('move')}
      >
        ⠿
      </button>

      {/* Preview */}
      <div className="h-20 w-32 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
        {slide.image && (
          <img src={slide.image} alt={slide.title} className="h-full w-full object-cover" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-althea-bg text-xs font-bold text-althea-dark">
            {index + 1}
          </span>
          <h4 className="font-semibold text-althea-dark">{slide.title}</h4>
          {!slide.active && (
            <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">{t('inactive')}</span>
          )}
        </div>
        {slide.subtitle && <p className="text-sm text-muted-foreground">{slide.subtitle}</p>}
        {slide.link && <p className="text-xs text-althea-cta">{slide.link}</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onToggleActive(slide)}>
          {slide.active ? t('active') : t('active')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEdit(slide)}>
          {tCommon('edit')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-red-500 hover:bg-red-50 hover:text-red-700"
          onClick={() => onDelete(slide.id)}
        >
          {tCommon('delete')}
        </Button>
      </div>
    </div>
  );
}

export default function AdminCarouselPage() {
  const t = useTranslations('admin.carousel');
  const tCommon = useTranslations('common');
  const { token } = useAuthentificationStore();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [retranslating, setRetranslating] = useState(false);
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    image: '',
    link: '',
    position: 0,
    active: true,
  });

  useEffect(() => {
    loadSlides();
  }, []);

  const loadSlides = async () => {
    try {
      const data = await api.get<Slide[]>('/api/carousel-slides', token!);
      setSlides(Array.isArray(data) ? data : []);
    } catch {
      toast.error(t('loadingError'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ title: '', subtitle: '', image: '', link: '', position: 0, active: true });
    setEditingSlide(null);
    setShowForm(false);
  };

  const handleRetranslate = async () => {
    setRetranslating(true);
    try {
      await api.post('/api/carousel-slides/retranslate-all', {}, token!);
      toast.success('Retraduction lancée — patientez quelques secondes puis rechargez.');
    } catch {
      toast.error('Erreur lors du lancement de la retraduction.');
    } finally {
      setRetranslating(false);
    }
  };

  const handleEdit = (slide: Slide) => {
    setEditingSlide(slide);
    setForm({
      title: slide.title,
      subtitle: slide.subtitle || '',
      image: slide.image,
      link: slide.link || '',
      position: slide.position,
      active: slide.active,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.image) {
      toast.error(t('fieldsRequired'));
      return;
    }

    try {
      const payload = {
        title: form.title,
        subtitle: form.subtitle || null,
        image: form.image,
        link: form.link || null,
        position: form.position,
        active: form.active,
      };

      if (editingSlide) {
        await api.put(`/api/carousel-slides/${editingSlide.id}`, payload, token!);
        toast.success(t('updateSuccess'));
      } else {
        if (slides.length >= MAX_SLIDES) {
          toast.error(t('maxSlidesError', { count: String(MAX_SLIDES) }));
          return;
        }
        await api.post('/api/carousel-slides', payload, token!);
        toast.success(t('createSuccess'));
      }
      resetForm();
      loadSlides();
    } catch {
      toast.error(tCommon('error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await api.delete(`/api/carousel-slides/${id}`, token!);
      toast.success(t('deleteSuccess'));
      loadSlides();
    } catch {
      toast.error(tCommon('error'));
    }
  };

  const handleToggleActive = async (slide: Slide) => {
    try {
      await api.put(`/api/carousel-slides/${slide.id}`, { active: !slide.active }, token!);
      toast.success(t('updateSuccess'));
      loadSlides();
    } catch {
      toast.error(tCommon('error'));
    }
  };

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sorted = [...slides].sort((a, b) => a.position - b.position);
    const oldIndex = sorted.findIndex((s) => s.id === active.id);
    const newIndex = sorted.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sorted, oldIndex, newIndex);

    // Optimistic update
    setSlides(reordered.map((s, i) => ({ ...s, position: i })));

    try {
      await api.put('/api/carousel-slides/reorder', { ids: reordered.map((s) => s.id) }, token!);
      toast.success(t('reorderSuccess'));
    } catch {
      toast.error(tCommon('error'));
      loadSlides();
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-althea-cta border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-poppins text-2xl font-semibold text-althea-dark">
            {t('title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('totalSlides', { count: MAX_SLIDES })}
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
          {slides.length < MAX_SLIDES && !showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-althea-cta hover:bg-althea-hover"
            >
              + {t('addSlide')}
            </Button>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="mb-4 font-poppins text-lg font-semibold text-althea-dark">
            {editingSlide ? t('editSlide') : t('addSlide')}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">{t('title_field')} *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                  placeholder={t('titlePlaceholder')}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t('subtitle')}</label>
                <SimpleRichEditor
                  value={form.subtitle}
                  onChange={(html) => setForm({ ...form, subtitle: html })}
                  placeholder={t('subtitlePlaceholder')}
                  minHeight={72}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('image')} *</label>
              <input
                type="url"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                placeholder="https://..."
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">{t('link')}</label>
                <input
                  type="text"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                  placeholder="/products?category=diagnostic"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t('position')}</label>
                <input
                  type="number"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-althea-cta"
                  min={0}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="h-4 w-4 rounded border accent-althea-cta"
                  />
                  <span className="text-sm">{t('active')}</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="bg-althea-cta hover:bg-althea-hover">
                {editingSlide ? tCommon('save') : tCommon('save')}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                {tCommon('cancel')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Slides list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={[...slides].sort((a, b) => a.position - b.position).map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {[...slides].sort((a, b) => a.position - b.position).map((slide, index) => (
              <SortableSlide
                key={slide.id}
                slide={slide}
                index={index}
                t={t}
                tCommon={tCommon}
                onToggleActive={handleToggleActive}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {slides.length === 0 && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">{tCommon('noResults')}</p>
          <Button
            onClick={() => setShowForm(true)}
            className="mt-4 bg-althea-cta hover:bg-althea-hover"
          >
            {t('addSlide')}
          </Button>
        </div>
      )}
    </div>
  );
}
