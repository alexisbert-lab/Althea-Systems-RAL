import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TraductionService } from '../traduction/traduction.service';
import { CreerCategorieDto, ModifierCategorieDto } from './dto/categorie.dto';
import { appliquerTraductionCategorie } from '../../utils/traductions';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly traductionService: TraductionService,
  ) {}

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async create(dto: CreerCategorieDto & { slug?: string }) {
    const slug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.name);
    const { slug: _ignored, ...rest } = dto;
    const category = await this.prisma.category.create({
      data: { ...rest, slug },
      include: { children: true, parent: true },
    });
    this.traductionService.traduireCategorie(category.id, category.name, category.description).catch(() => {});
    return category;
  }

  private applyLocaleToCategoryTree(category: any, locale?: string): any {
    if (!locale || locale === 'fr') return category;

    const translated: any = appliquerTraductionCategorie(category, locale);
    if (!translated.children?.length) return translated;

    return {
      ...translated,
      children: translated.children.map((child: any) => this.applyLocaleToCategoryTree(child, locale)),
    };
  }

  async findAll(activeOnly = false, featuredOnly = false, locale?: string) {
    const where: any = {};
    if (activeOnly) where.active = true;
    if (featuredOnly) where.featured = true;
    const categories = await this.prisma.category.findMany({
      where,
      include: {
        translations: true,
        children: {
          where: activeOnly ? { active: true } : {},
          orderBy: { position: 'asc' },
          include: { translations: true },
        },
        _count: { select: { products: true } },
      },
      orderBy: { position: 'asc' },
    });
    return categories.map((category) => this.applyLocaleToCategoryTree(category, locale));
  }

  async findTree(locale?: string) {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null, active: true },
      include: {
        translations: true,
        children: {
          where: { active: true },
          orderBy: { position: 'asc' },
          include: {
            translations: true,
            children: {
              where: { active: true },
              orderBy: { position: 'asc' },
              include: { translations: true },
            },
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
      orderBy: { position: 'asc' },
    });
    return categories.map((category) => this.applyLocaleToCategoryTree(category, locale));
  }

  async findOne(id: string, locale?: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        translations: true,
        children: { orderBy: { position: 'asc' }, include: { translations: true } },
        parent: { include: { translations: true } },
        products: { where: { active: true }, take: 10, orderBy: { position: 'asc' } },
        _count: { select: { products: true } },
      },
    });
    if (!category) throw new NotFoundException('Catégorie non trouvée.');
    return this.applyLocaleToCategoryTree(category, locale);
  }

  async findBySlug(slug: string, locale?: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        translations: true,
        children: {
          where: { active: true },
          orderBy: { position: 'asc' },
          include: { translations: true },
        },
        products: { where: { active: true }, orderBy: { position: 'asc' } },
        _count: { select: { products: true } },
      },
    });
    if (!category) throw new NotFoundException('Catégorie non trouvée.');
    return this.applyLocaleToCategoryTree(category, locale);
  }

  async update(id: string, dto: ModifierCategorieDto & { slug?: string }) {
    const data: any = { ...dto };
    if (dto.slug) {
      data.slug = this.slugify(dto.slug);
    } else if (dto.name) {
      data.slug = this.slugify(dto.name);
    }
    const updated = await this.prisma.category.update({
      where: { id },
      data,
      include: { children: true, parent: true },
    });
    if (dto.name !== undefined || dto.description !== undefined) {
      this.traductionService.traduireCategorie(updated.id, updated.name, updated.description).catch(() => {});
    }
    return updated;
  }

  async remove(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }

  async reorder(orderedIds: string[]) {
    const updates = orderedIds.map((id, index) =>
      this.prisma.category.update({ where: { id }, data: { position: index } }),
    );
    await this.prisma.$transaction(updates);
    return { reordered: orderedIds.length };
  }

  async getTranslations(id: string) {
    await this.findOne(id);
    return this.prisma.categoryTranslation.findMany({
      where: { categoryId: id },
      orderBy: { locale: 'asc' },
    });
  }

  async upsertTranslation(
    id: string,
    locale: string,
    data: { name: string; description?: string },
  ) {
    await this.findOne(id);
    return this.prisma.categoryTranslation.upsert({
      where: {
        categoryId_locale: {
          categoryId: id,
          locale,
        },
      },
      update: {
        name: data.name,
        description: data.description ?? null,
      },
      create: {
        categoryId: id,
        locale,
        name: data.name,
        description: data.description ?? null,
      },
    });
  }

  async deleteTranslation(id: string, locale: string) {
    await this.findOne(id);
    return this.prisma.categoryTranslation.delete({
      where: {
        categoryId_locale: {
          categoryId: id,
          locale,
        },
      },
    });
  }

  async retranslateAll(): Promise<{ total: number; triggered: number }> {
    const categories = await this.prisma.category.findMany({
      select: { id: true, name: true, description: true },
    });
    for (const category of categories) {
      this.traductionService.traduireCategorie(category.id, category.name, category.description).catch(() => {});
    }
    return { total: categories.length, triggered: categories.length };
  }
}
