import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Fields to exclude from API responses
const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatar: true,
  emailVerified: true,
  isActive: true,
  twoFactorEnabled: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UtilisateursService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    emailVerificationToken?: string;
    emailVerificationExp?: Date;
  }) {
    return this.prisma.user.create({ data });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé.');
    return user;
  }

  /** Internal use only — includes passwordHash for auth checks */
  async findByIdInternal(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé.');
    return user;
  }

  async findAll(page = 1, limit = 20, search?: string, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (status === 'unverified') where.emailVerified = false;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: safeUserSelect,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(id: string, data: { name?: string; email?: string; avatar?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: safeUserSelect,
    });
  }

  async updatePassword(id: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: safeUserSelect,
    });
  }

  /* ─── Email verification ─── */

  async findByVerificationToken(token: string) {
    return this.prisma.user.findFirst({
      where: { emailVerificationToken: token, emailVerificationExp: { gte: new Date() } },
    });
  }

  async setVerificationToken(id: string, token: string, exp: Date) {
    return this.prisma.user.update({
      where: { id },
      data: { emailVerificationToken: token, emailVerificationExp: exp },
    });
  }

  async verifyEmail(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { emailVerified: true, emailVerificationToken: null, emailVerificationExp: null },
    });
  }

  /* ─── Pending email change ─── */

  async setPendingEmail(id: string, newEmail: string, token: string, exp: Date) {
    return this.prisma.user.update({
      where: { id },
      data: { pendingEmail: newEmail, pendingEmailToken: token, pendingEmailExp: exp },
    });
  }

  async findByPendingEmailToken(token: string) {
    return this.prisma.user.findFirst({
      where: { pendingEmailToken: token, pendingEmailExp: { gte: new Date() } },
    });
  }

  async confirmEmailChange(id: string) {
    const user = await this.findByIdInternal(id);
    if (!user.pendingEmail) return user;
    return this.prisma.user.update({
      where: { id },
      data: {
        email: user.pendingEmail,
        pendingEmail: null,
        pendingEmailToken: null,
        pendingEmailExp: null,
      },
      select: safeUserSelect,
    });
  }

  /* ─── Password reset ─── */

  async setResetToken(email: string, token: string, exp: Date) {
    return this.prisma.user.update({
      where: { email },
      data: { resetToken: token, resetTokenExp: exp },
    });
  }

  async findByResetToken(token: string) {
    return this.prisma.user.findFirst({
      where: { resetToken: token, resetTokenExp: { gte: new Date() } },
    });
  }

  async clearResetToken(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { resetToken: null, resetTokenExp: null },
    });
  }

  /* ─── Account deactivation ─── */

  async deactivate(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: safeUserSelect,
    });
  }

  async reactivate(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: safeUserSelect,
    });
  }

  async delete(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  async updateRole(id: string, role: string) {
    return this.prisma.user.update({
      where: { id },
      data: { role: role as any },
      select: safeUserSelect,
    });
  }

  /* ─── 2FA ─── */

  async set2FASecret(id: string, secret: string) {
    return this.prisma.user.update({
      where: { id },
      data: { twoFactorSecret: secret },
    });
  }

  async enable2FA(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { twoFactorEnabled: true },
      select: safeUserSelect,
    });
  }

  async disable2FA(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
      select: safeUserSelect,
    });
  }

  async getStats() {
    const [total, admins, recent] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ]);
    return { total, admins, recentMonth: recent };
  }
}
