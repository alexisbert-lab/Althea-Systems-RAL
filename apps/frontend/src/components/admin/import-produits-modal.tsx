'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/client-api';
import { formatCurrency } from '@/lib/utilitaires';
import { toast } from 'sonner';
import { Upload, X, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { useTranslations } from '@/lib/translations';

/* ---------- types ---------- */
interface LigneImport {
  ligne: number;
  name: string;
  price: number;
  stock: number;
  sku: string;
  categoryName: string;
  categoryId: string | null;
  description: string;
  images: string[];
  erreurs: string[];
}

interface ResultatImport {
  totalLignes: number;
  succes: number;
  echecs: number;
  erreurs: { ligne: number; erreurs: string[] }[];
  produitsCreesIds: string[];
}

interface ImportProduitsModalProps {
  onClose: () => void;
  onSuccess: () => void;
  token: string;
}

type Step = 'upload' | 'loading' | 'preview' | 'importing' | 'result';

export function ImportProduitsModal({ onClose, onSuccess, token }: ImportProduitsModalProps) {
  const t = useTranslations('importModal');
  const [step, setStep] = useState<Step>('upload');
  const [lignes, setLignes] = useState<LigneImport[]>([]);
  const [result, setResult] = useState<ResultatImport | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validCount = lignes.filter((l) => l.erreurs.length === 0).length;
  const errorCount = lignes.filter((l) => l.erreurs.length > 0).length;

  const handleFile = async (file: File) => {
    if (!file) return;

    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(file.type) && !['csv', 'xlsx', 'xls'].includes(ext || '')) {
      toast.error(t('toasts.formatError'));
      return;
    }

    setStep('loading');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await api.upload<LigneImport[]>('/api/products/import/preview', formData, token);
      setLignes(data);
      setStep('preview');
    } catch (err: any) {
      toast.error(err.message || t('toasts.analyzeError'));
      setStep('upload');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirmImport = async () => {
    const validLignes = lignes.filter((l) => l.erreurs.length === 0);
    if (validLignes.length === 0) {
      toast.error(t('toasts.noValidRows'));
      return;
    }

    setStep('importing');
    try {
      const res = await api.post<ResultatImport>('/api/products/import/confirm', { lignes: validLignes }, token);
      setResult(res);
      setStep('result');
      if (res.succes > 0) {
        toast.success(`${res.succes} ${res.succes > 1 ? t('toasts.importedPlural') : t('toasts.importedSingular')}`);
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || t('toasts.importError'));
      setStep('preview');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-xl border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-poppins text-lg font-semibold text-althea-dark">
            {t('title')}
          </h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 130px)' }}>
          {/* Step: Upload */}
          {step === 'upload' && (
            <div>
              <div
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
                  dragOver ? 'border-althea-cta bg-althea-bg/50' : 'border-gray-300'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <FileSpreadsheet className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-2 text-sm font-medium">
                  {t('upload.dragText')}
                </p>
                <p className="mb-4 text-xs text-muted-foreground">
                  {t('upload.clickText')}
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="mr-1 h-4 w-4" />
                  {t('upload.chooseBtn')}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>

              <div className="mt-6 rounded-lg border bg-muted/30 p-4">
                <h3 className="mb-2 text-sm font-medium">{t('upload.formatTitle')}</h3>
                <p className="text-xs text-muted-foreground">{t('upload.formatDesc1')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('upload.formatDesc2')}</p>
              </div>
            </div>
          )}

          {/* Step: Loading */}
          {(step === 'loading' || step === 'importing') && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-althea-cta border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                {step === 'loading' ? t('loading.analyzing') : t('loading.importing')}
              </p>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div>
              <div className="mb-4 flex gap-4">
                <div className="flex items-center gap-2 rounded-lg border bg-green-50 px-4 py-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-green-700">
                    {validCount} {validCount > 1 ? t('preview.validPlural') : t('preview.validSingular')}
                  </span>
                </div>
                {errorCount > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border bg-red-50 px-4 py-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium text-red-700">
                      {errorCount} {errorCount > 1 ? t('preview.errorPlural') : t('preview.errorSingular')}
                    </span>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left">{t('preview.table.line')}</th>
                      <th className="px-3 py-2 text-left">{t('preview.table.name')}</th>
                      <th className="px-3 py-2 text-left">{t('preview.table.price')}</th>
                      <th className="px-3 py-2 text-left">{t('preview.table.stock')}</th>
                      <th className="px-3 py-2 text-left">{t('preview.table.sku')}</th>
                      <th className="px-3 py-2 text-left">{t('preview.table.category')}</th>
                      <th className="px-3 py-2 text-left">{t('preview.table.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.slice(0, 100).map((l) => (
                      <tr
                        key={l.ligne}
                        className={`border-t ${l.erreurs.length > 0 ? 'bg-red-50' : 'hover:bg-muted/30'}`}
                      >
                        <td className="px-3 py-2 text-muted-foreground">{l.ligne}</td>
                        <td className="px-3 py-2 font-medium">{l.name || '—'}</td>
                        <td className="px-3 py-2">{formatCurrency(l.price)}</td>
                        <td className="px-3 py-2">{l.stock}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{l.sku || '—'}</td>
                        <td className="px-3 py-2">{l.categoryName || '—'}</td>
                        <td className="px-3 py-2">
                          {l.erreurs.length > 0 ? (
                            <span className="text-red-600" title={l.erreurs.join('\n')}>
                              {l.erreurs[0]}
                              {l.erreurs.length > 1 && ` (+${l.erreurs.length - 1})`}
                            </span>
                          ) : (
                            <span className="text-green-600">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {lignes.length > 100 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('preview.truncatedPrefix')} {lignes.length} {t('preview.truncatedSuffix')}
                </p>
              )}
            </div>
          )}

          {/* Step: Result */}
          {step === 'result' && result && (
            <div className="py-8 text-center">
              <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
              <h3 className="font-poppins text-xl font-semibold text-althea-dark">{t('result.title')}</h3>
              <div className="mt-4 flex justify-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{result.succes}</p>
                  <p className="text-xs text-muted-foreground">
                    {result.succes > 1 ? t('result.createdPlural') : t('result.createdSingular')}
                  </p>
                </div>
                {result.echecs > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{result.echecs}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.echecs > 1 ? t('result.failedPlural') : t('result.failedSingular')}
                    </p>
                  </div>
                )}
              </div>
              {result.erreurs.length > 0 && (
                <div className="mx-auto mt-4 max-w-md rounded-lg border bg-red-50 p-3 text-left text-xs text-red-700">
                  {result.erreurs.map((e, i) => (
                    <p key={i}>{t('result.linePrefix')} {e.ligne} : {e.erreurs.join(', ')}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t px-6 py-4">
          {step === 'upload' && (
            <Button variant="outline" onClick={onClose}>{t('footer.cancelBtn')}</Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => { setStep('upload'); setLignes([]); }}>
                {t('footer.changeFileBtn')}
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={validCount === 0}
                className="bg-althea-cta text-white hover:bg-althea-hover"
              >
                {t('footer.importBtnPrefix')} {validCount} {validCount > 1 ? t('footer.importBtnProductPlural') : t('footer.importBtnProductSingular')}
              </Button>
            </>
          )}
          {step === 'result' && (
            <Button onClick={onClose} className="bg-althea-cta text-white hover:bg-althea-hover">
              {t('footer.closeBtn')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
