import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formaterMonnaie(montant: number, devise = 'EUR', locale = 'fr-FR') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: devise,
  }).format(montant);
}

export function formaterDate(date: Date | string, locale = 'fr-FR') {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function tronquer(chaine: string, longueur: number) {
  return chaine.length > longueur ? `${chaine.substring(0, longueur)}...` : chaine;
}

// Backward-compatible English aliases
export const formatCurrency = formaterMonnaie;
export const formatDate = formaterDate;
