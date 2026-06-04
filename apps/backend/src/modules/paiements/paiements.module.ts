import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaiementsService } from './paiements.service';
import { PaiementsController } from './paiements.controller';
import { CommandesModule } from '../commandes/commandes.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [ConfigModule, forwardRef(() => CommandesModule), EmailModule],
  controllers: [PaiementsController],
  providers: [PaiementsService],
  exports: [PaiementsService],
})
export class PaiementsModule {}
