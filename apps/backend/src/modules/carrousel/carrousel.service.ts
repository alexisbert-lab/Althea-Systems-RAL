import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TraductionService } from '../traduction/traduction.service';
import { appliquerTraductionDiapositive } from '../../utils/traductions';

@Injectable()
export class CarrouselService {
  constructor(
    private prisma: PrismaService,
    private traductionService: TraductionService,
  ) {}

  private applyLocale(slide: any, locale?: string) {
    if (!locale || locale === 'fr') return slide;
    return appliquerTraductionDiapositive(slide, locale);
  }

  async findAll(activeOnly = false, locale?: string) {
    const slides = await this.prisma.carouselSlide.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { position: 'asc' },
      include: { translations: true },
    });
    return slides.map((slide) => this.applyLocale(slide, locale));
  }

  async findById(id: string, locale?: string) {
    const slide = await this.prisma.carouselSlide.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!slide) return null;
    return this.applyLocale(slide, locale);
  }

  async create(data: {
    title: string;
    subtitle?: string;
    image: string;
    link?: string;
    position?: number;
    active?: boolean;
  }) {
    const slide = await this.prisma.carouselSlide.create({ data });
    this.traductionService.traduireDiapositive(slide.id, slide.title, slide.subtitle).catch(() => {});
    return slide;
  }

  async update(
    id: string,
    data: {
      title?: string;
      subtitle?: string;
      image?: string;
      link?: string;
      position?: number;
      active?: boolean;
    },
  ) {
    const slide = await this.prisma.carouselSlide.update({ where: { id }, data });
    if (data.title !== undefined || data.subtitle !== undefined) {
      this.traductionService.traduireDiapositive(slide.id, slide.title, slide.subtitle).catch(() => {});
    }
    return slide;
  }

  async delete(id: string) {
    return this.prisma.carouselSlide.delete({ where: { id } });
  }

  async retranslateAll(): Promise<{ total: number; triggered: number }> {
    const slides = await this.prisma.carouselSlide.findMany({
      select: { id: true, title: true, subtitle: true },
    });
    for (const slide of slides) {
      this.traductionService.traduireDiapositive(slide.id, slide.title, slide.subtitle).catch(() => {});
    }
    return { total: slides.length, triggered: slides.length };
  }

  async getTranslations(id: string) {
    const slide = await this.prisma.carouselSlide.findUnique({ where: { id } });
    if (!slide) return [];
    return this.prisma.carouselSlideTranslation.findMany({
      where: { slideId: id },
      orderBy: { locale: 'asc' },
    });
  }

  async upsertTranslation(
    id: string,
    locale: string,
    data: { title: string; subtitle?: string },
  ) {
    await this.prisma.carouselSlide.findUniqueOrThrow({ where: { id } });
    return this.prisma.carouselSlideTranslation.upsert({
      where: {
        slideId_locale: {
          slideId: id,
          locale,
        },
      },
      update: {
        title: data.title,
        subtitle: data.subtitle ?? null,
      },
      create: {
        slideId: id,
        locale,
        title: data.title,
        subtitle: data.subtitle ?? null,
      },
    });
  }

  async deleteTranslation(id: string, locale: string) {
    await this.prisma.carouselSlide.findUniqueOrThrow({ where: { id } });
    return this.prisma.carouselSlideTranslation.delete({
      where: {
        slideId_locale: {
          slideId: id,
          locale,
        },
      },
    });
  }

  async reorder(orderedIds: string[]) {
    const updates = orderedIds.map((id, index) =>
      this.prisma.carouselSlide.update({ where: { id }, data: { position: index } }),
    );
    await this.prisma.$transaction(updates);
    return { reordered: orderedIds.length };
  }
}
