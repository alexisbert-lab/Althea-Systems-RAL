import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RechercheService } from '../recherche/recherche.service';
import { TraductionService } from '../traduction/traduction.service';
import { LigneImportValidee, ResultatImport } from './dto/import-produit.dto';
import {
  appliquerTraductionProduit,
  appliquerTraductionCategorie,
} from '../../utils/traductions';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ProduitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rechercheService: RechercheService,
    private readonly traductionService: TraductionService,
  ) {}

  async create(data: {
    name: string;
    slug?: string;
    description?: string;
    price: number;
    comparePrice?: number;
    sku?: string;
    stock?: number;
    lowStockThreshold?: number;
    categoryId?: string;
    images?: string[];
    documents?: string[];
    specs?: Record<string, string>;
    featured?: boolean;
  }) {
    const slug = data.slug
      ? data.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const { slug: _ignored, ...rest } = data;
    const product = await this.prisma.product.create({
      data: { ...rest, slug },
      include: { category: true },
    });
    // Traduction automatique fire-and-forget
    this.traductionService.traduireProduit(product.id, product.name, product.description).catch(() => {});
    return product;
  }

  private readonly includeWithTranslations = {
    category: { include: { translations: true } },
    translations: true,
  };

  private applyLocale(product: any, locale?: string) {
    if (!locale || locale === 'fr') return product;
    let result = appliquerTraductionProduit(product, locale);
    if (result.category) {
      result = { ...result, category: appliquerTraductionCategorie(result.category, locale) };
    }
    return result;
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    categoryId?: string;
    search?: string;
    active?: boolean;
    featured?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    minPrice?: number;
    maxPrice?: number;
    locale?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      categoryId,
      search,
      active,
      featured,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minPrice,
      maxPrice,
      locale,
    } = params;

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (active !== undefined) where.active = active;
    if (featured !== undefined) where.featured = featured;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: this.includeWithTranslations,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products.map((p) => this.applyLocale(p, locale)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { include: { translations: true } },
        translations: true,
        reviews: { include: { user: { select: { id: true, name: true } } } },
      },
    });
    if (!product) throw new NotFoundException('Produit non trouvé.');
    return product;
  }

  async findOneLocalized(id: string, locale?: string) {
    const product = await this.findOne(id);
    return this.applyLocale(product, locale);
  }

  async findBySlug(slug: string, locale?: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: { include: { translations: true } },
        translations: true,
        reviews: { include: { user: { select: { id: true, name: true } } } },
      },
    });
    if (!product) throw new NotFoundException('Produit non trouvé.');
    return this.applyLocale(product, locale);
  }

  async findSimilar(productId: string, limit = 6, locale?: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) return [];

    const similar = await this.prisma.product.findMany({
      where: {
        id: { not: productId },
        categoryId: product.categoryId,
        active: true,
      },
      take: limit,
      // available products first, then by position
      orderBy: [{ stock: 'desc' }, { position: 'asc' }],
      include: this.includeWithTranslations,
    });
    return similar.map((p) => this.applyLocale(p, locale));
  }

  async update(id: string, data: Partial<{
    name: string;
    slug: string;
    description: string;
    price: number;
    comparePrice: number;
    sku: string;
    stock: number;
    lowStockThreshold: number;
    categoryId: string;
    images: string[];
    documents: string[];
    specs: Record<string, string>;
    active: boolean;
    featured: boolean;
    position: number;
  }>) {
    const updateData: any = { ...data };
    if (data.slug) {
      updateData.slug = data.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    } else if (data.name) {
      updateData.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });
    // Keep Meilisearch index in sync (fire-and-forget)
    this.rechercheService.updateProductInIndex(id).catch(() => {});
    // Retraduire uniquement si name ou description a changé (hash check interne)
    if (data.name !== undefined || data.description !== undefined) {
      this.traductionService.traduireProduit(updated.id, updated.name, updated.description).catch(() => {});
    }
    return updated;
  }

  async remove(id: string) {
    // Remove from Meilisearch before deletion
    await this.rechercheService.removeProductFromIndex(id).catch(() => {});
    return this.prisma.product.delete({ where: { id } });
  }

  async getFeatured(limit = 8, locale?: string) {
    const featuredProducts = await this.prisma.product.findMany({
      where: { active: true, featured: true },
      take: limit,
      orderBy: { position: 'asc' },
      include: this.includeWithTranslations,
    });
    return featuredProducts.map((p) => this.applyLocale(p, locale));
  }

  async getTranslations(id: string) {
    await this.findOne(id);
    return this.prisma.productTranslation.findMany({
      where: { productId: id },
      orderBy: { locale: 'asc' },
    });
  }

  async upsertTranslation(
    id: string,
    locale: string,
    data: { name: string; description?: string },
  ) {
    await this.findOne(id);
    return this.prisma.productTranslation.upsert({
      where: {
        productId_locale: {
          productId: id,
          locale,
        },
      },
      update: {
        name: data.name,
        description: data.description ?? null,
      },
      create: {
        productId: id,
        locale,
        name: data.name,
        description: data.description ?? null,
      },
    });
  }

  async deleteTranslation(id: string, locale: string) {
    await this.findOne(id);
    return this.prisma.productTranslation.delete({
      where: {
        productId_locale: {
          productId: id,
          locale,
        },
      },
    });
  }

  async retranslateAll(): Promise<{ total: number; triggered: number }> {
    const products = await this.prisma.product.findMany({
      select: { id: true, name: true, description: true },
    });
    for (const product of products) {
      this.traductionService.traduireProduit(product.id, product.name, product.description).catch(() => {});
    }
    return { total: products.length, triggered: products.length };
  }

  async getStats() {
    const [total, active, outOfStock, lowStock] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { active: true } }),
      this.prisma.product.count({ where: { stock: 0 } }),
      this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count FROM products
        WHERE active = true AND stock > 0 AND stock <= "lowStockThreshold"
      `,
    ]);
    return { total, active, outOfStock, lowStock: Number(lowStock[0]?.count || 0) };
  }

  /* ────────────── Vérification de disponibilité ────────────── */

  async checkAvailability(items: { productId: string; quantity: number }[]) {
    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, stock: true, active: true, price: true },
    });

    return items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        return { productId: item.productId, available: false, reason: 'Produit introuvable', currentStock: 0 };
      }
      if (!product.active) {
        return { productId: item.productId, available: false, reason: 'Produit inactif', currentStock: product.stock };
      }
      if (product.stock < item.quantity) {
        return {
          productId: item.productId,
          available: false,
          reason: product.stock === 0 ? 'Rupture de stock' : `Stock insuffisant (${product.stock} disponible(s))`,
          currentStock: product.stock,
        };
      }
      return { productId: item.productId, available: true, currentStock: product.stock };
    });
  }

  /* ────────────── Export CSV / Excel ────────────── */

  async exportProducts(format: 'csv' | 'xlsx', ids?: string[]) {
    const where: any = {};
    if (ids && ids.length > 0) where.id = { in: ids };

    const products = await this.prisma.product.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Produits');

    worksheet.columns = [
      { header: 'Nom', key: 'name', width: 30 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Prix HT (€)', key: 'price', width: 12 },
      { header: 'Stock', key: 'stock', width: 10 },
      { header: 'Catégorie', key: 'category', width: 20 },
      { header: 'Actif', key: 'active', width: 8 },
      { header: 'Mis en avant', key: 'featured', width: 12 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Créé le', key: 'createdAt', width: 15 },
    ];

    for (const p of products) {
      worksheet.addRow({
        name: p.name,
        sku: p.sku || '',
        price: (p.price / 100).toFixed(2),
        stock: p.stock,
        category: p.category?.name || '',
        active: p.active ? 'Oui' : 'Non',
        featured: p.featured ? 'Oui' : 'Non',
        description: p.description || '',
        createdAt: new Date(p.createdAt).toLocaleDateString('fr-FR'),
      });
    }

    if (format === 'csv') {
      return workbook.csv.writeBuffer();
    }
    return workbook.xlsx.writeBuffer();
  }

  /* ────────────── Actions groupées (bulk) ────────────── */

  async bulkUpdateStatus(ids: string[], active: boolean) {
    const result = await this.prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { active },
    });
    for (const id of ids) {
      this.rechercheService.updateProductInIndex(id).catch(() => {});
    }
    return result.count;
  }

  async bulkUpdateCategory(ids: string[], categoryId: string) {
    const result = await this.prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { categoryId },
    });
    for (const id of ids) {
      this.rechercheService.updateProductInIndex(id).catch(() => {});
    }
    return result.count;
  }

  async bulkDelete(ids: string[]) {
    for (const id of ids) {
      await this.rechercheService.removeProductFromIndex(id).catch(() => {});
    }
    const result = await this.prisma.product.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  }

  /* ────────────── Import CSV / Excel ────────────── */

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async validerImport(buffer: Buffer, mimetype: string): Promise<LigneImportValidee[]> {
    const workbook = new ExcelJS.Workbook();

    if (mimetype.includes('csv') || mimetype.includes('octet-stream')) {
      await workbook.csv.read(require('stream').Readable.from(buffer), {
        parserOptions: { delimiter: undefined }, // auto-detect
      });
    } else {
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      return [];
    }

    const headerRow = worksheet.getRow(1);
    const headers: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      const val = String(cell.value || '').toLowerCase().trim();
      headers[val] = colNumber;
    });

    const nameCol = headers['name'] || headers['nom'] || headers['produit'];
    const priceCol = headers['price'] || headers['prix'];
    if (!nameCol || !priceCol) {
      return [{
        ligne: 0,
        name: '',
        price: 0,
        stock: 0,
        sku: '',
        categoryName: '',
        categoryId: null,
        description: '',
        images: [],
        erreurs: [`Colonnes requises manquantes. Attendu : "name" (ou "nom") et "price" (ou "prix"). Trouvé : ${Object.keys(headers).join(', ')}`],
      }];
    }

    const stockCol = headers['stock'] || headers['quantite'] || headers['qty'];
    const skuCol = headers['sku'] || headers['ref'] || headers['reference'];
    const categoryCol = headers['category'] || headers['categorie'] || headers['catégorie'];
    const descriptionCol = headers['description'];
    const imagesCol = headers['images'] || headers['image'];

    const existingSkus = new Set(
      (await this.prisma.product.findMany({ select: { sku: true }, where: { sku: { not: null } } }))
        .map((p) => p.sku),
    );
    const categories = await this.prisma.category.findMany({ select: { id: true, name: true } });
    const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

    const lignes: LigneImportValidee[] = [];
    const seenSkus = new Set<string>();

    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
      const row = worksheet.getRow(rowIndex);
      const erreurs: string[] = [];

      const name = String(row.getCell(nameCol).value || '').trim();
      const priceRaw = row.getCell(priceCol).value;
      const stockRaw = stockCol ? row.getCell(stockCol).value : 0;
      const sku = skuCol ? String(row.getCell(skuCol).value || '').trim() : '';
      const categoryName = categoryCol ? String(row.getCell(categoryCol).value || '').trim() : '';
      const description = descriptionCol ? String(row.getCell(descriptionCol).value || '').trim() : '';
      const imagesRaw = imagesCol ? String(row.getCell(imagesCol).value || '').trim() : '';

      if (!name && !priceRaw) continue;

      if (!name) erreurs.push('Nom requis');

      const price = parseFloat(String(priceRaw));
      if (isNaN(price) || price < 0) {
        erreurs.push(`Prix invalide : "${priceRaw}"`);
      }

      const stock = parseInt(String(stockRaw)) || 0;

      if (sku) {
        if (existingSkus.has(sku)) {
          erreurs.push(`SKU "${sku}" existe déjà en BDD`);
        }
        if (seenSkus.has(sku)) {
          erreurs.push(`SKU "${sku}" en doublon dans le fichier`);
        }
        seenSkus.add(sku);
      }

      let categoryId: string | null = null;
      if (categoryName) {
        categoryId = categoryMap.get(categoryName.toLowerCase()) || null;
        if (!categoryId) {
          erreurs.push(`Catégorie "${categoryName}" introuvable`);
        }
      }

      const images = imagesRaw ? imagesRaw.split(';').map((s) => s.trim()).filter(Boolean) : [];

      lignes.push({
        ligne: rowIndex,
        name,
        price: isNaN(price) ? 0 : price,
        stock,
        sku,
        categoryName,
        categoryId,
        description,
        images,
        erreurs,
      });
    }

    return lignes;
  }

  async executerImport(lignes: LigneImportValidee[]): Promise<ResultatImport> {
    const validLines = lignes.filter((l) => l.erreurs.length === 0);
    const failedLines = lignes.filter((l) => l.erreurs.length > 0);

    const produitsCreesIds: string[] = [];
    const erreurs: { ligne: number; erreurs: string[] }[] = failedLines.map((l) => ({
      ligne: l.ligne,
      erreurs: l.erreurs,
    }));

    await this.prisma.$transaction(async (tx) => {
      for (const ligne of validLines) {
        try {
          const slug = this.slugify(ligne.name);
          // Ensure unique slug
          const existing = await tx.product.findUnique({ where: { slug } });
          const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

          const product = await tx.product.create({
            data: {
              name: ligne.name,
              slug: finalSlug,
              price: Math.round(ligne.price * 100), // euros → centimes
              stock: ligne.stock,
              sku: ligne.sku || null,
              categoryId: ligne.categoryId || null,
              description: ligne.description || null,
              images: ligne.images,
              active: true,
            },
          });
          produitsCreesIds.push(product.id);
        } catch (e: any) {
          erreurs.push({
            ligne: ligne.ligne,
            erreurs: [e.message || 'Erreur inconnue'],
          });
        }
      }
    });

    // Fire-and-forget: index new products in Meilisearch
    for (const id of produitsCreesIds) {
      this.rechercheService.updateProductInIndex(id).catch(() => {});
    }

    return {
      totalLignes: lignes.length,
      succes: produitsCreesIds.length,
      echecs: erreurs.length,
      erreurs,
      produitsCreesIds,
    };
  }
}
