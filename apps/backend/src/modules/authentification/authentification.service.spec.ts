import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthentificationService } from './authentification.service';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: '',
  role: 'USER',
  emailVerified: true,
  isActive: true,
  twoFactorEnabled: false,
  twoFactorSecret: null,
  resetToken: null,
  resetTokenExp: null,
  emailVerificationToken: null,
  emailVerificationExp: null,
  pendingEmail: null,
  pendingEmailToken: null,
  pendingEmailExp: null,
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthentificationService', () => {
  let service: AuthentificationService;
  let usersService: jest.Mocked<UtilisateursService>;
  let jwtService: jest.Mocked<JwtService>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthentificationService,
        {
          provide: UtilisateursService,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            set2FASecret: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendVerificationEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
            sendEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AuthentificationService>(AuthentificationService);
    usersService = module.get(UtilisateursService);
    jwtService = module.get(JwtService);
    emailService = module.get(EmailService);
  });

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);

      await expect(
        service.register({ name: 'Test', email: 'test@example.com', password: 'Password1!' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user if email is new', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser as any);

      const result = await service.register({
        name: 'Test',
        email: 'new@example.com',
        password: 'Password1!',
      });

      expect(usersService.create).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException for invalid email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const hash = await bcrypt.hash('correct', 10);
      usersService.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: hash } as any);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return token for valid credentials', async () => {
      const hash = await bcrypt.hash('Password1!', 10);
      usersService.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: hash } as any);

      const result = await service.login({ email: 'test@example.com', password: 'Password1!' });

      expect(result).toHaveProperty('access_token');
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should require 2FA when twoFactorEnabled is true', async () => {
      const hash = await bcrypt.hash('Password1!', 10);
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: hash,
        twoFactorEnabled: true,
      } as any);

      const result = await service.login({ email: 'test@example.com', password: 'Password1!' });

      expect(result).toHaveProperty('requires2FA', true);
    });
  });
});
