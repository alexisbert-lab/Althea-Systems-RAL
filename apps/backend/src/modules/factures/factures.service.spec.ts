import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FacturesService } from './factures.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';

const mockOrder = {
  id: 'order-1',
  userId: 'user-1',
  guestEmail: null,
  status: 'CONFIRMED',
  total: 10800,
  subtotal: 9000,
  tax: 1800,
  shippingCost: 0,
  currency: 'eur',
  user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
  items: [
    {
      id: 'item-1',
      productId: 'prod-1',
      quantity: 1,
      unitPrice: 9000,
      total: 9000,
      product: { name: 'Stéthoscope Pro', description: 'Professionnel' },
    },
  ],
  address: null,
  billingAddress: null,
};

const mockInvoice = {
  id: 'inv-1',
  invoiceNumber: 'FA-2025-00001',
  orderId: 'order-1',
  userId: 'user-1',
  guestEmail: null,
  amount: 10800,
  status: 'PAID',
  issuedAt: new Date('2025-01-01'),
  canceledAt: null,
  createdAt: new Date('2025-01-01'),
  creditNote: null,
  order: mockOrder,
};

describe('FacturesService', () => {
  let service: FacturesService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacturesService,
        {
          provide: PrismaService,
          useValue: {
            invoice: {
              findUnique: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
              create: jest.fn().mockResolvedValue(mockInvoice),
              update: jest.fn().mockResolvedValue(mockInvoice),
              count: jest.fn().mockResolvedValue(0),
              aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 }, _count: { id: 0 } }),
            },
            creditNote: {
              count: jest.fn().mockResolvedValue(0),
              create: jest.fn().mockResolvedValue({}),
              findMany: jest.fn().mockResolvedValue([]),
              findUnique: jest.fn().mockResolvedValue(null),
            },
            order: {
              findUnique: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<FacturesService>(FacturesService);
    prisma = module.get(PrismaService);
  });

  describe('createForOrder', () => {
    it('should skip creation if invoice already exists', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(mockInvoice);
      await service.createForOrder('order-1');
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if order does not exist', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.createForOrder('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should create an invoice with an auto-generated number', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);

      await service.createForOrder('order-1');

      expect(prisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'order-1',
            amount: mockOrder.total,
            status: 'PAID',
          }),
        }),
      );
    });

    it('should generate sequential invoice numbers', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(42);

      await service.createForOrder('order-1');

      const createCall = (prisma.invoice.create as jest.Mock).mock.calls[0][0];
      const year = new Date().getFullYear();
      expect(createCall.data.invoiceNumber).toBe(`FA-${year}-00043`);
    });
  });

  describe('findOne', () => {
    it('should return an invoice by id', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(mockInvoice);
      const result = await service.findOne('inv-1');
      expect(result).toEqual(mockInvoice);
    });

    it('should throw NotFoundException if invoice not found', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelInvoice', () => {
    it('should throw BadRequestException if invoice is already canceled', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue({ ...mockInvoice, status: 'CANCELED' });
      await expect(service.cancelInvoice('inv-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if credit note already exists', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        creditNote: { id: 'cn-1', creditNoteNumber: 'AV-2025-00001' },
      });
      await expect(service.cancelInvoice('inv-1')).rejects.toThrow(BadRequestException);
    });

    it('should cancel invoice and create credit note', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(mockInvoice);
      (prisma.creditNote.count as jest.Mock).mockResolvedValue(0);
      (prisma.$transaction as jest.Mock).mockResolvedValue([
        { ...mockInvoice, status: 'CANCELED' },
        { id: 'cn-1', creditNoteNumber: 'AV-2025-00001' },
      ]);

      const result = await service.cancelInvoice('inv-1', 'Test annulation');
      expect(result).toMatchObject({
        invoice: expect.objectContaining({ status: 'CANCELED' }),
        creditNote: expect.objectContaining({ id: 'cn-1' }),
      });
    });
  });

  describe('generateInvoicePdf', () => {
    it('should return a non-empty Buffer', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(mockInvoice);
      const pdf = await service.generateInvoicePdf('inv-1');
      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.length).toBeGreaterThan(0);
    });

    it('should throw NotFoundException if invoice not found', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.generateInvoicePdf('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
