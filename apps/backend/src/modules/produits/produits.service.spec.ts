import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProduitsService } from './produits.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TraductionService } from '../traduction/traduction.service';
import { RechercheService } from '../recherche/recherche.service';

const mockProduct = {
  id: 'prod-1',
  name: 'Stéthoscope Pro',
  slug: 'stethoscope-pro',
  description: 'Un stéthoscope professionnel',
  price: 8900,
  comparePrice: null,
  currency: 'eur',
  stock: 50,
  lowStockThreshold: 5,
  active: true,
  featured: false,
  images: [],
  documents: [],
  specs: null,
  categoryId: null,
  position: 0,
  metadata: null,
  stripePriceId: null,
  sku: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ProduitsService', () => {
  let service: ProduitsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProduitsService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: TraductionService,
          useValue: { translate: jest.fn() },
        },
        {
          provide: RechercheService,
          useValue: {
            indexProduct: jest.fn(),
            deleteProduct: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProduitsService>(ProduitsService);
    prisma = module.get(PrismaService);
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);

      const result = await service.findOne('prod-1');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if product not found', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkAvailability', () => {
    it('should report available for in-stock products', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'prod-1', name: 'Stéthoscope', stock: 50, active: true, price: 8900 },
      ]);

      const result = await service.checkAvailability([{ productId: 'prod-1', quantity: 5 }]);

      expect(result[0]).toMatchObject({ productId: 'prod-1', available: true });
    });

    it('should report unavailable when quantity exceeds stock', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'prod-1', name: 'Stéthoscope', stock: 2, active: true, price: 8900 },
      ]);

      const result = await service.checkAvailability([{ productId: 'prod-1', quantity: 10 }]);

      expect(result[0]).toMatchObject({ productId: 'prod-1', available: false });
    });

    it('should report unavailable for inactive products', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'prod-1', name: 'Stéthoscope', stock: 50, active: false, price: 8900 },
      ]);

      const result = await service.checkAvailability([{ productId: 'prod-1', quantity: 1 }]);

      expect(result[0]).toMatchObject({ productId: 'prod-1', available: false });
    });
  });
});
