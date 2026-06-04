import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreerAvisDto } from './dto/avis.dto';

@Injectable()
export class AvisService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreerAvisDto) {
    // Check for existing review
    const existing = await this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId: dto.productId } },
    });
    if (existing) throw new ConflictException('Vous avez déjà noté ce produit.');

    return this.prisma.review.create({
      data: { userId, productId: dto.productId, rating: dto.rating, comment: dto.comment },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async findByProduct(productId: string) {
    return this.prisma.review.findMany({
      where: { productId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProductRating(productId: string) {
    const result = await this.prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: true,
    });
    return { average: result._avg.rating || 0, count: result._count };
  }

  async remove(id: string, userId: string) {
    const review = await this.prisma.review.findFirst({ where: { id, userId } });
    if (!review) throw new NotFoundException('Avis non trouvé.');
    return this.prisma.review.delete({ where: { id } });
  }
}
