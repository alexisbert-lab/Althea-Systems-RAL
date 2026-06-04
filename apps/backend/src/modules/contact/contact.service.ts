import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EnvoyerContactDto, ModifierContactDto } from './dto/contact.dto';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: EnvoyerContactDto, userId?: string) {
    return this.prisma.contact.create({
      data: { ...dto, userId: userId || null },
    });
  }

  async findAll(page = 1, limit = 20, unreadOnly = false) {
    const skip = (page - 1) * limit;
    const where = unreadOnly ? { read: false } : {};
    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data: contacts,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!contact) throw new NotFoundException('Message non trouvé.');
    return contact;
  }

  async update(id: string, dto: ModifierContactDto) {
    return this.prisma.contact.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.contact.delete({ where: { id } });
  }

  async getUnreadCount() {
    return this.prisma.contact.count({ where: { read: false } });
  }
}
