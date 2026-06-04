import { Global, Module } from '@nestjs/common';
import { TraductionService } from './traduction.service';

/**
 * Module global — TraductionService injectable partout sans import explicite.
 */
@Global()
@Module({
  providers: [TraductionService],
  exports: [TraductionService],
})
export class TraductionModule {}
