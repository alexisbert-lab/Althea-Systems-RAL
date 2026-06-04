export interface ProduitTraduisible {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  currency: string;
  stripePriceId: string | null;
  sku: string | null;
  stock: number;
  lowStockThreshold: number;
  active: boolean;
  featured: boolean;
  images: string[];
  documents: string[];
  specs: any;
  categoryId: string | null;
  position: number;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
  category?: any;
  orderItems?: any[];
  reviews?: any[];
  translations?: Array<{
    id: string;
    productId: string;
    locale: string;
    name: string;
    description: string | null;
  }>;
}

export interface CategorieTraduisible {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  position: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  translations?: Array<{
    id: string;
    categoryId: string;
    locale: string;
    name: string;
    description: string | null;
  }>;
}

export interface DiapositiveCarrouselTraduisible {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  link: string | null;
  position: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  translations?: Array<{
    id: string;
    slideId: string;
    locale: string;
    title: string;
    subtitle: string | null;
  }>;
}

function normaliserLocale(locale?: string): string {
  if (!locale) return '';
  return locale.toLowerCase().replace('_', '-').split('-')[0];
}

function trouverTraduction<T extends { locale: string }>(
  traductions: T[] | undefined,
  locale: string,
): T | undefined {
  if (!traductions?.length) return undefined;

  const localeNormalisee = normaliserLocale(locale);
  const exacte = traductions.find((t) => normaliserLocale(t.locale) === localeNormalisee);
  if (exacte) return exacte;

  if (localeNormalisee !== 'en') {
    return traductions.find((t) => normaliserLocale(t.locale) === 'en');
  }

  return undefined;
}

/** Applique les traductions à un produit selon la locale */
export function appliquerTraductionProduit(
  produit: ProduitTraduisible,
  locale: string = 'en'
): ProduitTraduisible {
  if (!produit.translations || produit.translations.length === 0) {
    return produit;
  }
  const traduction = trouverTraduction(produit.translations, locale);
  if (traduction) {
    return { ...produit, name: traduction.name, description: traduction.description };
  }
  return produit;
}

/** Applique les traductions à une catégorie selon la locale */
export function appliquerTraductionCategorie(
  categorie: CategorieTraduisible,
  locale: string = 'en'
): CategorieTraduisible {
  if (!categorie.translations || categorie.translations.length === 0) {
    return categorie;
  }
  const traduction = trouverTraduction(categorie.translations, locale);
  if (traduction) {
    return { ...categorie, name: traduction.name, description: traduction.description };
  }
  return categorie;
}

/** Applique les traductions à une diapositive de carrousel selon la locale */
export function appliquerTraductionDiapositive(
  diapositive: DiapositiveCarrouselTraduisible,
  locale: string = 'en'
): DiapositiveCarrouselTraduisible {
  if (!diapositive.translations || diapositive.translations.length === 0) {
    return diapositive;
  }
  const traduction = trouverTraduction(diapositive.translations, locale);
  if (traduction) {
    return { ...diapositive, title: traduction.title, subtitle: traduction.subtitle };
  }
  return diapositive;
}

/** Obtient la locale depuis les headers ou cookie de la requête */
export function obtenirLocaleDepuisRequete(req: any): string {
  const localeHeader = req.headers['x-locale'];
  const customLocale = Array.isArray(localeHeader) ? localeHeader[0] : localeHeader;
  const localeHeaderNormalisee = normaliserLocale(customLocale);
  if (localeHeaderNormalisee && ['fr', 'en', 'ar'].includes(localeHeaderNormalisee)) {
    return localeHeaderNormalisee;
  }

  const localeCookie = req.cookies?.NEXT_LOCALE;
  const localeCookieNormalisee = normaliserLocale(localeCookie);
  if (localeCookieNormalisee && ['fr', 'en', 'ar'].includes(localeCookieNormalisee)) {
    return localeCookieNormalisee;
  }
  const acceptLanguage = req.headers['accept-language'];
  if (acceptLanguage) {
    const locale = normaliserLocale(acceptLanguage.split(',')[0]);
    if (['fr', 'en', 'ar'].includes(locale)) {
      return locale;
    }
  }
  return 'en';
}
