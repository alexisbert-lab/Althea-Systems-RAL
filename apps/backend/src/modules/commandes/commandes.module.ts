import { Module, forwardRef } from '@nestjs/common';
import { CommandesService } from './commandes.service';
import { CommandesController } from './commandes.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { FacturesModule } from '../factures/factures.module';
import { FraisPortModule } from '../frais-port/frais-port.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, forwardRef(() => FacturesModule), FraisPortModule, EmailModule],
  controllers: [CommandesController],
  providers: [CommandesService],
  exports: [CommandesService],
})
export class CommandesModule {}
