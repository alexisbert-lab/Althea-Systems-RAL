import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RechercheService } from './recherche.service';
import { RechercheController } from './recherche.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [RechercheController],
  providers: [RechercheService],
  exports: [RechercheService],
})
export class RechercheModule {}
