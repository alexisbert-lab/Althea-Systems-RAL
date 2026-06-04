import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHash } from 'crypto';

/** Locales cibles (tout sauf FR qui est la source) */
const TARGET_LOCALES = ['en', 'ar'] as const;
type TargetLocale = (typeof TARGET_LOCALES)[number];

/** Paires de langues MyMemory : source|cible */
const MYMEMORY_PAIR: Record<TargetLocale, string> = {
  en: 'fr|en',
  ar: 'fr|ar',
};

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

@Injectable()
export class TraductionService {
  private readonly logger = new Logger(TraductionService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ──────────────────────────────────────────────────────────

  private hash(...parts: (string | null | undefined)[]): string {
    return createHash('md5')
      .update(parts.filter(Boolean).join('|'))
      .digest('hex');
  }

  /**
   * Traduit un seul texte via MyMemory.
   * Sans email : 1 000 mots/jour.
   * Avec MYMEMORY_EMAIL dans .env : 10 000 mots/jour.
   */
  private async callMyMemory(text: string, langPair: string): Promise<string> {
    const params = new URLSearchParams({ q: text, langpair: langPair });
    const email = process.env.MYMEMORY_EMAIL;
    if (email) params.set('de', email);

    try {
      const res = await fetch(`${MYMEMORY_URL}?${params.toString()}`);

      if (!res.ok) {
        this.logger.error(`MyMemory HTTP ${res.status}`);
        return '';
      }

      const data = (await res.json()) as {
        responseStatus: number;
        responseData: { translatedText: string };
      };

      if (data.responseStatus !== 200) {
        this.logger.warn(`MyMemory status ${data.responseStatus} pour "${text.slice(0, 40)}..."`);
        return '';
      }

      return data.responseData.translatedText;
    } catch (err) {
      this.logger.error('MyMemory fetch error:', err);
      return '';
    }
  }

  /**
   * Traduit plusieurs textes séquentiellement (MyMemory = 1 texte par requête).
   * Renvoie les résultats dans le même ordre.
   */
  private async traduireTextes(textes: string[], langPair: string): Promise<string[]> {
    const resultats: string[] = [];
    for (const texte of textes) {
      resultats.push(await this.callMyMemory(texte, langPair));
    }
    return resultats;
  }

  // ─── Produit ──────────────────────────────────────────────────────────

  /**
   * Traduit name + description d'un produit vers toutes les locales cibles.
   * Idempotent : saute la locale si le sourceHash est identique.
   * Appeler en fire-and-forget après create/update.
   */
  async traduireProduit(
    productId: string,
    name: string,
    description?: string | null,
  ): Promise<void> {
    const sourceHash = this.hash(name, description);

    for (const locale of TARGET_LOCALES) {
      try {
        const existing = await this.prisma.productTranslation.findUnique({
          where: { productId_locale: { productId, locale } },
          select: { sourceHash: true },
        });

        if (existing?.sourceHash === sourceHash) {
          this.logger.debug(`Produit ${productId} [${locale}] : hash identique, skip.`);
          continue;
        }

        const textes = [name, description].filter((t): t is string => !!t);
        const traduits = await this.traduireTextes(textes, MYMEMORY_PAIR[locale]);

        if (!traduits[0]) continue;

        const translatedName = traduits[0];
        const translatedDescription = description ? (traduits[1] ?? null) : null;

        await this.prisma.productTranslation.upsert({
          where: { productId_locale: { productId, locale } },
          update: { name: translatedName, description: translatedDescription, sourceHash },
          create: { productId, locale, name: translatedName, description: translatedDescription, sourceHash },
        });

        this.logger.log(`✓ Produit ${productId} traduit → [${locale}]`);
      } catch (err) {
        this.logger.error(`Erreur traduction produit ${productId} [${locale}]:`, err);
      }
    }
  }

  // ─── Catégorie ────────────────────────────────────────────────────────

  async traduireCategorie(
    categoryId: string,
    name: string,
    description?: string | null,
  ): Promise<void> {
    const sourceHash = this.hash(name, description);

    for (const locale of TARGET_LOCALES) {
      try {
        const existing = await this.prisma.categoryTranslation.findUnique({
          where: { categoryId_locale: { categoryId, locale } },
          select: { sourceHash: true },
        });

        if (existing?.sourceHash === sourceHash) {
          this.logger.debug(`Catégorie ${categoryId} [${locale}] : hash identique, skip.`);
          continue;
        }

        const textes = [name, description].filter((t): t is string => !!t);
        const traduits = await this.traduireTextes(textes, MYMEMORY_PAIR[locale]);

        if (!traduits[0]) continue;

        const translatedName = traduits[0];
        const translatedDescription = description ? (traduits[1] ?? null) : null;

        await this.prisma.categoryTranslation.upsert({
          where: { categoryId_locale: { categoryId, locale } },
          update: { name: translatedName, description: translatedDescription, sourceHash },
          create: { categoryId, locale, name: translatedName, description: translatedDescription, sourceHash },
        });

        this.logger.log(`✓ Catégorie ${categoryId} traduite → [${locale}]`);
      } catch (err) {
        this.logger.error(`Erreur traduction catégorie ${categoryId} [${locale}]:`, err);
      }
    }
  }

  // ─── Diapositive carrousel ────────────────────────────────────────────

  async traduireDiapositive(
    slideId: string,
    title: string,
    subtitle?: string | null,
  ): Promise<void> {
    const sourceHash = this.hash(title, subtitle);

    for (const locale of TARGET_LOCALES) {
      try {
        const existing = await this.prisma.carouselSlideTranslation.findUnique({
          where: { slideId_locale: { slideId, locale } },
          select: { sourceHash: true },
        });

        if (existing?.sourceHash === sourceHash) {
          this.logger.debug(`Diapositive ${slideId} [${locale}] : hash identique, skip.`);
          continue;
        }

        const textes = [title, subtitle].filter((t): t is string => !!t);
        const traduits = await this.traduireTextes(textes, MYMEMORY_PAIR[locale]);

        if (!traduits[0]) continue;

        const translatedTitle = traduits[0];
        const translatedSubtitle = subtitle ? (traduits[1] ?? null) : null;

        await this.prisma.carouselSlideTranslation.upsert({
          where: { slideId_locale: { slideId, locale } },
          update: { title: translatedTitle, subtitle: translatedSubtitle, sourceHash },
          create: { slideId, locale, title: translatedTitle, subtitle: translatedSubtitle, sourceHash },
        });

        this.logger.log(`✓ Diapositive ${slideId} traduite → [${locale}]`);
      } catch (err) {
        this.logger.error(`Erreur traduction diapositive ${slideId} [${locale}]:`, err);
      }
    }
  }
}
