'use client';

import { useLocale } from '@/lib/translations';
import { useState } from 'react';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

export function BasculeLangue() {
  const locale = useLocale();
  const [isPending, setIsPending] = useState(false);

  const handleLanguageChange = async (newLocale: string) => {
    if (isPending || locale === newLocale) return;

    setIsPending(true);
    try {
      document.cookie = `NEXT_LOCALE=${encodeURIComponent(newLocale)}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax`;

      const response = await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale }),
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to persist locale');
      }

      window.location.reload();
    } catch (error) {
      console.error('Failed to change locale:', error);
    } finally {
      setIsPending(false);
    }
  };

  const currentLanguage = languages.find((lang) => lang.code === locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Langue : ${currentLanguage?.name ?? locale}. Changer de langue`} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-althea-cta focus:outline-none">
        <Globe className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline" aria-hidden="true">{currentLanguage?.flag}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            disabled={isPending || locale === lang.code}
            className="cursor-pointer"
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
            {locale === lang.code && <span className="ml-auto text-althea-cta">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
