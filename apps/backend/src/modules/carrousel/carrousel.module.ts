import { Module } from '@nestjs/common';
import { CarrouselController } from './carrousel.controller';
import { CarrouselService } from './carrousel.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CarrouselController],
  providers: [CarrouselService],
})
export class CarrouselModule {}
