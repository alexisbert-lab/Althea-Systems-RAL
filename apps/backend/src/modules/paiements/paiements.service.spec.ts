import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaiementsService } from './paiements.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CommandesService } from '../commandes/commandes.service';
import { EmailService } from '../email/email.service';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'secret_test' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'secret_test', status: 'succeeded' }),
    },
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test' }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'cus_test',
        invoice_settings: { default_payment_method: null },
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    paymentMethods: {
      list: jest.fn().mockResolvedValue({ data: [] }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'pm_test',
        customer: 'cus_test',
        card: { last4: '4242', brand: 'visa', exp_month: 12, exp_year: 2026 },
      }),
      detach: jest.fn().mockResolvedValue({}),
    },
    setupIntents: {
      create: jest.fn().mockResolvedValue({ client_secret: 'setup_secret' }),
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ url: 'https://stripe.com/pay/test' }),
      },
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
    refunds: {
      create: jest.fn().mockResolvedValue({ id: 'ref_test', amount: 10800, status: 'succeeded' }),
    },
  }));
});

const mockOrder = {
  id: 'order-1',
  userId: 'user-1',
  guestEmail: null,
  status: 'PENDING',
  total: 10800,
  currency: 'eur',
  stripePaymentId: null,
};

describe('PaiementsService', () => {
  let service: PaiementsService;
  let prisma: jest.Mocked<PrismaService>;
  let commandesService: jest.Mocked<CommandesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaiementsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, fallback?: string) => fallback ?? ''),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            order: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn().mockResolvedValue(mockOrder),
            },
            payment: {
              create: jest.fn().mockResolvedValue({}),
              findMany: jest.fn().mockResolvedValue([]),
              updateMany: jest.fn().mockResolvedValue({}),
            },
            subscription: {
              findUnique: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue({ stripeCustomerId: 'cus_test' }),
              update: jest.fn().mockResolvedValue({}),
            },
            user: {
              findUnique: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com', name: 'Test' }),
            },
          },
        },
        {
          provide: CommandesService,
          useValue: {
            updateStatus: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendOrderConfirmationEmail: jest.fn().mockResolvedValue(undefined),
            sendEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<PaiementsService>(PaiementsService);
    prisma = module.get(PrismaService);
    commandesService = module.get(CommandesService);
  });

  describe('createPaymentIntent', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.createPaymentIntent('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own the order', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ ...mockOrder, userId: 'other-user' });
      await expect(service.createPaymentIntent('order-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if order is not PENDING', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' });
      await expect(service.createPaymentIntent('order-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should reuse existing PaymentIntent if already linked', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ ...mockOrder, stripePaymentId: 'pi_existing' });
      const result = await service.createPaymentIntent('order-1', 'user-1');
      expect(result).toHaveProperty('clientSecret');
    });

    it('should create a new PaymentIntent and save it on the order', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      const result = await service.createPaymentIntent('order-1', 'user-1');
      expect(result).toHaveProperty('clientSecret');
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'order-1' } }),
      );
    });
  });

  describe('confirmOrderAfterPayment', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.confirmOrderAfterPayment('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own the order', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ ...mockOrder, userId: 'other-user' });
      await expect(service.confirmOrderAfterPayment('order-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should return confirmed:true if order is already past PENDING', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' });
      const result = await service.confirmOrderAfterPayment('order-1', 'user-1');
      expect(result).toEqual({ confirmed: true });
    });

    it('should confirm order if Stripe payment succeeded', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ ...mockOrder, stripePaymentId: 'pi_test' });
      const result = await service.confirmOrderAfterPayment('order-1', 'user-1');
      expect(commandesService.updateStatus).toHaveBeenCalledWith('order-1', { status: 'CONFIRMED' });
      expect(result).toEqual({ confirmed: true });
    });

    it('should throw BadRequestException if Stripe payment not succeeded', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ ...mockOrder, stripePaymentId: 'pi_test' });
      const stripeInstance = (service as any).stripe;
      stripeInstance.paymentIntents.retrieve.mockResolvedValueOnce({ status: 'requires_payment_method' });
      await expect(service.confirmOrderAfterPayment('order-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPaymentHistory', () => {
    it('should return payment list for user', async () => {
      const payments = [{ id: 'pay-1', userId: 'user-1', amount: 10800 }];
      (prisma.payment.findMany as jest.Mock).mockResolvedValue(payments);
      const result = await service.getPaymentHistory('user-1');
      expect(result).toEqual(payments);
      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });

  describe('refundOrder', () => {
    it('should throw NotFoundException if order not found', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.refundOrder('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if no Stripe payment linked', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        ...mockOrder,
        status: 'CONFIRMED',
        stripePaymentId: null,
        invoice: null,
      });
      await expect(service.refundOrder('order-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if order status is not refundable', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        ...mockOrder,
        status: 'PENDING',
        stripePaymentId: 'pi_test',
        invoice: null,
      });
      await expect(service.refundOrder('order-1')).rejects.toThrow(BadRequestException);
    });

    it('should refund order and return refund details', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        ...mockOrder,
        status: 'CONFIRMED',
        stripePaymentId: 'pi_test',
        invoice: null,
      });
      const result = await service.refundOrder('order-1');
      expect(result).toMatchObject({ refundId: 'ref_test', status: 'succeeded' });
      expect(commandesService.updateStatus).toHaveBeenCalledWith('order-1', { status: 'REFUNDED' });
    });
  });
});
