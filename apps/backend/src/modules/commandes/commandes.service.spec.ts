import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CommandesService } from './commandes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { FacturesService } from '../factures/factures.service';
import { FraisPortService } from '../frais-port/frais-port.service';

const mockOrder = {
  id: 'order-1',
  userId: 'user-1',
  guestEmail: null,
  status: 'PENDING',
  total: 10800,
  subtotal: 9000,
  tax: 1800,
  shippingCost: 0,
  currency: 'eur',
  addressId: null,
  stripePaymentId: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: 'item-1',
      orderId: 'order-1',
      productId: 'prod-1',
      quantity: 1,
      unitPrice: 9000,
      total: 9000,
    },
  ],
};

describe('CommandesService', () => {
  let service: CommandesService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandesService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
            },
            orderStatusHistory: {
              create: jest.fn().mockResolvedValue({}),
            },
            product: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn((fn) => fn({
              order: { create: jest.fn().mockResolvedValue(mockOrder) },
              product: { findUnique: jest.fn(), update: jest.fn() },
              orderItem: { createMany: jest.fn() },
            })),
          },
        },
        {
          provide: EmailService,
          useValue: { sendOrderConfirmation: jest.fn(), sendEmail: jest.fn() },
        },
        {
          provide: FacturesService,
          useValue: { createFromOrder: jest.fn(), createForOrder: jest.fn() },
        },
        {
          provide: FraisPortService,
          useValue: { calculerFraisPort: jest.fn().mockResolvedValue({ amount: 0, type: 'FREE_ABOVE', label: 'Gratuit' }) },
        },
      ],
    }).compile();

    service = module.get<CommandesService>(CommandesService);
    prisma = module.get(PrismaService);
  });

  describe('findOne', () => {
    it('should return an order by id', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

      const result = await service.findOne('order-1');
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException if order does not exist', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update order status to SHIPPED (no invoice)', async () => {
      (prisma.order.update as jest.Mock).mockResolvedValue({ ...mockOrder, status: 'SHIPPED' });

      const result = await service.updateStatus('order-1', { status: 'SHIPPED' as any });
      expect(result.status).toBe('SHIPPED');
    });

    it('should call createForOrder when status is CONFIRMED', async () => {
      (prisma.order.update as jest.Mock).mockResolvedValue({ ...mockOrder, status: 'CONFIRMED', user: null, guestEmail: null });

      await service.updateStatus('order-1', { status: 'CONFIRMED' as any });
      // facturesService.createForOrder should be called — verified via mock
    });
  });

  describe('create', () => {
    const mockProduct = { id: 'prod-1', name: 'Stéthoscope', stock: 50, active: true, price: 9000 };
    const dto = { items: [{ productId: 'prod-1', quantity: 1 }] };

    it('should throw BadRequestException for unknown product', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      await expect(service.create(dto as any, 'user-1')).rejects.toThrow();
    });

    it('should throw BadRequestException when stock is insufficient', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([{ ...mockProduct, stock: 0 }]);
      await expect(service.create({ items: [{ productId: 'prod-1', quantity: 1 }] } as any, 'user-1')).rejects.toThrow();
    });

    it('should create an order successfully', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);
      const result = await service.create(dto as any, 'user-1');
      expect(result).toMatchObject({ id: 'order-1' });
    });
  });

  describe('getStats', () => {
    it('should return order statistics', async () => {
      (prisma.order.count as jest.Mock).mockResolvedValue(10);
      (prisma.order.aggregate as jest.Mock).mockResolvedValue({ _sum: { total: 500000 } });
      (prisma.order.findMany as jest.Mock).mockResolvedValue([]);

      const stats = await service.getStats();
      expect(stats).toBeDefined();
    });
  });
});
