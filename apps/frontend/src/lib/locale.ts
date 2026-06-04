import { cookies } from 'next/headers';

const LOCALE_COOKIE = 'NEXT_LOCALE';
const DEFAULT_LOCALE = 'en'; // Fallback vers l'anglais
const SUPPORTED_LOCALES = ['en', 'fr', 'ar'] as const;

export type Locale = typeof SUPPORTED_LOCALES[number];

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(LOCALE_COOKIE)?.value;

  if (locale && SUPPORTED_LOCALES.includes(locale as Locale)) {
    return locale as Locale;
  }

  return DEFAULT_LOCALE;
}

export function isValidLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale);
}
