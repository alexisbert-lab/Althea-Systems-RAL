import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TARGET_LOCALES = ['en', 'ar'] as const;

function normalizeLocale(locale: string): string {
  return locale.toLowerCase().replace('_', '-').split('-')[0];
}

type EntityKind = 'products' | 'categories' | 'carouselSlides';

type TranslationRow = {
  locale: string;
};

type MissingEntry = {
  id: string;
  name: string;
  missing: string[];
};

function getMissingLocales(translations: TranslationRow[]): string[] {
  const available = new Set(translations.map((translation) => normalizeLocale(translation.locale)));
  return TARGET_LOCALES.filter((locale) => !available.has(locale));
}

async function checkProducts(fillPlaceholders: boolean): Promise<MissingEntry[]> {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      translations: {
        select: {
          locale: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  const missing = products
    .map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      missing: getMissingLocales(product.translations),
    }))
    .filter((product) => product.missing.length > 0);

  if (fillPlaceholders && missing.length > 0) {
    const rows = missing.flatMap((product) =>
      product.missing.map((locale) => ({
        productId: product.id,
        locale,
        name: product.name,
        description: product.description,
      })),
    );

    await prisma.productTranslation.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }

  return missing.map(({ id, name, missing: locales }) => ({ id, name, missing: locales }));
}

async function checkCategories(fillPlaceholders: boolean): Promise<MissingEntry[]> {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      translations: {
        select: {
          locale: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  const missing = categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      missing: getMissingLocales(category.translations),
    }))
    .filter((category) => category.missing.length > 0);

  if (fillPlaceholders && missing.length > 0) {
    const rows = missing.flatMap((category) =>
      category.missing.map((locale) => ({
        categoryId: category.id,
        locale,
        name: category.name,
        description: category.description,
      })),
    );

    await prisma.categoryTranslation.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }

  return missing.map(({ id, name, missing: locales }) => ({ id, name, missing: locales }));
}

async function checkCarouselSlides(fillPlaceholders: boolean): Promise<MissingEntry[]> {
  const slides = await prisma.carouselSlide.findMany({
    select: {
      id: true,
      title: true,
      subtitle: true,
      translations: {
        select: {
          locale: true,
        },
      },
    },
    orderBy: {
      position: 'asc',
    },
  });

  const missing = slides
    .map((slide) => ({
      id: slide.id,
      name: slide.title,
      subtitle: slide.subtitle,
      missing: getMissingLocales(slide.translations),
    }))
    .filter((slide) => slide.missing.length > 0);

  if (fillPlaceholders && missing.length > 0) {
    const rows = missing.flatMap((slide) =>
      slide.missing.map((locale) => ({
        slideId: slide.id,
        locale,
        title: slide.name,
        subtitle: slide.subtitle,
      })),
    );

    await prisma.carouselSlideTranslation.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }

  return missing.map(({ id, name, missing: locales }) => ({ id, name, missing: locales }));
}

function printSection(title: string, rows: MissingEntry[]) {
  console.log(`\n${title}: ${rows.length} missing item(s)`);
  rows.slice(0, 20).forEach((row) => {
    console.log(`- ${row.id} | ${row.name} | missing: ${row.missing.join(', ')}`);
  });
  if (rows.length > 20) {
    console.log(`... and ${rows.length - 20} more`);
  }
}

async function run() {
  const fillPlaceholders = process.argv.includes('--fill-placeholders');

  const [productsMissing, categoriesMissing, slidesMissing] = await Promise.all([
    checkProducts(fillPlaceholders),
    checkCategories(fillPlaceholders),
    checkCarouselSlides(fillPlaceholders),
  ]);

  printSection('Products', productsMissing);
  printSection('Categories', categoriesMissing);
  printSection('Carousel slides', slidesMissing);

  const summary = {
    generatedAt: new Date().toISOString(),
    fillPlaceholders,
    totals: {
      products: productsMissing.length,
      categories: categoriesMissing.length,
      carouselSlides: slidesMissing.length,
    },
    products: productsMissing,
    categories: categoriesMissing,
    carouselSlides: slidesMissing,
  };

  console.log('\nSummary JSON:');
  console.log(JSON.stringify(summary, null, 2));
}

run()
  .catch((error) => {
    console.error('[i18n-check] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
