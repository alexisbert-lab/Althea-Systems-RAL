import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest') as typeof import('supertest');

import { AuthentificationController } from '../src/modules/authentification/authentification.controller';
import { AuthentificationService } from '../src/modules/authentification/authentification.service';
import { JwtStrategie } from '../src/modules/authentification/strategies/jwt.strategie';
import { CommandesController } from '../src/modules/commandes/commandes.controller';
import { CommandesService } from '../src/modules/commandes/commandes.service';
import { PaiementsController } from '../src/modules/paiements/paiements.controller';
import { PaiementsService } from '../src/modules/paiements/paiements.service';
import { FacturesController } from '../src/modules/factures/factures.controller';
import { FacturesService } from '../src/modules/factures/factures.service';
import { RolesGarde } from '../src/gardes/roles.garde';

jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

const E2E_JWT_SECRET = 'althea-e2e-test-secret';

const mockOrder = {
  id: 'order-1',
  userId: 'user-1',
  status: 'PENDING',
  total: 10800,
  items: [],
};

const mockInvoice = {
  id: 'inv-1',
  invoiceNumber: 'FA-2025-00001',
  orderId: 'order-1',
  amount: 10800,
  status: 'PAID',
};

describe('E2E — API Routes', () => {
  let app: INestApplication;
  let userToken: string;
  let adminToken: string;

  const mockAuthService = {
    register: jest.fn().mockResolvedValue({ message: 'Compte créé.', userId: 'user-1' }),
    login: jest.fn().mockResolvedValue({ access_token: 'mock-token' }),
    validateUser: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com', role: 'USER' }),
    verifyEmail: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    resendVerificationEmail: jest.fn(),
    changePassword: jest.fn(),
    setup2FA: jest.fn(),
    verify2FA: jest.fn(),
    validate2FA: jest.fn(),
    disable2FA: jest.fn(),
  };

  const mockCommandesService = {
    create: jest.fn().mockResolvedValue(mockOrder),
    findAll: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
    findOne: jest.fn().mockResolvedValue(mockOrder),
    findByUser: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
    updateStatus: jest.fn().mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' }),
    getStats: jest.fn().mockResolvedValue({ total: 0, revenue: 0 }),
  };

  const mockPaiementsService = {
    createPaymentIntent: jest.fn().mockResolvedValue({ clientSecret: 'pi_secret' }),
    confirmOrderAfterPayment: jest.fn().mockResolvedValue({ confirmed: true }),
    createCheckoutSession: jest.fn().mockResolvedValue({ url: 'https://stripe.com/pay' }),
    handleWebhook: jest.fn().mockResolvedValue({ received: true }),
    refundOrder: jest.fn().mockResolvedValue({ refundId: 'ref_1', amount: 10800, status: 'succeeded' }),
    createSetupIntent: jest.fn().mockResolvedValue({ clientSecret: 'seti_secret' }),
    listPaymentMethods: jest.fn().mockResolvedValue([]),
    deletePaymentMethod: jest.fn().mockResolvedValue({ deleted: true }),
    setDefaultPaymentMethod: jest.fn().mockResolvedValue({ defaultPaymentMethodId: 'pm_1' }),
    getPaymentHistory: jest.fn().mockResolvedValue([]),
  };

  const mockFacturesService = {
    findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    findOne: jest.fn().mockResolvedValue(mockInvoice),
    cancelInvoice: jest.fn(),
    sendByEmail: jest.fn(),
    findAllCreditNotes: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    findOneCreditNote: jest.fn(),
    sendCreditNoteByEmail: jest.fn(),
    generateInvoicePdf: jest.fn().mockResolvedValue(Buffer.from('PDF')),
    generateCreditNotePdf: jest.fn().mockResolvedValue(Buffer.from('PDF')),
    createForOrder: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: E2E_JWT_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [
        AuthentificationController,
        CommandesController,
        PaiementsController,
        FacturesController,
      ],
      providers: [
        Reflector,
        RolesGarde,
        JwtStrategie,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: string) =>
              key === 'JWT_SECRET' ? E2E_JWT_SECRET : (defaultValue ?? ''),
          },
        },
        { provide: AuthentificationService, useValue: mockAuthService },
        { provide: CommandesService, useValue: mockCommandesService },
        { provide: PaiementsService, useValue: mockPaiementsService },
        { provide: FacturesService, useValue: mockFacturesService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const jwtService = new JwtService({ secret: E2E_JWT_SECRET });
    userToken = jwtService.sign({ sub: 'user-1', email: 'test@example.com', role: 'USER' });
    adminToken = jwtService.sign({ sub: 'admin-1', email: 'admin@example.com', role: 'ADMIN' });
  });

  afterAll(async () => {
    await app.close();
  });

  /* ─── Auth: Registration ─── */

  describe('POST /auth/register', () => {
    it('should return 201 on successful registration', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Test', email: 'new@example.com', password: 'Password1!' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('userId');
        });
    });

    it('should return 409 on duplicate email', async () => {
      mockAuthService.register.mockRejectedValueOnce(new ConflictException('Email déjà utilisé.'));
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Test', email: 'existing@example.com', password: 'Password1!' })
        .expect(409);
    });

    it('should return 400 on missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'no-password@example.com' })
        .expect(400);
    });
  });

  /* ─── Auth: Login ─── */

  describe('POST /auth/login', () => {
    it('should return 200 with token on valid credentials', async () => {
      mockAuthService.login.mockResolvedValueOnce({ access_token: 'real-jwt-token' });
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'Password1!' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
        });
    });

    it('should return 401 on invalid credentials', async () => {
      mockAuthService.login.mockRejectedValueOnce(new UnauthorizedException('Identifiants invalides.'));
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpass' })
        .expect(401);
    });
  });

  /* ─── Orders: Guard protection ─── */

  describe('POST /orders', () => {
    it('should return 401 without JWT token', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({ items: [{ productId: 'prod-1', quantity: 1 }] })
        .expect(401);
    });

    it('should return 201 with valid JWT token', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ items: [{ productId: 'prod-1', quantity: 1 }] })
        .expect(201);
    });
  });

  describe('GET /orders (admin only)', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/orders').expect(401);
    });

    it('should return 403 for non-admin user', async () => {
      await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 200 for admin user', async () => {
      mockAuthService.validateUser.mockResolvedValueOnce({ id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' });
      await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('GET /orders/my', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/orders/my').expect(401);
    });

    it('should return 200 with valid token', async () => {
      await request(app.getHttpServer())
        .get('/orders/my')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });

  /* ─── Payments: Guard protection ─── */

  describe('POST /payments/create-intent', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/payments/create-intent')
        .send({ orderId: 'order-1' })
        .expect(401);
    });

    it('should return 201 with valid token', async () => {
      await request(app.getHttpServer())
        .post('/payments/create-intent')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ orderId: 'order-1' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('clientSecret');
        });
    });
  });

  describe('POST /payments/confirm-order', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/payments/confirm-order')
        .send({ orderId: 'order-1' })
        .expect(401);
    });

    it('should return 201 with valid token', async () => {
      await request(app.getHttpServer())
        .post('/payments/confirm-order')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ orderId: 'order-1' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('confirmed', true);
        });
    });
  });

  /* ─── Invoices: Admin-only routes ─── */

  describe('GET /invoices (admin only)', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/invoices').expect(401);
    });

    it('should return 403 for regular user', async () => {
      await request(app.getHttpServer())
        .get('/invoices')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 200 for admin', async () => {
      mockAuthService.validateUser.mockResolvedValueOnce({ id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' });
      await request(app.getHttpServer())
        .get('/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('GET /invoices/:id/pdf', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/invoices/inv-1/pdf').expect(401);
    });
  });
});
