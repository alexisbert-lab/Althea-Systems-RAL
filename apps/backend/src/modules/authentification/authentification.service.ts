import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthentificationService {
  constructor(
    private readonly usersService: UtilisateursService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: { name: string; email: string; password: string }) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Un compte avec cet email existe déjà.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Generate email verification token (valid 24h)
    const emailVerificationToken = randomBytes(32).toString('hex');
    const emailVerificationExp = new Date(Date.now() + 24 * 3600000);

    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      emailVerificationToken,
      emailVerificationExp,
    });

    // Send verification email (non-blocking)
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${emailVerificationToken}`;
    this.emailService
      .sendEmail(
        dto.email,
        'Confirmez votre inscription — Althea System',
        `<h1>Bienvenue ${dto.name} !</h1>
         <p>Votre compte a été créé avec succès sur Althea System.</p>
         <p>Veuillez confirmer votre adresse email en cliquant sur le lien ci-dessous :</p>
         <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#00a8b5;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">Confirmer mon email</a>
         <p>Ce lien expire dans 24 heures.</p>
         <p>Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.</p>`,
      )
      .catch(() => {}); // Don't fail registration if email fails

    return { message: 'Compte créé avec succès. Vérifiez votre email pour confirmer votre inscription.', userId: user.id };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Lien de vérification invalide ou expiré.');
    }

    await this.usersService.verifyEmail(user.id);

    // Auto-login after verification
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

    return {
      message: 'Email vérifié avec succès.',
      access_token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'Si un compte existe avec cet email, un nouveau lien a été envoyé.' };
    }
    if (user.emailVerified) {
      return { message: 'Cet email est déjà vérifié.' };
    }

    const token = randomBytes(32).toString('hex');
    const exp = new Date(Date.now() + 24 * 3600000);
    await this.usersService.setVerificationToken(user.id, token, exp);

    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}`;
    this.emailService
      .sendEmail(
        email,
        'Confirmez votre inscription — Althea System',
        `<h1>Confirmation de votre email</h1>
         <p>Cliquez sur le lien ci-dessous pour confirmer votre adresse email :</p>
         <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#00a8b5;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">Confirmer mon email</a>
         <p>Ce lien expire dans 24 heures.</p>`,
      )
      .catch(() => {});

    return { message: 'Si un compte existe avec cet email, un nouveau lien a été envoyé.' };
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Identifiants incorrects.');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new ForbiddenException('Votre compte a été désactivé. Contactez le support.');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Identifiants incorrects.');
    }

    // If 2FA is enabled, don't issue full token yet — require 2FA code
    if (user.twoFactorEnabled) {
      const tempPayload = { sub: user.id, purpose: '2fa' };
      const temp_token = this.jwtService.sign(tempPayload, { expiresIn: '5m' });
      return {
        requires2FA: true,
        temp_token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal whether email exists
      return { message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' };
    }

    const token = randomBytes(32).toString('hex');
    const exp = new Date(Date.now() + 3600000); // 1 hour
    await this.usersService.setResetToken(email, token, exp);

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;
    await this.emailService
      .sendEmail(
        email,
        'Réinitialisation de mot de passe - Althea System',
        `<h1>Réinitialisation de mot de passe</h1>
         <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
         <a href="${resetUrl}">Réinitialiser mon mot de passe</a>
         <p>Ce lien expire dans 1 heure.</p>`,
      )
      .catch(() => {});

    return { message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(token);
    if (!user) {
      throw new BadRequestException('Lien de réinitialisation invalide ou expiré.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePassword(user.id, passwordHash);
    await this.usersService.clearResetToken(user.id);

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findByEmail(
      (await this.usersService.findByIdInternal(userId)).email,
    );
    if (!user) throw new NotFoundException('Utilisateur non trouvé.');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Mot de passe actuel incorrect.');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePassword(userId, passwordHash);

    return { message: 'Mot de passe modifié avec succès.' };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }

  /* ─── 2FA TOTP ─── */

  async setup2FA(userId: string) {
    const user = await this.usersService.findByIdInternal(userId);
    if (user.twoFactorEnabled) {
      throw new BadRequestException('Le 2FA est déjà activé.');
    }

    const secret = authenticator.generateSecret();
    await this.usersService.set2FASecret(userId, secret);

    const otpauthUrl = authenticator.keyuri(user.email, 'Althea System', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return { secret, qrCode: qrCodeDataUrl };
  }

  async verify2FA(userId: string, code: string) {
    const user = await this.usersService.findByIdInternal(userId);
    if (!user.twoFactorSecret) {
      throw new BadRequestException('Configurez d\'abord le 2FA.');
    }

    const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!isValid) {
      throw new UnauthorizedException('Code 2FA invalide.');
    }

    await this.usersService.enable2FA(userId);
    return { message: '2FA activé avec succès.' };
  }

  async validate2FALogin(userId: string, code: string) {
    const user = await this.usersService.findByIdInternal(userId);
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('Le 2FA n\'est pas activé pour cet utilisateur.');
    }

    const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!isValid) {
      throw new UnauthorizedException('Code 2FA invalide.');
    }

    // Return full token (2FA validated)
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  async disable2FA(userId: string, code: string) {
    const user = await this.usersService.findByIdInternal(userId);
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('Le 2FA n\'est pas activé.');
    }

    const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!isValid) {
      throw new UnauthorizedException('Code 2FA invalide.');
    }

    await this.usersService.disable2FA(userId);
    return { message: '2FA désactivé avec succès.' };
  }
}
