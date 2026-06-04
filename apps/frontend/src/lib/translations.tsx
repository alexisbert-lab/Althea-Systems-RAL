'use client';

import { createContext, useContext } from 'react';

type Messages = Record<string, any>;

interface TranslationContextType {
  locale: string;
  messages: Messages;
}

const TranslationContext = createContext<TranslationContextType>({ locale: 'en', messages: {} });

/** Provider à placer dans layout.tsx */
export function TranslationProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: Messages;
  children: React.ReactNode;
}) {
  return (
    <TranslationContext.Provider value={{ locale, messages }}>
      {children}
    </TranslationContext.Provider>
  );
}

/** Résout un chemin en profondeur : "sort.default" → obj.sort.default */
function resolve(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

/**
 * useTranslations('namespace') → t('key') ou t('nested.key', { param: value })
 */
export function useTranslations(namespace: string) {
  const { messages } = useContext(TranslationContext);
  const ns = resolve(messages, namespace);

  return function t(key: string, params?: Record<string, string | number>): string {
    let value = resolve(ns, key);
    if (value === undefined || value === null) return key;
    if (typeof value !== 'string') return key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = (value as string).replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return value as string;
  };
}

/** useLocale() → 'fr' | 'en' | 'ar' */
export function useLocale(): string {
  return useContext(TranslationContext).locale;
}
