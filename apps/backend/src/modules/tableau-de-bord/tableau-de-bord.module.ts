import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TableauDeBordController } from './tableau-de-bord.controller';
import { TableauDeBordService } from './tableau-de-bord.service';

@Module({
  imports: [PrismaModule],
  controllers: [TableauDeBordController],
  providers: [TableauDeBordService],
})
export class TableauDeBordModule {}
