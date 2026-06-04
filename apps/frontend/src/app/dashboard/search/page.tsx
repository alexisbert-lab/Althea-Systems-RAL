'use client';

import { useState } from 'react';
import { useTranslations } from '@/lib/translations';
import { Button } from '@/components/ui/button';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function SearchPage() {
  const t = useTranslations('admin.search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/search?q=${encodeURIComponent(query)}`,
      );
      const data = await res.json();
      setResults(data.hits || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('title')}</h2>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={t('placeholder')}
          className="flex-1 rounded-md border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? t('searching') : t('search')}
        </Button>
      </div>

      <div className="space-y-3">
        {results.length === 0 && !loading && (
          <p className="text-muted-foreground">
            {t('noResults')}
          </p>
        )}
        {results.map((hit, i) => (
          <div key={i} className="rounded-lg border p-4">
            <h3 className="font-semibold">{hit.title || hit.name}</h3>
            <p className="text-sm text-muted-foreground">{hit.description || hit.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
