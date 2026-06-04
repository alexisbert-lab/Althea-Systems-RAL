import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreerCommandeDto, ModifierStatutCommandeDto } from './dto/commande.dto';
import { OrderStatus } from '@prisma/client';
import { FacturesService } from '../factures/factures.service';
import { FraisPortService } from '../frais-port/frais-port.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class CommandesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => FacturesService))
    private readonly facturesService: FacturesService,
    private readonly fraisPortService: FraisPortService,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreerCommandeDto, userId?: string) {
    // Fetch all products for the order
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Un ou plusieurs produits sont introuvables ou inactifs.');
    }

    // Check stock
    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId);
      if (product && product.stock < item.quantity) {
        throw new BadRequestException(`Stock insuffisant pour "${product.name}".`);
      }
    }

    // Calculate totals
    const orderItems = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        total: product.price * item.quantity,
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const tax = Math.round(subtotal * 0.2); // TVA 20%

    // Frais de port dynamiques (règles configurables en BDD)
    const shippingResult = await this.fraisPortService.calculerFraisPort(subtotal);
    if (shippingResult.type === 'CUSTOM') {
      throw new BadRequestException(
        `Livraison spéciale requise : ${shippingResult.message}. Veuillez nous contacter.`,
      );
    }
    const shippingCost = shippingResult.amount;

    const total = subtotal + tax + shippingCost;

    // Create order + items in a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await (tx.order.create as any)({
        data: {
          userId: userId || null,
          guestEmail: dto.guestEmail || null,
          status: 'PENDING',
          subtotal,
          tax,
          shippingCost,
          total,
          addressId: dto.addressId || null,
          billingAddressId: dto.billingAddressId || null,
          notes: dto.notes || null,
          items: { create: orderItems },
        },
        include: { items: { include: { product: true } } },
      });

      // Decrement stock
      for (const item of dto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return newOrder;
    });

    return order;
  }

  async findAll(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status as OrderStatus;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: { include: { product: { select: { id: true, name: true, slug: true, images: true } } } },
          invoice: { select: { id: true, invoiceNumber: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByUser(userId: string, page = 1, limit = 20, year?: number, status?: string, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = { userId };

    if (year) {
      where.createdAt = {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      };
    }
    if (status) {
      where.status = status as OrderStatus;
    }
    if (search) {
      where.items = {
        some: {
          product: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      };
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          items: { include: { product: { select: { id: true, name: true, slug: true, images: true, price: true } } } },
          invoice: { select: { id: true, invoiceNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const order = await (this.prisma.order.findUnique as any)({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        address: true,
        items: { include: { product: true } },
        invoice: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException('Commande non trouvée.');
    return order;
  }

  async updateStatus(id: string, dto: ModifierStatutCommandeDto) {
    const order = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status as OrderStatus },
      include: {
        items: { include: { product: true } },
        user: { select: { email: true } },
      },
    });

    // Log status change
    await (this.prisma as any).orderStatusHistory.create({
      data: { orderId: id, status: dto.status },
    });

    if (dto.status === 'CONFIRMED') {
      await this.facturesService.createForOrder(id);
      const recipientEmail = order.user?.email ?? order.guestEmail;
      if (recipientEmail) {
        this.emailService.sendOrderConfirmationEmail(recipientEmail, id, order.total, 'EUR').catch(() => {});
      }
    }

    return order;
  }

  async getStats() {
    const [total, pending, revenue] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.aggregate({ _sum: { total: true }, where: { status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } } }),
    ]);

    return {
      totalOrders: total,
      pendingOrders: pending,
      totalRevenue: revenue._sum.total || 0,
    };
  }
}
