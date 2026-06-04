import { Module } from '@nestjs/common';
import { FraisPortController } from './frais-port.controller';
import { FraisPortService } from './frais-port.service';

@Module({
  controllers: [FraisPortController],
  providers: [FraisPortService],
  exports: [FraisPortService],
})
export class FraisPortModule {}
