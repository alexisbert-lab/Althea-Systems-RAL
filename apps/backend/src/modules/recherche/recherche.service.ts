import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch } from 'meilisearch';
import { PrismaService } from '../../prisma/prisma.service';
import {
  appliquerTraductionCategorie,
  appliquerTraductionProduit,
} from '../../utils/traductions';

@Injectable()
export class RechercheService implements OnModuleInit {
  private meili: MeiliSearch;
  private readonly logger = new Logger(RechercheService.name);
  private meiliAvailable = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.meili = new MeiliSearch({
      host: this.configService.get('MEILISEARCH_HOST', 'http://localhost:7700'),
      apiKey: this.configService.get('MEILISEARCH_API_KEY', ''),
    });
  }

  async onModuleInit() {
    try {
      const health = await this.meili.health();
      this.logger.log(`Meilisearch status: ${health.status}`);
      this.meiliAvailable = true;

      // Configure the products index for faceted search
      await this.configureMeiliIndex();
      // Always do a clean sync on startup (deleteAll + addDocuments = no duplicates ever)
      const { synced } = await this.syncProducts();
      this.logger.log(`Startup sync: ${synced} products indexed in Meilisearch`);
    } catch {
      this.logger.warn('Meilisearch not available — faceted search will use PostgreSQL fallback');
    }
  }

  /**
   * Configure Meilisearch index with facets, filterable & sortable attributes
   */
  private async configureMeiliIndex() {
    try {
      const index = this.meili.index('products');

      await index.updateSettings({
        searchableAttributes: ['name', 'description', 'sku', 'specs'],
        filterableAttributes: ['categoryName', 'price', 'stock', 'active', 'featured'],
        sortableAttributes: ['price', 'createdAt', 'stock', 'position', 'name'],
        // Ranking rules: exactness first (spec), then words, then typo
        rankingRules: [
          'exactness',
          'words',
          'typo',
          'proximity',
          'attribute',
          'sort',
        ],
        // Typo tolerance: allow 1 typo for words > 4 chars, match begins
        typoTolerance: {
          enabled: true,
          minWordSizeForTypos: {
            oneTypo: 4,
            twoTypos: 8,
          },
        },
      });

      this.logger.log('Meilisearch products index configured');
    } catch (error) {
      this.logger.error('Failed to configure Meilisearch index', error);
    }
  }

  /**
   * Sync all products from PostgreSQL to Meilisearch
   */
  async syncProducts() {
    if (!this.meiliAvailable) return { synced: 0 };

    const products = await this.prisma.product.findMany({
      include: { category: { select: { name: true } } },
    });

    const documents = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description || '',
      price: p.price,
      comparePrice: p.comparePrice,
      sku: p.sku || '',
      stock: p.stock,
      active: p.active,
      featured: p.featured,
      images: p.images,
      specs: p.specs ? JSON.stringify(p.specs) : '',
      categoryId: p.categoryId,
      categoryName: p.category?.name || '',
      position: p.position,
      createdAt: p.createdAt.toISOString(),
    }));

    try {
      const index = this.meili.index('products');
      // Delete all first to guarantee a clean index (no stale duplicates)
      await index.deleteAllDocuments();
      await index.addDocuments(documents, { primaryKey: 'id' });
      this.logger.log(`Synced ${documents.length} products to Meilisearch`);
      return { synced: documents.length };
    } catch (error) {
      this.logger.error('Sync error:', error);
      return { synced: 0, error: 'Sync failed' };
    }
  }

  /**
   * Faceted search via Meilisearch with fallback to PostgreSQL
   */
  async searchProducts(params: {
    q?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    availableOnly?: boolean;
    featuredOnly?: boolean;
    onSale?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    locale?: string;
  }) {
    const {
      q = '',
      categoryId,
      minPrice,
      maxPrice,
      availableOnly,
      sortBy = 'position',
      sortOrder = 'asc',
      page = 1,
      limit = 20,
      locale = 'en',
    } = params;

    // Try Meilisearch first
    if (this.meiliAvailable && q && locale === 'fr') {
      return this.searchMeiliProducts(params);
    }

    // PostgreSQL fallback
    return this.searchPostgresProducts(params);
  }

  /**
   * Meilisearch faceted search
   */
  private async searchMeiliProducts(params: {
    q?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    availableOnly?: boolean;
    featuredOnly?: boolean;
    onSale?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    locale?: string;
  }) {
    const { q = '', categoryId, minPrice, maxPrice, availableOnly, featuredOnly, onSale, sortBy, sortOrder, page = 1, limit = 20 } = params;

    // Build filter array
    const filters: string[] = ['active = true'];
    if (categoryId) {
      // Get category name for filter
      const cat = await this.prisma.category.findUnique({ where: { id: categoryId }, select: { name: true } });
      if (cat) filters.push(`categoryName = "${cat.name}"`);
    }
    if (minPrice != null) filters.push(`price >= ${minPrice}`);
    if (maxPrice != null) filters.push(`price <= ${maxPrice}`);
    if (availableOnly) filters.push('stock > 0');
    if (featuredOnly) filters.push('featured = true');
    if (onSale) filters.push('comparePrice > 0');

    // Build sort
    const sort: string[] = [];
    if (sortBy === 'price') sort.push(`price:${sortOrder || 'asc'}`);
    else if (sortBy === 'createdAt' || sortBy === 'date') sort.push(`createdAt:${sortOrder || 'desc'}`);
    else if (sortBy === 'stock') sort.push(`stock:${sortOrder || 'desc'}`);
    else sort.push(`position:asc`);

    // Out-of-stock always last (secondary sort)
    if (sortBy !== 'stock') sort.push('stock:desc');

    try {
      const index = this.meili.index('products');
      const results = await index.search(q, {
        filter: filters.join(' AND '),
        sort,
        limit,
        offset: (page - 1) * limit,
        facets: ['categoryName'],
      });

      // Fall back to Postgres only when there are genuinely no results (not just an empty page)
      if ((results.estimatedTotalHits ?? 0) === 0) {
        return this.searchPostgresProducts(params);
      }

      const seenIds = new Set<string>();
      const uniqueHits = results.hits.filter((h: any) => h.id && !seenIds.has(h.id) && seenIds.add(h.id));

      return {
        data: uniqueHits,
        meta: {
          total: results.estimatedTotalHits || 0,
          page,
          limit,
          totalPages: Math.ceil((results.estimatedTotalHits || 0) / limit),
          processingTimeMs: results.processingTimeMs,
          provider: 'meilisearch',
        },
        facets: results.facetDistribution || {},
      };
    } catch (error) {
      this.logger.error('Meilisearch search error, falling back to PostgreSQL:', error);
      return this.searchPostgresProducts(params);
    }
  }

  /**
   * PostgreSQL fallback with similar filtering
   */
  private async searchPostgresProducts(params: {
    q?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    availableOnly?: boolean;
    featuredOnly?: boolean;
    onSale?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    locale?: string;
  }) {
    const {
      q,
      categoryId,
      minPrice,
      maxPrice,
      availableOnly,
      featuredOnly,
      onSale,
      sortBy = 'position',
      sortOrder = 'asc',
      page = 1,
      limit = 20,
      locale = 'en',
    } = params;

    const where: any = { active: true };
    if (categoryId) where.categoryId = categoryId;
    if (minPrice != null) where.price = { ...where.price, gte: minPrice };
    if (maxPrice != null) where.price = { ...where.price, lte: maxPrice };
    if (availableOnly) where.stock = { gt: 0 };
    if (featuredOnly) where.featured = true;
    if (onSale) where.comparePrice = { not: null, gt: 0 };
    if (q) {
      if (locale === 'fr') {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
        ];
      } else {
        where.OR = [
          { sku: { contains: q, mode: 'insensitive' } },
          {
            translations: {
              some: {
                locale,
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { description: { contains: q, mode: 'insensitive' } },
                ],
              },
            },
          },
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ];
      }
    }

    // Sort with out-of-stock last
    const orderBy: any[] = [];
    if (sortBy === 'price') orderBy.push({ price: sortOrder });
    else if (sortBy === 'createdAt' || sortBy === 'date') orderBy.push({ createdAt: sortOrder || 'desc' });
    else if (sortBy === 'stock') orderBy.push({ stock: sortOrder });
    else orderBy.push({ position: 'asc' });

    // Out-of-stock always last (secondary sort)
    if (sortBy !== 'stock') orderBy.push({ stock: 'desc' });

    const skip = (page - 1) * limit;

    const [products, total, categoryFacets] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          translations: true,
          category: {
            include: { translations: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
      // Category facet counts
      this.prisma.product.groupBy({
        by: ['categoryId'],
        where: { active: true },
        _count: true,
      }),
    ]);

    // Build facet distribution
    const catIds = categoryFacets.map((f) => f.categoryId).filter(Boolean) as string[];
    const cats = await this.prisma.category.findMany({
      where: { id: { in: catIds } },
      include: { translations: true },
    });
    const catMap = new Map(
      cats.map((c) => [c.id, appliquerTraductionCategorie(c as any, locale).name]),
    );
    const facetDist: Record<string, number> = {};
    categoryFacets.forEach((f) => {
      if (f.categoryId) {
        const name = catMap.get(f.categoryId) || 'Autre';
        facetDist[name] = f._count;
      }
    });

    const localizedProducts = products.map((product) => {
      const localizedProduct = appliquerTraductionProduit(product as any, locale);
      if (!localizedProduct.category) {
        return localizedProduct;
      }
      return {
        ...localizedProduct,
        category: appliquerTraductionCategorie(localizedProduct.category as any, locale),
      };
    });

    return {
      data: localizedProducts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        provider: 'postgresql',
      },
      facets: { categoryName: facetDist },
    };
  }

  /**
   * Update a single product document in Meilisearch after create/update
   */
  async updateProductInIndex(id: string) {
    if (!this.meiliAvailable) return;
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
        include: { category: { select: { name: true } } },
      });
      if (!product) return;
      const doc = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description || '',
        price: product.price,
        comparePrice: product.comparePrice,
        sku: product.sku || '',
        stock: product.stock,
        active: product.active,
        featured: product.featured,
        images: product.images,
        specs: product.specs ? JSON.stringify(product.specs) : '',
        categoryId: product.categoryId,
        categoryName: product.category?.name || '',
        position: product.position,
        createdAt: product.createdAt.toISOString(),
      };
      await this.meili.index('products').updateDocuments([doc]);
    } catch (error) {
      this.logger.error('Failed to update product in Meilisearch index:', error);
    }
  }

  /**
   * Remove a product document from Meilisearch after deletion
   */
  async removeProductFromIndex(id: string) {
    if (!this.meiliAvailable) return;
    try {
      await this.meili.index('products').deleteDocument(id);
    } catch (error) {
      this.logger.error('Failed to remove product from Meilisearch index:', error);
    }
  }

  /**
   * Autocomplete suggestions — lightweight, fast, max 6 results
   */
  async suggestProducts(
    q: string,
    limit = 6,
    locale = 'en',
  ): Promise<Array<{ name: string; slug: string; image: string | null; categoryName: string }>> {
    if (!q || q.length < 2) return [];

    if (this.meiliAvailable && locale === 'fr') {
      try {
        const results = await this.meili.index('products').search(q, {
          limit,
          filter: 'active = true AND stock > 0',
          attributesToRetrieve: ['name', 'slug', 'images', 'categoryName'],
        });
        const seen = new Set<string>();
        return (results.hits as any[])
          .filter((h) => h.slug && !seen.has(h.slug) && seen.add(h.slug))
          .map((h) => ({
            name: h.name,
            slug: h.slug,
            image: h.images?.[0] ?? null,
            categoryName: h.categoryName || '',
          }));
      } catch { /* fall through to postgres */ }
    }

    const products = await this.prisma.product.findMany({
      where: {
        active: true,
        stock: { gt: 0 },
        OR: [
          { sku: { contains: q, mode: 'insensitive' } },
          {
            translations: {
              some: {
                locale,
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { description: { contains: q, mode: 'insensitive' } },
                ],
              },
            },
          },
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: [{ position: 'asc' }],
      include: {
        translations: true,
        category: {
          include: { translations: true },
        },
      },
    });
    return products.map((p) => {
      const localizedProduct = appliquerTraductionProduit(p as any, locale);
      const localizedCategory = p.category
        ? appliquerTraductionCategorie(p.category as any, locale)
        : null;
      return {
        name: localizedProduct.name,
        slug: localizedProduct.slug,
        image: localizedProduct.images?.[0] ?? null,
        categoryName: localizedCategory?.name || '',
      };
    });
  }

  /**
   * Simple search (backward compatible)
   */
  async search(query: string, index = 'products') {
    return this.searchProducts({ q: query });
  }

  async indexDocument(indexName: string, documents: any[]) {
    if (!this.meiliAvailable) return { status: 'meilisearch_unavailable' };
    try {
      const index = this.meili.index(indexName);
      return await index.addDocuments(documents);
    } catch (error) {
      this.logger.error('Indexing error:', error);
      throw error;
    }
  }
}
