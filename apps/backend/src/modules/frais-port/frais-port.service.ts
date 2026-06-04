import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreerRegleLivraisonDto, ModifierRegleLivraisonDto } from './dto/regle-livraison.dto';

export interface ResultatCalculFraisPort {
  amount: number;
  type: string;
  label: string;
  message?: string;
}

@Injectable()
export class FraisPortService {
  constructor(private readonly prisma: PrismaService) {}

  async trouverTous() {
    return this.prisma.shippingRule.findMany({
      orderBy: { priority: 'asc' },
    });
  }

  async trouverParId(id: string) {
    const rule = await this.prisma.shippingRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Règle de livraison introuvable.');
    return rule;
  }

  async creer(dto: CreerRegleLivraisonDto) {
    return this.prisma.shippingRule.create({ data: dto });
  }

  async modifier(id: string, dto: ModifierRegleLivraisonDto) {
    await this.trouverParId(id);
    return this.prisma.shippingRule.update({
      where: { id },
      data: dto,
    });
  }

  async supprimer(id: string) {
    await this.trouverParId(id);
    return this.prisma.shippingRule.delete({ where: { id } });
  }

  async calculerFraisPort(subtotalCents: number): Promise<ResultatCalculFraisPort> {
    const rules = await this.prisma.shippingRule.findMany({
      where: { active: true },
      orderBy: { priority: 'asc' },
    });

    for (const rule of rules) {
      if (rule.minSubtotal !== null && subtotalCents < rule.minSubtotal) continue;
      if (rule.maxSubtotal !== null && subtotalCents > rule.maxSubtotal) continue;

      switch (rule.type) {
        case 'FREE_ABOVE':
          return { amount: 0, type: 'FREE_ABOVE', label: rule.label };
        case 'FLAT':
          return { amount: rule.amount, type: 'FLAT', label: rule.label };
        case 'CUSTOM':
          return { amount: 0, type: 'CUSTOM', label: rule.label, message: rule.message || '' };
      }
    }

    // Fallback si aucune règle ne correspond
    return { amount: 499, type: 'FLAT', label: 'Livraison standard' };
  }
}
