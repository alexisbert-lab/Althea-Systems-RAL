import { Module } from '@nestjs/common';
import { ParametresSiteService } from './parametres-site.service';
import { ParametresSiteController } from './parametres-site.controller';

@Module({
  controllers: [ParametresSiteController],
  providers: [ParametresSiteService],
  exports: [ParametresSiteService],
})
export class ParametresSiteModule {}
