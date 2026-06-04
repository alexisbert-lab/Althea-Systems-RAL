import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ParametresSiteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all settings as a flat key→value object
   */
  async getAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.siteSetting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  /**
   * Returns full setting rows (with metadata) for the admin UI
   */
  async getAllDetailed() {
    return this.prisma.siteSetting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });
  }

  /**
   * Upsert multiple settings at once
   */
  async updateMany(settings: { key: string; value: string }[]) {
    await Promise.all(
      settings.map((s) =>
        this.prisma.siteSetting.upsert({
          where: { key: s.key },
          update: { value: s.value },
          create: { key: s.key, value: s.value, label: s.key, group: 'general' },
        }),
      ),
    );
    return this.getAllDetailed();
  }
}
