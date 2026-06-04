/** Utilitaires RTL — sens d'écriture selon la locale */

export const rtlLocales = ['ar', 'he'];

export function isRTL(locale: string): boolean {
  return rtlLocales.includes(locale);
}

export function getDirection(locale: string): 'ltr' | 'rtl' {
  return isRTL(locale) ? 'rtl' : 'ltr';
}
